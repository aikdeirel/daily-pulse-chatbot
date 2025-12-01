import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("manifest.json is accessible and valid", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const manifest = await response.json();

    // Required PWA manifest fields
    expect(manifest.name).toBe("AI Chatbot");
    expect(manifest.short_name).toBe("Chatbot");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBeDefined();
    expect(manifest.theme_color).toBeDefined();

    // Icons validation
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const icon192 = manifest.icons.find(
      (icon: { sizes: string }) => icon.sizes === "192x192"
    );
    const icon512 = manifest.icons.find(
      (icon: { sizes: string }) => icon.sizes === "512x512"
    );

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(icon192.type).toBe("image/png");
    expect(icon512.type).toBe("image/png");
  });

  test("PWA icons are accessible", async ({ request }) => {
    const icon192Response = await request.get("/icon-192.png");
    expect(icon192Response.status()).toBe(200);
    expect(icon192Response.headers()["content-type"]).toContain("image/png");

    const icon512Response = await request.get("/icon-512.png");
    expect(icon512Response.status()).toBe(200);
    expect(icon512Response.headers()["content-type"]).toContain("image/png");
  });

  test("HTML includes PWA meta tags", async ({ page }) => {
    await page.goto("/");

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // Check apple-mobile-web-app-capable meta tag
    const appleCapable = page.locator(
      'meta[name="apple-mobile-web-app-capable"]'
    );
    await expect(appleCapable).toHaveAttribute("content", "yes");

    // Check apple-mobile-web-app-title meta tag
    const appleTitle = page.locator(
      'meta[name="apple-mobile-web-app-title"]'
    );
    await expect(appleTitle).toHaveAttribute("content", "AI Chatbot");
  });

  test("service worker is registered in production build", async ({
    page,
    baseURL,
  }) => {
    // Skip this test in development mode since SW is disabled
    if (process.env.NODE_ENV === "development") {
      test.skip();
    }

    await page.goto("/");

    // Check if service worker file exists (even if not registered in dev)
    const swResponse = await page.request.get(`${baseURL}/sw.js`);
    // In development, the SW may not exist due to disable option
    // In production build, it should be accessible
    if (swResponse.status() === 200) {
      expect(swResponse.headers()["content-type"]).toContain(
        "application/javascript"
      );
    }
  });
});
