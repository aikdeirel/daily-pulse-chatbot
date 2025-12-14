import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

test.describe("Chat activity", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("Send a user message and receive response", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toContain("It's just green duh!");
  });

  test("Redirect to /chat/:id after submitting message", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toContain("It's just green duh!");
    await chatPage.hasChatIdInUrl();
  });

  test("Send a user message from suggestion", async () => {
    await chatPage.sendUserMessageFromSuggestion();
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toContain(
      "Today's weather is sunny with a high of 22°C.",
    );
  });

  test("Toggle between send/stop button based on activity", async () => {
    await expect(chatPage.sendButton).toBeVisible();
    await expect(chatPage.sendButton).toBeDisabled();

    await chatPage.sendUserMessage("Why is grass green?");

    await expect(chatPage.sendButton).not.toBeVisible();
    await expect(chatPage.stopButton).toBeVisible();

    await chatPage.isGenerationComplete();

    await expect(chatPage.stopButton).not.toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test("Stop generation during submission", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await expect(chatPage.stopButton).toBeVisible();
    await chatPage.stopButton.click();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test("Edit user message and resubmit", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toContain("It's just green duh!");

    const userMessage = await chatPage.getRecentUserMessage();
    await userMessage.edit("Why is the sky blue?");

    await chatPage.isGenerationComplete();

    const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();
    if (!updatedAssistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(updatedAssistantMessage.content).toContain("It's just blue duh!");
  });

  test("Hide suggested actions after sending message", async () => {
    await chatPage.isElementVisible("suggested-actions");
    await chatPage.sendUserMessageFromSuggestion();
    await chatPage.isElementNotVisible("suggested-actions");
  });

  test("Upload file and send image attachment with message", async () => {
    await chatPage.addImageAttachment();

    await chatPage.isElementVisible("attachments-preview");
    await chatPage.isElementVisible("input-attachment-loader");
    await chatPage.isElementNotVisible("input-attachment-loader");

    await chatPage.sendUserMessage("Who painted this?");

    const userMessage = await chatPage.getRecentUserMessage();
    expect(userMessage.attachments).toHaveLength(1);

    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toBe("This painting is by Monet!");
  });

  test("Call weather tool", async () => {
    await chatPage.sendUserMessage("What's the weather in sf?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }

    expect(assistantMessage.content).toBe(
      "The current temperature in San Francisco is 17°C.",
    );
  });

  test("Upvote message", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();
  });

  test("Downvote message", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test("Update vote", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();

    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test("Create message from url query", async ({ page }) => {
    await page.goto("/?query=Why is the sky blue?");

    await chatPage.isGenerationComplete();

    const userMessage = await chatPage.getRecentUserMessage();
    expect(userMessage.content).toBe("Why is the sky blue?");

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    if (!assistantMessage) {
      throw new Error("Assistant message not found");
    }
    expect(assistantMessage.content).toContain("It's just blue duh!");
  });

  test("auto-scrolls to bottom after submitting new messages", async () => {
    test.fixme();
    await chatPage.sendMultipleMessages(5, (i) => `filling message #${i}`);
    await chatPage.waitForScrollToBottom();
  });

  test("scroll button appears when user scrolls up, hides on click", async () => {
    test.fixme();
    await chatPage.sendMultipleMessages(5, (i) => `filling message #${i}`);
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();

    await chatPage.scrollToTop();
    await expect(chatPage.scrollToBottomButton).toBeVisible();

    await chatPage.scrollToBottomButton.click();
    await chatPage.waitForScrollToBottom();
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();
  });

  test("shows title generation loading state when sending first message", async () => {
    // Send the first message to create the chat and trigger title generation
    await chatPage.sendUserMessage("Why is grass green?");

    // Check that title is generating in the message header
    expect(await chatPage.isTitleGeneratingInMessage()).toBe(true);

    // Open sidebar and check title is generating there
    await chatPage.openSideBar();
    expect(await chatPage.isTitleGeneratingInSidebar()).toBe(true);

    // Wait for generation to complete
    await chatPage.isGenerationComplete();

    // After generation, title should no longer be generating
    expect(await chatPage.isTitleGeneratingInMessage()).toBe(false);

    // Sidebar should also show the generated title
    expect(await chatPage.isTitleGeneratingInSidebar()).toBe(false);
    const sidebarTitle = await chatPage.getSidebarChatTitle();
    expect(sidebarTitle).not.toBeNull();
    expect(sidebarTitle?.length).toBeGreaterThan(0);
  });
});
