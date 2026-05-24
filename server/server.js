const dotenv = require("dotenv");
dotenv.config();

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const { execFile } = require("child_process");
const path     = require("path");

const app  = express();
const port = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith(".vercel.app") || origin.endsWith(".netlify.app") || origin.endsWith(".s3-website.amazonaws.com")) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/users",     require("./routes/user"));
app.use("/api/questions", require("./routes/question"));

// ── Helper: promisified execFile ──────────────────────────────────────────────
function runPython(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "python",
      args,
      { cwd: path.join(__dirname), maxBuffer: 1024 * 1024 * 10, ...options },
      (error, stdout, stderr) => {
        if (error) return reject({ error, stderr });
        resolve(stdout);
      }
    );
  });
}

// ── Helper: strip non-JSON prefix from Python stdout ─────────────────────────
// NLTK / transformers print messages to stdout before the JSON output.
// We skip straight to the first { or [ to find the real JSON.
function parsePythonResult(stdout) {
  const jsonStart = stdout.search(/[{[]/);
  if (jsonStart === -1) return null;

  const result = JSON.parse(stdout.slice(jsonStart).trim());

  // India format:  { type:"india", data:[...objects...] }
  if (result.type === "india") {
    return result.data?.length > 0 ? result : null;
  }
  // USA pandas split format: { columns:[...], data:[[...rows...]] }
  if (Array.isArray(result.data) && result.data.length > 0) {
    return result;
  }
  return null;
}

// ── GET /run-python/:age/:description  ───────────────────────────────────────
//   USA – searches NIH DSLD CSV dataset via NER pipeline.
//   No AI model involved at all. Returns 404 if nothing found.
app.get("/run-python/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  console.log(`[USA] Searching dataset for: "${description}"`);

  try {
    const stdout = await runPython(["check.py", age, "Vega", "False", description, "none"]);
    const result = parsePythonResult(stdout);

    if (result) {
      console.log(`[USA] ✅ Found results from dataset`);
      result._meta = { originalQuery: description, country: "USA" };
      return res.json(result);
    }

    console.log(`[USA] ⚠ No results in dataset for: "${description}"`);
    return res.status(404).json({
      error:         "no_match",
      message:       "No supplements found in the NIH database matching your description. Try using different keywords.",
      originalQuery: description,
      country:       "USA",
    });

  } catch (err) {
    const errMsg = (err.stderr || err.error?.message || "").toString();
    console.error(`[USA] Dataset search error: ${errMsg.slice(0, 200)}`);
    return res.status(500).json({
      error:         "search_error",
      message:       "Unable to search the supplement database. Please try again.",
      originalQuery: description,
      country:       "USA",
    });
  }
});

// ── GET /run-india/:age/:description  ────────────────────────────────────────
//   India – keyword + synonym matching against india_supplements.json.
//   No AI model involved at all. Returns 404 if nothing found.
app.get("/run-india/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  console.log(`[India] Searching dataset for: "${description}"`);

  try {
    const stdout = await runPython(
      ["india_check.py", age, description, "none"],
      { maxBuffer: 1024 * 1024 * 2 }
    );
    const result = parsePythonResult(stdout);

    if (result) {
      console.log(`[India] ✅ Found ${result.data.length} results from dataset`);
      result._meta = { originalQuery: description, country: "India" };
      return res.json(result);
    }

    console.log(`[India] ⚠ No results in dataset for: "${description}"`);
    return res.status(404).json({
      error:         "no_match",
      message:       "No supplements found in our Indian database matching your description. Try different keywords like 'fatigue', 'joint pain', 'immunity', etc.",
      originalQuery: description,
      country:       "India",
    });

  } catch (err) {
    const errMsg = (err.stderr || err.error?.message || "").toString();
    console.error(`[India] Dataset search error: ${errMsg.slice(0, 200)}`);
    return res.status(500).json({
      error:         "search_error",
      message:       "Unable to search the supplement database. Please try again.",
      originalQuery: description,
      country:       "India",
    });
  }
});

// ── POST /run-python-advanced  (allergies passed explicitly in body) ──────────
app.post("/run-python-advanced", async (req, res) => {
  let { age = "Adult", description = "", allergies = "", country = "USA" } = req.body;

  if (!description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  age = age.charAt(0).toUpperCase() + age.slice(1);
  const isIndia = country === "India";

  const args = isIndia
    ? ["india_check.py", age, description, allergies || "none"]
    : ["check.py",       age, "Vega", "False", description, allergies || "none"];

  try {
    const stdout = await runPython(args);
    const result = parsePythonResult(stdout);

    if (result) {
      result._meta = { originalQuery: description, allergiesDetected: allergies ? allergies.split(",") : [], country };
      return res.json(result);
    }

    return res.status(404).json({
      error:   "no_match",
      message: "No supplements found matching your description. Try different keywords.",
      country,
    });
  } catch (err) {
    return res.status(500).json({ error: "search_error", message: "Unable to search database.", country });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODBURL)
  .then(() => console.log("DB IS CONNECTED !!"))
  .catch((err) => console.log(`DB connection failed: ${err}`));

app.listen(port, () => console.log(`SERVER IS RUNNING ON PORT ${port}`));

module.exports = app;
