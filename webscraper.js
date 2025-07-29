import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const inputUrl = process.argv[2];

if (!inputUrl) {
  console.error(
    "Please provide a URL.\nUsage: node webscraper.js https://example.com"
  );
  process.exit(1);
}

function removeDuplicates(arr) {
  return [...new Set(arr)];
}

async function scrapeSite(url) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  await autoScroll(page);

  const html = await page.content();

  const filenameBase = url
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  // Save the full HTML page
  const htmlFilepath = path.resolve(`./${filenameBase}.html`);
  fs.writeFileSync(htmlFilepath, html);
  console.log(`Saved HTML to ${htmlFilepath}\n`);

  // Extract links and images
  const { links, images } = await page.evaluate(() => {
    // Links
    const anchors = Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href && href.startsWith("http"));

    // Images from <img>
    const imgSrcs = Array.from(document.querySelectorAll("img"))
      .map((img) => img.src)
      .filter(Boolean);

    // Images from <picture><source srcset="">
    const pictureSrcs = Array.from(document.querySelectorAll("picture source"))
      .map((source) => source.srcset ? source.srcset.split(",")[0].trim().split(" ")[0] : null,
      )
      .filter(Boolean);

    // Images from CSS background-image
    const bgSrcs = [];
    Array.from(document.querySelectorAll("*")).forEach((el) => {
      const bg = window
        .getComputedStyle(el)
        .getPropertyValue("background-image");
      if (bg && bg !== "none") {
        const match = bg.match(/url\(["']?(.+?)["']?\)/);
        if (match) bgSrcs.push(match[1]);
      }
    });

    return {
      links: [...new Set(anchors)],
      images: [...new Set([...imgSrcs, ...pictureSrcs, ...bgSrcs])],
    };
  });

  await browser.close();

  return {
    links: removeDuplicates(links),
    images: removeDuplicates(images),
    baseFilename: filenameBase,
  };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const { scrollHeight } = document.body;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

(async () => {
  try {
    console.log(`Scraping page: ${inputUrl}\n`);
    const { links, images, baseFilename } = await scrapeSite(inputUrl);

    console.log(`Links (${links.length}):`);
    links.forEach((link) => console.log(link));

    console.log(`\nImages (${images.length}):`);
    images.forEach((img) => console.log(img));

    // Save links to JSON
    const linksFile = path.resolve(`./${baseFilename}_links.json`);
    fs.writeFileSync(linksFile, JSON.stringify(links, null, 2));
    console.log(`\nSaved links to ${linksFile}`);

    // Save images to JSON
    const imagesFile = path.resolve(`./${baseFilename}_images.json`);
    fs.writeFileSync(imagesFile, JSON.stringify(images, null, 2));
    console.log(`Saved images to ${imagesFile}`);
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
