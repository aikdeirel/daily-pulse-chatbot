/**
 * Spotify Tool Selector User Experience Testing
 *
 * This test file covers comprehensive UX testing for the Spotify tool selector feature
 * including user flow, accessibility, mobile responsiveness, error handling, and performance.
 */

import { expect, test } from "@playwright/test";

/**
 * Test Suite 1: Complete User Flow Testing
 */
test.describe("Spotify Tool Selector - User Flow Testing", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a fresh chat page
    await page.goto("/chat/new");
    await waitForSpotifyGroupsReady(page);
  });

  test("Fresh page load to tool selection", async ({ page }) => {
    // Verify initial state
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute(
      "title",
      "Spotify tools disabled",
    );

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Verify dropdown content
    const dropdown = page.locator(".rdm-dropdown-content");
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText("Spotify tool groups");
    await expect(dropdown).toContainText("0/3 groups enabled");

    // Verify all groups are listed
    await expect(dropdown).toContainText("Discovery & Research");
    await expect(dropdown).toContainText("Playback Control");
    await expect(dropdown).toContainText("Playlists & Queue");
  });

  test("Enable/disable groups easily", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Enable first group
    const firstCheckbox = page.locator(".rdm-dropdown-checkbox-item").first();
    await firstCheckbox.click();

    // Verify state change
    await expect(toggleButton).toHaveAttribute("title", "1/3 groups enabled");

    // Disable the group
    await firstCheckbox.click();
    await expect(toggleButton).toHaveAttribute(
      "title",
      "Spotify tools disabled",
    );
  });

  test("Enable/disable all groups", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Enable all groups
    await page.locator("text=Enable all groups").click();
    await expect(toggleButton).toHaveAttribute("title", "3/3 groups enabled");

    // Disable all groups
    await toggleButton.click();
    await page.locator("text=Disable all groups").click();
    await expect(toggleButton).toHaveAttribute(
      "title",
      "Spotify tools disabled",
    );
  });

  test("Changes persist across interactions", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Enable a group
    await toggleButton.click();
    const firstCheckbox = page.locator(".rdm-dropdown-checkbox-item").first();
    await firstCheckbox.click();
    await expect(toggleButton).toHaveAttribute("title", "1/3 groups enabled");

    // Close and reopen dropdown
    await toggleButton.click();
    await page.waitForTimeout(500); // Wait for animation
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Verify state persisted
    await expect(firstCheckbox).toHaveAttribute("data-state", "checked");
    await expect(toggleButton).toHaveAttribute("title", "1/3 groups enabled");
  });

  test("Tools work as expected after selection", async ({ page }) => {
    // Enable discovery group
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');
    await toggleButton.click();
    await page
      .locator(".rdm-dropdown-checkbox-item", {
        hasText: "Discovery & Research",
      })
      .click();

    // Send a message that should trigger Spotify tools
    const input = page.locator('[data-testid="multimodal-input"]');
    await input.fill("What are my top artists on Spotify?");
    await input.press("Enter");

    // Wait for response (this would need actual Spotify API integration to fully test)
    await page.waitForTimeout(2000);
    await expect(page.locator(".message")).toBeVisible();
  });
});

/**
 * Test Suite 2: Accessibility Testing
 */
test.describe("Spotify Tool Selector - Accessibility Testing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat/new");
    await waitForSpotifyGroupsReady(page);
  });

  test("Keyboard navigation works", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Focus the toggle button
    await toggleButton.focus();

    // Open with Space key
    await page.keyboard.press("Space");
    await page.waitForSelector(".rdm-dropdown-content");

    // Navigate with arrow keys
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Select with Space
    await page.keyboard.press("Space");

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.locator(".rdm-dropdown-content")).not.toBeVisible();
  });

  test("Focus states and tab order", async ({ page }) => {
    // Tab to the toggle button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // May need multiple tabs depending on page structure

    const toggleButton = page.locator(
      '[data-testid="spotify-groups-toggle"]:focus',
    );
    await expect(toggleButton).toBeVisible();

    // Open dropdown
    await page.keyboard.press("Enter");
    await page.waitForSelector(".rdm-dropdown-content");

    // First item should be focused
    const firstItem = page.locator(".rdm-dropdown-checkbox-item:focus");
    await expect(firstItem).toBeVisible();
  });

  test("Screen reader compatibility", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Check ARIA attributes
    await expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    // Check dropdown items have proper roles
    await page.waitForSelector(".rdm-dropdown-content");
    const checkboxItems = page.locator(".rdm-dropdown-checkbox-item");
    await expect(checkboxItems.first()).toHaveAttribute(
      "role",
      "menuitemcheckbox",
    );
  });

  test("All interactive elements are accessible", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Check all checkboxes are accessible
    const checkboxes = page.locator(".rdm-dropdown-checkbox-item");
    for (let i = 0; i < (await checkboxes.count()); i++) {
      const checkbox = checkboxes.nth(i);
      await expect(checkbox).toHaveAttribute("tabindex", "-1");
      await expect(checkbox).toHaveAttribute("role", "menuitemcheckbox");
    }

    // Check action items are accessible
    const actionItems = page.locator(".rdm-dropdown-item");
    for (let i = 0; i < (await actionItems.count()); i++) {
      const actionItem = actionItems.nth(i);
      await expect(actionItem).toHaveAttribute("tabindex", "-1");
      await expect(actionItem).toHaveAttribute("role", "menuitem");
    }
  });
});

