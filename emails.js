import { connect } from "puppeteer-real-browser";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerExtra from "puppeteer-extra";
import fs from "fs";
import path from "path";

// Enable stealth mode
puppeteerExtra.use(StealthPlugin());

// Target IBBA API
const IBBA_URL = "https://www.ibba.org/wp-json/brokers/all";


const OUTPUT_FILE = path.join(process.cwd(), "ibba-brokers.json");

//  JSON to file
function saveBrokers(brokers) {
  const output = {
    totalBrokers: brokers.length,
    brokers,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved broker data to: ${OUTPUT_FILE}`);
}

async function waitForRecaptcha(page) {
  try {
    await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 60000 });
    console.log("Detected reCAPTCHA iframe");
  } catch {
    console.log("No reCAPTCHA detected, continuing");
  }
}


async function scrollToBottom(page) {
  let previousHeight = 0;
  while (true) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;
    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Fetch broker JSON using in-page fetch
async function fetchBrokerData(page) {
  return page.evaluate(async () => {
    const response = await fetch("https://www.ibba.org/wp-json/brokers/all");
    return await response.json();
  });
}


function cleanBrokers(raw) {
  return raw.map(b => ({
    firm: b.company || "N/A",
    contact_person: `${b.first_name || ""} ${b.last_name || ""}`.trim() || "N/A",
    email: b.email || "N/A",
  }));
}

// Main run
async function run() {
  let browser;
  try {
    const { browser: launchedBrowser, page } = await connect({
      headless: false,
      fingerprint: true,
      turnstile: true,
      plugins: [StealthPlugin()],
    });

    browser = launchedBrowser;

    await page.goto(IBBA_URL, { waitUntil: "networkidle2" });
    console.log("Loaded broker API page");

    await waitForRecaptcha(page);
    await scrollToBottom(page);

    const rawData = await fetchBrokerData(page);
    const cleaned = cleanBrokers(rawData);

    console.log(`Scraped ${cleaned.length} brokers`);
    saveBrokers(cleaned);

  } catch (err) {
    console.error("Scraping failed:", err.message);
  } finally {
    if (browser) await browser.close();
    console.log("Browser closed");
  }
}


run();
