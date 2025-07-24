import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { URL } from "url";

const inputUrl = process.argv[2];

if (!inputUrl) {
  console.error("Please provide a URL. Example: node webscraper.js https://www.example.com");
  process.exit(1);
}

async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

function parseHTML(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

function getLinks(document, baseUrl) {
  return [...document.querySelectorAll("a")]
    .map((a) => a.getAttribute("href"))
    .filter((href) => href)
    .map((href) => {
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getImages(document, baseUrl) {
  return [...document.querySelectorAll("img")]
    .map((img) => img.getAttribute("src"))
    .filter((src) => src)
    .map((src) => {
      try {
        return new URL(src, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getEmailsFromHTML(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex);
  return matches ? [...new Set(matches)] : [];
}

function removeDuplicates(arr) {
  return [...new Set(arr)];
}

async function main() {
  try {
    console.log(`Scraping ${inputUrl}...\n`);

    const html = await fetchHTML(inputUrl);
    const document = parseHTML(html);

    let links = getLinks(document, inputUrl);
    let images = getImages(document, inputUrl);
    let emails = getEmailsFromHTML(html);

    links = removeDuplicates(links);
    images = removeDuplicates(images);
    emails = removeDuplicates(emails);

    console.log("Links found:");
    links.forEach((link) => console.log(link));

    console.log("\nImages found:");
    images.forEach((img) => console.log(img));

    console.log("\nEmails found:");
    if (emails.length > 0) {
      emails.forEach((email) => console.log(email));
    } else {
      console.log("No emails found.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