/**
 * Test Suite 3: Mobile Responsiveness Testing
 */
test.describe("Spotify Tool Selector - Mobile Responsiveness", () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone 6/7/8 size
  });

  test("Mobile viewport sizes", async ({ page }) => {
    await page.goto("/chat/new");
    await page.waitForSelector('[data-testid="spotify-groups-toggle"]');

    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveCSS("width", "32px"); // Should be square aspect
  });

  test("Dropdown positioning on small screens", async ({ page }) => {
    await page.goto("/chat/new");
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    const dropdown = page.locator(".rdm-dropdown-content");

    // Check dropdown doesn't overflow screen
    const dropdownBox = await dropdown.boundingBox();
    if (!dropdownBox) throw new Error("Dropdown not found");
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Viewport not found");

    expect(dropdownBox.x).toBeGreaterThanOrEqual(0);
    expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(dropdownBox.y + dropdownBox.height).toBeLessThanOrEqual(
      viewport.height,
    );
  });

  test("Touch target sizes are adequate", async ({ page }) => {
    await page.goto("/chat/new");
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Check button size
    const buttonBox = await toggleButton.boundingBox();
    if (!buttonBox) throw new Error("Button not found");
    expect(buttonBox.width).toBeGreaterThanOrEqual(32); // Minimum touch target
    expect(buttonBox.height).toBeGreaterThanOrEqual(32);

    // Open dropdown and check checkbox sizes
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    const checkboxes = page.locator(".rdm-dropdown-checkbox-item");
    for (let i = 0; i < (await checkboxes.count()); i++) {
      const checkboxBox = await checkboxes.nth(i).boundingBox();
      if (!checkboxBox) throw new Error("Checkbox not found");
      expect(checkboxBox.width).toBeGreaterThanOrEqual(32);
      expect(checkboxBox.height).toBeGreaterThanOrEqual(32); // Minimum touch target
    }
  });

  test("Mobile UI is usable and intuitive", async ({ page }) => {
    await page.goto("/chat/new");

    // Test scrolling behavior
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    const dropdown = page.locator(".rdm-dropdown-content");

    // Check if dropdown is scrollable on small screens
    const dropdownBox = await dropdown.boundingBox();
    const viewportSize = page.viewportSize();

    if (dropdownBox && viewportSize) {
      // Dropdown should be scrollable if it's taller than viewport
      if (dropdownBox.height > viewportSize.height * 0.8) {
        await expect(dropdown).toHaveCSS("overflow-y", "auto");
      }
    } else {
      throw new Error("Dropdown bounding box or viewport size is null");
    }
  });
});

/**
 * Test Suite 4: Error Handling and Edge Cases
 */
