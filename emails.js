import puppeteer from "puppeteer";
import fs from "fs";

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  console.log("Opening IBBA main broker search page...");
  await page.goto("https://www.ibba.org/find-a-business-broker/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Wait for manual CAPTCHA if needed
  const hasCaptcha = await page.$('.g-recaptcha, iframe[src*="recaptcha"]');
  if (hasCaptcha) {
    console.log("CAPTCHA detected. Please solve it manually in the browser.");
    await page.waitForFunction(
      () =>
        !document.querySelector(".g-recaptcha") &&
        !document.querySelector('iframe[src*="recaptcha"]'),
      { timeout: 300000 }
    );
    console.log("CAPTCHA solved.");
  } else {
    console.log("No CAPTCHA detected.");
  }

  // Now navigate to the API endpoint and intercept response
  const apiUrl = "https://www.ibba.org/wp-json/brokers/all";

  let jsonResponse = null;
  page.on("response", async (response) => {
    if (response.url() === apiUrl) {
      try {
        const json = await response.json();
        jsonResponse = json;
      } catch (e) {
        console.error("Failed to parse JSON from API response:", e);
      }
    }
  });

  console.log("Navigating to API URL to get data...");
  await page.goto(apiUrl, { waitUntil: "networkidle2", timeout: 60000 });

  // Wait a bit to ensure response handler catches the data
  await new Promise((r) => setTimeout(r, 3000));

  if (!jsonResponse) {
    console.error("Failed to get JSON data from API response.");
    await browser.close();
    return;
  }

  fs.writeFileSync(
    "ibba_brokers_all.json",
    JSON.stringify(jsonResponse, null, 2),
  );
  console.log("✅ Data saved to ibba_brokers_all.json");

  await browser.close();
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
