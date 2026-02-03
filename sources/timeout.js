const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://www.timeout.com/sydney/things-to-do";

async function scrapeTimeout() {
  const { data } = await axios.get(URL);
  const $ = cheerio.load(data);

  const events = [];

  $("h3").each((_, el) => {
    const title = $(el).text().trim();

    if (title) {
      events.push({
        source: "TimeOut",
        city: "Sydney",
        title
      });
    }
  });

  return events.slice(0, 10);
}

module.exports = scrapeTimeout;