test.describe("Spotify Tool Selector - Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat/new");
    await waitForSpotifyGroupsReady(page);
  });

  test("Rapid clicking and interaction", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Rapidly click the toggle button
    for (let i = 0; i < 10; i++) {
      await toggleButton.click();
      await page.waitForTimeout(50); // Very short delay
    }

    // Should still be in a consistent state
    await expect(toggleButton).toBeVisible();
    const dropdown = page.locator(".rdm-dropdown-content");
    const isVisible = await dropdown.isVisible();

    // Click again to ensure it toggles properly
    await toggleButton.click();
    await page.waitForTimeout(300);

    if (isVisible) {
      await expect(dropdown).not.toBeVisible();
    } else {
      await expect(dropdown).toBeVisible();
    }
  });

  test("Behavior when chat is streaming", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Start a chat message to simulate streaming state
    const input = page.locator('[data-testid="multimodal-input"]');
    await input.fill("Hello");
    await input.press("Enter");

    // Wait for message to be sent
    await page.waitForTimeout(1000);

    // Try to interact with Spotify selector while streaming
    // Button should be disabled
    await expect(toggleButton).toBeDisabled();

    // Wait for streaming to complete
    await page.waitForSelector(".message:last-child", { state: "visible" });
    await page.waitForTimeout(2000);

    // Button should be enabled again
    await expect(toggleButton).not.toBeDisabled();
  });

  test("Invalid state transitions", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Try to enable all when all are already enabled
    await page.locator("text=Enable all groups").click();
    await expect(toggleButton).toHaveAttribute("title", "3/3 groups enabled");

    // Try to enable all again - should be no-op
    await toggleButton.click();
    await page.locator("text=Enable all groups").click();
    await expect(toggleButton).toHaveAttribute("title", "3/3 groups enabled");

    // Try to disable all when none are enabled
    await page.locator("text=Disable all groups").click();
    await expect(toggleButton).toHaveAttribute(
      "title",
      "Spotify tools disabled",
    );

    // Try to disable all again - should be no-op
    await toggleButton.click();
    await page.locator("text=Disable all groups").click();
    await expect(toggleButton).toHaveAttribute(
      "title",
      "Spotify tools disabled",
    );
  });

  test("Recovery from error states", async ({ page }) => {
    // This would need to be tested with actual error injection
    // For now, we'll test that the component recovers from rapid state changes

    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Rapidly change states
    for (let i = 0; i < 5; i++) {
      await toggleButton.click();
      await page.locator(".rdm-dropdown-checkbox-item").first().click();
      await toggleButton.click();
      await page.locator(".rdm-dropdown-checkbox-item").nth(1).click();
      await page.waitForTimeout(100);
    }

    // Component should still be functional
    await toggleButton.click();
    await expect(page.locator(".rdm-dropdown-content")).toBeVisible();
  });
});

/**
 * Test Suite 5: Performance Testing
 */
test.describe("Spotify Tool Selector - Performance Testing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat/new");
    await waitForSpotifyGroupsReady(page);
  });

  test("Dropdown open/close performance", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Measure open performance
    const startTime = Date.now();
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");
    const openTime = Date.now() - startTime;

    console.log(`Dropdown open time: ${openTime}ms`);
    expect(openTime).toBeLessThan(300); // Should open in under 300ms

    // Measure close performance
    const closeStartTime = Date.now();
    await toggleButton.click();
    await expect(page.locator(".rdm-dropdown-content")).not.toBeVisible();
    const closeTime = Date.now() - closeStartTime;

    console.log(`Dropdown close time: ${closeTime}ms`);
    expect(closeTime).toBeLessThan(300); // Should close in under 300ms
  });

  test("Rapid state changes performance", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Rapidly open/close dropdown
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await toggleButton.click();
      await page.waitForTimeout(50);
      await toggleButton.click();
      await page.waitForTimeout(50);
    }
    const totalTime = Date.now() - startTime;

    console.log(`10 open/close cycles: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(3000); // Should handle rapid changes efficiently
  });

  test("Memory leak verification", async ({ page }) => {
    // This would require more advanced testing with memory profiling
    // For basic testing, we'll verify that repeated interactions don't degrade performance

    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    const times = [];
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await toggleButton.click();
      await page.waitForSelector(".rdm-dropdown-content");
      await toggleButton.click();
      await expect(page.locator(".rdm-dropdown-content")).not.toBeVisible();
      times.push(Date.now() - startTime);
    }

    // Performance should be consistent, not degrade over time
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const lastTime = times[times.length - 1];
    const firstTime = times[0];

    console.log(`Average cycle time: ${avgTime}ms`);
    console.log(`First cycle: ${firstTime}ms, Last cycle: ${lastTime}ms`);

    // Last cycle shouldn't be significantly slower than first
    expect(lastTime).toBeLessThan(firstTime * 1.5);
  });

  test("Rendering performance", async ({ page }) => {
    const toggleButton = page.locator('[data-testid="spotify-groups-toggle"]');

    // Open dropdown and measure rendering
    const startTime = Date.now();
    await toggleButton.click();
    await page.waitForSelector(".rdm-dropdown-content");

    // Check that all items are rendered
    const checkboxes = page.locator(".rdm-dropdown-checkbox-item");
    await expect(checkboxes).toHaveCount(3);

    const renderTime = Date.now() - startTime;
    console.log(`Full dropdown render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(500); // Should render in under 500ms
  });
});

/**
 * Helper function to wait for Spotify tool groups to be ready
 */
async function waitForSpotifyGroupsReady(page: any) {
  await page.waitForFunction(() => {
    const toggle = document.querySelector(
      '[data-testid="spotify-groups-toggle"]',
    );
    return toggle && !toggle.hasAttribute("disabled");
  });
}
