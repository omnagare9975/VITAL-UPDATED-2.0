const dotenv = require("dotenv");
dotenv.config();

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const { execFile } = require("child_process");
const path     = require("path");
const Groq     = require("groq-sdk");

const app  = express();
const port = process.env.PORT || 3001;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".netlify.app") ||
      origin.includes("s3-website") ||
      origin.includes("amazonaws.com")
    ) return cb(null, true);
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

// ── Helper: strip non-JSON prefix from Python stdout then parse ───────────────
// NLTK / transformers print messages to stdout before the JSON — we skip them.
function parsePythonResult(stdout) {
  const jsonStart = stdout.search(/[{[]/);
  if (jsonStart === -1) return null;

  const result = JSON.parse(stdout.slice(jsonStart).trim());

  if (result.type === "india") {
    return result.data?.length > 0 ? result : null;
  }
  if (Array.isArray(result.data) && result.data.length > 0) {
    return result;
  }
  return null;
}

// ── Helper: Groq fallback advisory (only called when dataset finds nothing) ───
async function generateFallbackResponse(description, country = "USA") {
  const countryCtx = country === "India"
    ? "Suggest well-known Indian Ayurvedic brands like Himalaya, Dabur, Patanjali, MuscleBlaze, or Oziva."
    : "Suggest internationally available supplement types.";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 250,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "You are a health supplement advisor. Be brief and always recommend consulting a healthcare provider.",
      },
      {
        role: "user",
        content: `A user searched for: "${description}". Our supplement database had no matches. ${countryCtx}
In 2-3 sentences, mention what supplement types are generally associated with their need. Do NOT recommend specific dosages or brands.`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// ── GET /run-python/:age/:description  (USA – NIH DSLD) ──────────────────────
app.get("/run-python/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  console.log(`[USA] Searching dataset: "${description}"`);

  try {
    const stdout = await runPython(["check.py", age, "Vega", "False", description, "none"]);
    const result = parsePythonResult(stdout);

    if (result) {
      console.log(`[USA] ✅ Dataset hit`);
      result._meta = { originalQuery: description, country: "USA" };
      return res.json(result);
    }

    // Dataset found nothing — use Groq advisory as fallback
    console.log(`[USA] ⚠ No dataset results, using Groq advisory fallback`);
    throw new Error("empty_result");

  } catch (err) {
    const errMsg = (err.stderr || err.error?.message || err.message || "").toString();
    console.error(`[USA] Error:\n${errMsg.slice(0, 800)}`);

    try {
      const msg = await generateFallbackResponse(description, "USA");
      return res.status(404).json({ error: "no_match", message: msg, originalQuery: description, country: "USA" });
    } catch {
      return res.status(404).json({
        error: "no_match",
        message: "No supplements found. Please try different keywords or consult a healthcare provider.",
        originalQuery: description,
        country: "USA",
      });
    }
  }
});

// ── GET /run-india/:age/:description  (India supplement database) ─────────────
app.get("/run-india/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  console.log(`[India] Searching dataset: "${description}"`);

  try {
    const stdout = await runPython(
      ["india_check.py", age, description, "none"],
      { maxBuffer: 1024 * 1024 * 2 }
    );
    const result = parsePythonResult(stdout);

    if (result) {
      console.log(`[India] ✅ Dataset hit – ${result.data.length} results`);
      result._meta = { originalQuery: description, country: "India" };
      return res.json(result);
    }

    // Dataset found nothing — use Groq advisory as fallback
    console.log(`[India] ⚠ No dataset results, using Groq advisory fallback`);
    throw new Error("empty_result");

  } catch (err) {
    const errMsg = (err.stderr || err.error?.message || err.message || "").toString();
    console.error(`[India] Error:\n${errMsg.slice(0, 800)}`);

    try {
      const msg = await generateFallbackResponse(description, "India");
      return res.status(404).json({ error: "no_match", message: msg, originalQuery: description, country: "India" });
    } catch {
      return res.status(404).json({
        error: "no_match",
        message: "No supplements found. Please try different keywords or consult a healthcare provider.",
        originalQuery: description,
        country: "India",
      });
    }
  }
});

// ── POST /run-python-advanced ─────────────────────────────────────────────────
app.post("/run-python-advanced", async (req, res) => {
  let { age = "Adult", description = "", allergies = "", country = "USA" } = req.body;

  if (!description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  age = age.charAt(0).toUpperCase() + age.slice(1);
  const isIndia = country === "India";

  const args = isIndia
    ? ["india_check.py", age, description, allergies || "none"]
    : ["check.py", age, "Vega", "False", description, allergies || "none"];

  try {
    const stdout = await runPython(args);
    const result = parsePythonResult(stdout);

    if (result) {
      result._meta = { originalQuery: description, country };
      return res.json(result);
    }
    throw new Error("empty_result");
  } catch (err) {
    try {
      const msg = await generateFallbackResponse(description, country);
      return res.status(404).json({ error: "no_match", message: msg, country });
    } catch {
      return res.status(404).json({ error: "no_match", message: "No supplements found.", country });
    }
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
