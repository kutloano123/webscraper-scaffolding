import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

puppeteerExtra.use(StealthPlugin());

const TARGET_URL = "https://www.igdb.com/games/coming_soon";
const OUTPUT_FILE = path.join(process.cwd(), "upcoming_games.json");

async function scrapeGames() {
  const browser = await puppeteerExtra.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto(TARGET_URL, { waitUntil: "networkidle2" });

  const games = await page.evaluate(() => {
    const items = [];
    const gameCards = document.querySelectorAll(".game");

    gameCards.forEach(card => {
      const name = card.querySelector(".title")?.innerText || "N/A";
      const genre = card.querySelector(".genre")?.innerText || "N/A";
      const platforms = card.querySelector(".platforms")?.innerText || "N/A";
      const releaseDate = card.querySelector(".release-date")?.innerText || "TBA";
      const publisher = card.querySelector(".company")?.innerText || "Unknown";
      const image = card.querySelector("img")?.src || "";
      const trailer = card.querySelector("a.trailer")?.href || "";

      items.push({
        name,
        genre,
        platforms,
        release_date: releaseDate,
        publisher,
        image,
        trailer,
      });
    });

    return items;
  });

  await browser.close();
  return games;
}

(async () => {
  try {
    const games = await scrapeGames();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(games, null, 2));
    console.log(`Saved ${games.length} games to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error scraping games:", err);
  }
})();
