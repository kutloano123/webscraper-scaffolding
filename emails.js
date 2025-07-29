// Import necessary modules
import { connect } from "puppeteer-real-browser";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerExtra from "puppeteer-extra";
import fs from "fs";
import path from "path";

// Apply stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

// Validate the target URL
function validateUrl(url) {
  if (!url) {
    console.error(" Please provide a URL: node webscraper.js <url>");
    process.exit(1);
  }

  try {
    return new URL(url);
  } catch {
    console.error(" Invalid URL format:", url);
    process.exit(1);
  }
}

const WEBSITE_URL = validateUrl("https://www.ibba.org/wp-json/brokers/all");

// Ensure a clean, short file-safe name for the results file
function sanitizeUrl(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^\w\-]/g, "_")
    .substring(0, 50);
}

// Ensure the output folder exists
function ensureResultsDir(dir = "brokers") {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate a timestamp for naming files
function generateTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// Build the path for the JSON output
function buildFilePath(url, timestamp, folder = "brokers") {
  const fileName = "ibba-brokers"; // static name for clarity
  return path.join(folder, `${fileName}_${timestamp}.json`);
}

// Write data to file
function writeJsonFile(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(` Saved broker data to: ${filepath}`);
}

// Save the full results to a JSON file
function saveResultsToFile(brokers, url) {
  const timestamp = generateTimestamp();
  ensureResultsDir();
  const filePath = buildFilePath(url, timestamp);

  const output = {
    timestamp,
    url,
    totalBrokers: brokers.length,
    brokers,
  };

  writeJsonFile(filePath, output);
}

// Detect if reCAPTCHA is present
async function waitForRecaptcha(page) {
  try {
    await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 60000 });
    console.log(" Detected reCAPTCHA iframe");
  } catch {
    console.log("   proceeding");
  }
}

// Scroll to the bottom of the page to load dynamic content
async function scrollToBottom(page) {
  let previousHeight = 0;
  while (true) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Fetch broker data via API call
async function fetchBrokerData(page) {
  return page.evaluate(async () => {
    const response = await fetch("https://www.ibba.org/wp-json/brokers/all");
    return await response.json();
  });
}

// Format broker data to only the required fields
function transformBrokerData(brokerList) {
  return brokerList.map(info => {
    const firm = info.company || "N/A";
    const fullName = `${info.first_name || ""} ${info.last_name || ""}`.trim() || "N/A";
    const email = info.email || "N/A";

    return {
      firm,
      contact_person: fullName,
      email,
    };
  });
}

// Main browser automation and scraping logic
async function runBrowser() {
  let browser;
  try {
    const { browser: launchedBrowser, page } = await connect({
      headless: false,
      fingerprint: true,
      turnstile: true,
      plugins: [StealthPlugin()],
    });

    browser = launchedBrowser;

    await page.goto(WEBSITE_URL, { waitUntil: "networkidle2" });
    console.log(" Loaded the IBBA broker page");

    await waitForRecaptcha(page);
    await scrollToBottom(page);

    const rawData = await fetchBrokerData(page);
    const cleanedData = transformBrokerData(rawData);

    console.log(` Scraped ${cleanedData.length} brokers`);
    saveResultsToFile(cleanedData, WEBSITE_URL);

  } catch (error) {
    console.error(" Scraping failed:", error.message);
  } finally {
    if (browser) await browser.close();
    console.log("Browser closed");
  }
}

// Start the scraper
runBrowser();
