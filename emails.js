import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  console.log("Opening IBBA search page...");
  await page.goto("https://www.ibba.org/find-a-business-broker/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Check if there's a CAPTCHA
  const recaptcha = await page.$('iframe[src*="recaptcha"]');
  if (recaptcha) {
    console.log("CAPTCHA detected. Please solve it manually...");
    await page.waitForFunction(() => !document.querySelector('iframe[src*="recaptcha"]'), {
      timeout: 180000,
    });
    console.log("CAPTCHA solved.");
  }

  await page.waitForTimeout(3000);

  // Fill in zip code and select checkboxes
  const input = await page.$('#zipSearchss');
  if (input) await input.type("10001", { delay: 50 });

  const checkboxes = await page.$$('input[type="checkbox"]');
  for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
    await checkboxes[i].click();
    await page.waitForTimeout(300);
  }

  const submit = await page.$('button[type="submit"], input[type="submit"]');
  if (submit) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      submit.click(),
    ]);
  }

  console.log("Scraping results...");

  await page.waitForSelector(".broker-result, .broker-card, .result-item", { timeout: 10000 });
  const results = await page.$$eval(".broker-result, .broker-card, .result-item", (cards) =>
    cards.map((card) => {
      const textContent = card.innerText;
      const emailMatch = textContent.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
      const email = emailMatch ? emailMatch[0] : "N/A";

      const firm = card.querySelector(".firm-name, .company-name")?.innerText || "N/A";
      const contact = card.querySelector(".contact-name, .broker-name")?.innerText || "N/A";

      return { firmName: firm, contactName: contact, email };
    })
  );

  fs.writeFileSync("ibba_email_list.json", JSON.stringify(results, null, 2));
  console.log(`✅ Scraped ${results.length} entries.`);
  console.log("📁 Data saved to ibba_email_list.json");

  await browser.close();
})();
