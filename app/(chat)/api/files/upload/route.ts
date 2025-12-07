import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import {
  getFileTypeErrorMessage,
  isAllowedFileType,
  MAX_FILE_SIZE,
} from "@/lib/file-types";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size should be less than 5MB",
    })
    .refine((file) => isAllowedFileType(file.type), {
      message: getFileTypeErrorMessage(),
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((error) => error.message)
        .join(", ");

      console.error("File validation failed:", {
        fileName: (formData.get("file") as File)?.name,
        fileType: file.type,
        fileSize: file.size,
        errors: validatedFile.error.issues,
      });

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Check if Vercel Blob token is configured
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error(
          "Vercel Blob token not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.",
        );
        return NextResponse.json(
          {
            error:
              "Vercel Blob storage not configured. Please set up BLOB_READ_WRITE_TOKEN environment variable. See https://vercel.com/docs/vercel-blob for setup instructions.",
          },
          { status: 500 },
        );
      }

      const data = await put(`${filename}`, fileBuffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json(data);
    } catch (error) {
      console.error("Blob storage upload failed:", {
        fileName: filename,
        fileType: file.type,
        fileSize: file.size,
        error: error instanceof Error ? error.message : String(error),
      });

      // Provide more specific error message for token issues
      if (error instanceof Error && error.message.includes("No token found")) {
        return NextResponse.json(
          {
            error:
              "Vercel Blob token not found. Please configure BLOB_READ_WRITE_TOKEN environment variable.",
            setupInstructions:
              "Visit https://vercel.com/docs/vercel-blob to create a Blob token",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("File upload request processing failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
