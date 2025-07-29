const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Get the URL from the command line arguments
const url = process.argv[2];

if (!url) {
  console.error("Please provide a URL as a command-line argument.");
  process.exit(1);
}

// Function to scrape links and images
async function scrapeWebsite() {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const links = [];
    $("a").each((index, element) => {
      const link = $(element).attr("href");
      if (link) {
        links.push(link);
      }
    });

    const images = [];
    $("figure").each((index, element) => {
      const image = $(element).attr("src");
      if (image) {
        images.push(image);
      }
    });

    return { links, images };
  } catch (error) {
    console.error("Error while scraping:", error);
    return { links: [], images: [] };
  }
}

// Call the scraping function
scrapeWebsite().then(({ links, images }) => {
  // Save the scraped data to JSON files
  // Write the links and images to a json file
  fs.writeFile("scraped_links.json", JSON.stringify(links, null, 2), (err) => {
    if (err) {
      console.error("Error saving links to JSON file:", err);
    } else {
      console.log("Links saved to scraped_links.json");
    }
  });

  //Write the images to a json file
  fs.writeFile(
    "scraped_images.json",
    JSON.stringify(images, null, 2),
    (err) => {
      if (err) {
        console.error("Error saving images to JSON file:", err);
      } else {
        console.log("Images saved to scraped_images.json");
      }
    }
  );
});
