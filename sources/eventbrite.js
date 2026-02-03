// Improved Eventbrite scraper (removes duplicates & bad links)

const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://www.eventbrite.com.au/d/australia--sydney/events/";

async function scrapeEventbrite() {
  const { data } = await axios.get(URL);
  const $ = cheerio.load(data);

  const events = [];
  const seenTitles = new Set();

  $("a").each((_, el) => {
    const title = $(el).find("h3").text().trim();
    let link = $(el).attr("href");

    if (!title || !link) return;
    if (link === "/") return;

    // Fix relative URLs
    if (link.startsWith("/")) {
      link = "https://www.eventbrite.com.au" + link;
    }

    // Remove duplicates
    if (seenTitles.has(title)) return;
    seenTitles.add(title);

    events.push({
      source: "Eventbrite",
      city: "Sydney",
      title,
      date: "N/A",
      link
    });
  });

  return events.slice(0, 10);
}

module.exports = scrapeEventbrite;
