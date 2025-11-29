// GUEST AUTHENTICATION DISABLED - Code preserved below for future reference
// To re-enable: uncomment the code below and comment out the 404 response

import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("Not Found", { status: 404 });
}

/*
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
*/
