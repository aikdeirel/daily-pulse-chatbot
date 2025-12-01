import { smoothStream, streamText } from "ai";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
	kind: "code",
	onCreateDocument: async ({ title, dataStream }) => {
		let draftContent = "";

		const { fullStream } = streamText({
			model: myProvider.languageModel("artifact-model"),
			system: codePrompt,
			experimental_transform: smoothStream({ chunking: "line" }),
			prompt: title,
		});

		for await (const delta of fullStream) {
			const { type } = delta;

			if (type === "text-delta") {
				const { text } = delta;

				draftContent += text;

				dataStream.write({
					type: "data-codeDelta",
					data: draftContent,
					transient: true,
				});
			}
		}

		return draftContent;
	},
	onUpdateDocument: async ({ document, description, dataStream }) => {
		let draftContent = "";

		const { fullStream } = streamText({
			model: myProvider.languageModel("artifact-model"),
			system: updateDocumentPrompt(document.content, "code"),
			experimental_transform: smoothStream({ chunking: "line" }),
			prompt: description,
		});

		for await (const delta of fullStream) {
			const { type } = delta;

			if (type === "text-delta") {
				const { text } = delta;

				draftContent += text;

				dataStream.write({
					type: "data-codeDelta",
					data: draftContent,
					transient: true,
				});
			}
		}

		return draftContent;
	},
});
