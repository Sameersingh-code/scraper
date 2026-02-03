require("dotenv").config();
const express = require("express");
const fs = require("fs");
const session = require("express-session");
const passport = require("./auth");

const scrapeEventbrite = require("./sources/eventbrite");
const scrapeMeetup = require("./sources/meetup");
const scrapeTimeout = require("./sources/timeout");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = "events.json";

// -------- SCRAPER FUNCTION --------
async function scrapeAll() {
  const events = [
    ...(await scrapeEventbrite()),
    ...(await scrapeMeetup()),
    ...(await scrapeTimeout())
  ];

  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
  return events;
}

// -------- SESSION + PASSPORT --------
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// -------- HOME PAGE UI (WITH NAVBAR) --------
app.get("/", async (req, res) => {
  let events = [];

  if (fs.existsSync(DATA_FILE)) {
    events = JSON.parse(fs.readFileSync(DATA_FILE));
  } else {
    events = await scrapeAll();
  }

  const cards = events.map(e => `
    <div class="card">
      <h3>${e.title}</h3>
      <p><b>City:</b> ${e.city}</p>
      <p><b>Source:</b> ${e.source}</p>

      <form method="POST" action="/ticket">
        <input type="hidden" name="link" value="${e.link}" />

        <div class="form-row">
          <input type="email" name="email" required placeholder="Enter email" />
          <button type="submit">GET TICKETS</button>
        </div>

        <div class="checkbox-row">
          <input type="checkbox" required />
          <span>I agree to receive updates</span>
        </div>
      </form>
    </div>
  `).join("");

  res.send(`
    <html>
      <head>
        <title>Sydney Events</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: 'Inter', sans-serif;
            background: #000;
            color: #fff;
          }

          /* NAVBAR */
          .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 40px;
            background: #000;
            border-bottom: 1px solid #1a1a1a;
          }

          .logo {
            font-size: 20px;
            font-weight: 700;
            color: #00ff66;
          }

          .nav-links a {
            color: white;
            text-decoration: none;
            margin-left: 20px;
            font-weight: 500;
          }

          .nav-links a:hover {
            color: #00ff66;
          }

          .login-btn {
            background: transparent;
            border: 1px solid #00ff66;
            color: #00ff66;
            padding: 8px 14px;
            border-radius: 8px;
            text-decoration: none;
            transition: all 0.3s ease;
          }

          .login-btn:hover {
            background: #00ff66;
            color: black;
          }

          .container {
            padding: 30px 40px;
          }

          h1 {
            font-size: 32px;
            margin-bottom: 20px;
          }

          /* EVENT CARD */
          .card {
            background: #0a0a0a;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 14px;
            border: 1px solid #111;
            box-shadow: 0 10px 25px rgba(0,255,102,0.05);
            animation: fadeIn 0.5s ease;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(0,255,102,0.15);
          }

          .form-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
          }

          input[type="email"] {
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #222;
            background: #000;
            color: white;
            width: 260px;
          }

          button {
            background: linear-gradient(135deg, #00ff66, #00cc55);
            color: black;
            border: none;
            padding: 10px 16px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          button:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(0,255,102,0.4);
          }

          .checkbox-row {
            margin-top: 8px;
            font-size: 13px;
            color: #aaa;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        </style>
      </head>

      <body>
        <div class="navbar">
          <div class="logo">Sydney Events</div>
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/auth/google" class="login-btn">Login with Google</a>
          </div>
        </div>

        <div class="container">
          <h1>Upcoming Events in Sydney</h1>
          ${cards}
        </div>
      </body>
    </html>
  `);
});

// -------- GOOGLE AUTH --------
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {});
  res.redirect("/");
});

// -------- AUTH MIDDLEWARE --------
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/");
}

// -------- DASHBOARD (WITH ANIMATION) --------
app.get("/dashboard", isLoggedIn, (req, res) => {
  const events = JSON.parse(fs.readFileSync("events.json"));

  const rows = events.map(e => `
    <tr>
      <td>${e.title}</td>
      <td>${e.source}</td>
      <td>${e.city}</td>
      <td><button onclick="alert('Imported!')">Import</button></td>
    </tr>
  `).join("");

  res.send(`
    <html>
      <head>
        <style>
          body {
            background: #000;
            color: white;
            font-family: 'Inter', sans-serif;
            padding: 30px;
          }

          h1 {
            color: #00ff66;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: #0a0a0a;
            animation: fadeIn 0.6s ease;
          }

          th, td {
            padding: 12px;
            border: 1px solid #111;
          }

          th {
            background: #00ff66;
            color: black;
          }

          tr:hover {
            background: #111;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
      </head>
      <body>
        <h1>Admin Dashboard</h1>
        <p>Logged in as ${req.user.displayName}</p>
        <a href="/logout" style="color:#00ff66">Logout</a>

        <table>
          <tr>
            <th>Title</th>
            <th>Source</th>
            <th>City</th>
            <th>Action</th>
          </tr>
          ${rows}
        </table>
      </body>
    </html>
  `);
});

// -------- TICKET REDIRECT --------
app.post("/ticket", (req, res) => {
  const { link } = req.body;
  res.redirect(link);
});

// -------- START SERVER --------
app.listen(3000, () => {
  console.log("🌐 Server running at http://localhost:3000");
});
