const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://www.meetup.com/find/?location=au--sydney&source=EVENTS";

async function scrapeMeetup() {
  const { data } = await axios.get(URL);
  const $ = cheerio.load(data);

  const events = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const link = $(el).attr("href");

    if (title.length > 10 && link && link.includes("meetup.com")) {
      events.push({
        source: "Meetup",
        city: "Sydney",
        title,
        link
      });
    }
  });

  return events.slice(0, 10);
}

module.exports = scrapeMeetup;
