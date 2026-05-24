const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { execFile } = require("child_process");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const port = process.env.PORT || 3001;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// CORS — allow localhost in dev and production frontend URL in prod
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CLIENT_URL,        // set this on Render to your Vercel URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // In production allow any Vercel/Netlify preview URL
    if (origin.endsWith(".vercel.app") || origin.endsWith(".netlify.app")) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

const authRoutes     = require("./routes/auth");
const userRoutes     = require("./routes/user");
const questionRoutes = require("./routes/question");

app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/questions", questionRoutes);

// ── Helper: promisified execFile ───────────────────────────────────────────────
function runPython(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "python",
      args,
      { cwd: path.join(__dirname), maxBuffer: 1024 * 1024 * 5, ...options },
      (error, stdout, stderr) => {
        if (error) return reject({ error, stderr });
        resolve(stdout);
      }
    );
  });
}

// ── Helper: Normalize user input into medical terms via Groq (fallback only) ──
async function normalizeHealthInput(description, rawAllergies = "none") {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 400,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a medical terminology assistant for a supplement recommendation system. " +
          "You ONLY respond with valid JSON. No markdown, no explanation, no extra text — just the raw JSON object.",
      },
      {
        role: "user",
        content: `Convert the user health description and allergy info below into structured medical language.

User description: "${description}"
User allergies: "${rawAllergies}"

Return ONLY this JSON (no extra text whatsoever):
{
  "medicalDescription": "<rewritten using clinical/medical terms>",
  "normalizedAllergies": ["<standardized allergy names>"]
}

Conversion examples:
- "tired all the time"   -> "chronic fatigue, low energy"
- "weak bones"           -> "osteoporosis risk, calcium deficiency"
- "bad memory"           -> "cognitive impairment, memory loss"
- "want more energy"     -> "fatigue, low stamina"
- "build muscle"         -> "muscle recovery, protein deficiency"
- "better focus"         -> "cognitive function, concentration impairment"
- "heart health"         -> "cardiovascular health, cardiac support"
- "immune boost"         -> "immune deficiency, immune system support"
- "sleep better"         -> "insomnia, sleep disorder"
- "lose weight"          -> "obesity management, metabolic support"
- "hair loss"            -> "alopecia, biotin deficiency"
- "joint pain"           -> "arthritis, joint inflammation"
- "anxiety / stress"     -> "anxiety disorder, stress management"
- "skin problems"        -> "dermatitis, skin inflammation"
- "gut health"           -> "gastrointestinal disorder, digestive health"
- "eye health"           -> "macular degeneration risk, vision support"

Allergy normalization:
- Normalize to standard food allergen names (fish, peanuts, dairy, wheat, soy, eggs, shellfish, tree nuts, sesame)
- If no allergies mentioned, return []`,
      },
    ],
  });

  const raw   = response.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Helper: Groq fallback advisory message ────────────────────────────────────
async function generateFallbackResponse(originalDescription, country = "USA") {
  const countryContext = country === "India"
    ? "Focus on well-known Indian Ayurvedic and nutraceutical brands like Himalaya, Dabur, Patanjali, or MuscleBlaze."
    : "Focus on internationally available supplements.";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: "You are a helpful health supplement advisor. Keep responses brief, friendly, and always recommend consulting a healthcare provider.",
      },
      {
        role: "user",
        content: `A user searched for supplement recommendations with: "${originalDescription}".
Our database had no exact matches. ${countryContext}
In 2-3 sentences, mention what types of supplements are generally associated with their need, and suggest they consult a healthcare provider. Do NOT recommend specific dosages.`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// ── Helper: parse Python stdout into a usable result ──────────────────────────
// Strips any non-JSON prefix (NLTK download messages, "Device set to use cpu", etc.)
// before parsing — these lines are printed to stdout by transformers/nltk even though
// they should go to stderr.
function parsePythonResult(stdout) {
  // Find the first { or [ — real JSON always starts there
  const jsonStart = stdout.search(/[{[]/);
  if (jsonStart === -1) return null;

  const jsonStr = stdout.slice(jsonStart).trim();
  const result  = JSON.parse(jsonStr);

  // India format: { type:"india", data:[...], count:N }
  if (result.type === "india") {
    return result.data && result.data.length > 0 ? result : null;
  }
  // USA pandas split format: { columns:[...], data:[[...]] }
  if (result.data && Array.isArray(result.data) && result.data.length > 0) {
    return result;
  }
  return null;
}

// ── GET /run-python/:age/:description  (USA – NIH DSLD) ──────────────────────
//
//  Flow:
//    1. Search dataset with RAW description
//    2. If results → return them  (Groq never called)
//    3. If nothing → normalize with Groq → search again
//    4. If still nothing → Groq fallback advisory message
//
app.get("/run-python/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  // ── Step 1: Search dataset with raw description ──────────────────────────
  console.log(`[USA] Step 1 – raw search: "${description}"`);
  try {
    const stdout = await runPython(
      ["check.py", age, "Vega", "False", description, "none"]
    );
    const result = parsePythonResult(stdout);
    if (result) {
      console.log(`[USA] Raw search hit – returning results`);
      result._meta = { originalQuery: description, normalizedQuery: description, allergiesDetected: [], country: "USA" };
      return res.json(result);
    }
    console.log(`[USA] Raw search empty – description didn't match CSV data. Trying Groq normalization…`);
  } catch (rawErr) {
    const errMsg = rawErr.stderr || rawErr.error?.message || "";
    if (errMsg.includes("CSV file not found") || errMsg.includes("No module named")) {
      console.warn(`[USA] ⚠ NIH CSV files missing or Python deps not installed. USA mode needs DSLD CSVs in server/. Falling back to Groq advisory.`);
    } else {
      console.warn(`[USA] Raw search failed: ${errMsg}`);
    }
  }

  // ── Step 2: Normalize with Groq, then retry dataset ──────────────────────
  let medicalDescription = description;
  let normalizedAllergies = "none";

  try {
    const normalized = await normalizeHealthInput(description, "none");
    medicalDescription  = normalized.medicalDescription || description;
    normalizedAllergies =
      Array.isArray(normalized.normalizedAllergies) && normalized.normalizedAllergies.length > 0
        ? normalized.normalizedAllergies.join(",")
        : "none";
    console.log(`[USA] Step 2 – normalized: "${medicalDescription}"`);
  } catch (normErr) {
    console.warn(`[USA] Groq normalization failed: ${normErr.message}`);
  }

  try {
    const stdout = await runPython(
      ["check.py", age, "Vega", "False", medicalDescription, normalizedAllergies]
    );
    const result = parsePythonResult(stdout);
    if (result) {
      console.log(`[USA] Normalized search hit – returning results`);
      result._meta = {
        originalQuery:     description,
        normalizedQuery:   medicalDescription,
        allergiesDetected: normalizedAllergies !== "none" ? normalizedAllergies.split(",") : [],
        country:           "USA",
      };
      return res.json(result);
    }
    console.log(`[USA] Normalized search also empty, falling back to Groq advisory`);
  } catch (normErr) {
    console.warn(`[USA] Normalized search failed: ${normErr.stderr || normErr.error?.message}`);
  }

  // ── Step 3: Groq advisory fallback ────────────────────────────────────────
  try {
    const fallbackMsg = await generateFallbackResponse(description, "USA");
    return res.status(404).json({
      error: "no_match", message: fallbackMsg,
      originalQuery: description, normalizedQuery: medicalDescription,
    });
  } catch {
    return res.status(404).json({
      error: "no_match",
      message: "We couldn't find supplements matching your needs. Please consult a healthcare provider.",
      originalQuery: description,
    });
  }
});

// ── GET /run-india/:age/:description  (India supplement database) ─────────────
//
//  Flow:
//    1. Search India dataset with RAW description
//    2. If results → return them  (Groq never called)
//    3. If nothing → normalize with Groq → search again
//    4. If still nothing → Groq fallback advisory message
//
app.get("/run-india/:age/:description", async (req, res) => {
  let { age, description } = req.params;
  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  // ── Step 1: Search India dataset with raw description ────────────────────
  console.log(`[India] Step 1 – raw search: "${description}"`);
  try {
    const stdout = await runPython(
      ["india_check.py", age, description, "none"],
      { maxBuffer: 1024 * 1024 * 2 }
    );
    const result = parsePythonResult(stdout);
    if (result) {
      console.log(`[India] ✅ Dataset hit – returning ${result.data.length} results (no AI used)`);
      result._meta = { originalQuery: description, normalizedQuery: description, allergiesDetected: [], country: "India" };
      return res.json(result);
    }
    console.log(`[India] Dataset returned empty. Trying Groq normalization as fallback…`);
  } catch (rawErr) {
    console.warn(`[India] Dataset search failed: ${rawErr.stderr || rawErr.error?.message}`);
  }

  // ── Step 2: Normalize with Groq, then retry India dataset ────────────────
  let medicalDescription = description;
  let normalizedAllergies = "none";

  try {
    const normalized = await normalizeHealthInput(description, "none");
    medicalDescription  = normalized.medicalDescription || description;
    normalizedAllergies =
      Array.isArray(normalized.normalizedAllergies) && normalized.normalizedAllergies.length > 0
        ? normalized.normalizedAllergies.join(",")
        : "none";
    console.log(`[India] Step 2 – normalized: "${medicalDescription}"`);
  } catch (normErr) {
    console.warn(`[India] Groq normalization failed: ${normErr.message}`);
  }

  try {
    const stdout = await runPython(
      ["india_check.py", age, medicalDescription, normalizedAllergies],
      { maxBuffer: 1024 * 1024 * 2 }
    );
    const result = parsePythonResult(stdout);
    if (result) {
      console.log(`[India] Normalized search hit – returning ${result.data.length} results`);
      result._meta = {
        originalQuery:     description,
        normalizedQuery:   medicalDescription,
        allergiesDetected: normalizedAllergies !== "none" ? normalizedAllergies.split(",") : [],
        country:           "India",
      };
      return res.json(result);
    }
    console.log(`[India] Normalized search also empty, falling back to Groq advisory`);
  } catch (normSearchErr) {
    console.warn(`[India] Normalized search failed: ${normSearchErr.stderr || normSearchErr.error?.message}`);
  }

  // ── Step 3: Groq advisory fallback ────────────────────────────────────────
  try {
    const fallbackMsg = await generateFallbackResponse(description, "India");
    return res.status(404).json({
      error: "no_match", message: fallbackMsg,
      originalQuery: description, normalizedQuery: medicalDescription,
      country: "India",
    });
  } catch {
    return res.status(404).json({
      error: "no_match",
      message: "No Indian supplements found for your query. Please consult a healthcare provider.",
      country: "India",
    });
  }
});

// ── POST /run-python-advanced  (explicit allergies in body, country-aware) ────
//
//  Same dataset-first logic, allergies passed explicitly.
//
app.post("/run-python-advanced", async (req, res) => {
  let { age = "Adult", description = "", allergies = "", country = "USA" } = req.body;

  if (!description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  age = age.charAt(0).toUpperCase() + age.slice(1);
  const isIndia = country === "India";
  const scriptBase = isIndia ? "india_check.py" : "check.py";

  const rawArgs = isIndia
    ? [scriptBase, age, description, allergies || "none"]
    : [scriptBase, age, "Vega", "False", description, allergies || "none"];

  // Step 1: raw search
  try {
    const stdout = await runPython(rawArgs);
    const result = parsePythonResult(stdout);
    if (result) {
      result._meta = { originalQuery: description, normalizedQuery: description, allergiesDetected: [], country };
      return res.json(result);
    }
  } catch (_) { /* fall through to normalization */ }

  // Step 2: normalize and retry
  let medicalDescription = description;
  let normalizedAllergies = allergies || "none";

  try {
    const normalized = await normalizeHealthInput(description, allergies);
    medicalDescription = normalized.medicalDescription || description;

    const groqAllergies   = normalized.normalizedAllergies || [];
    const manualAllergies = allergies
      ? allergies.split(",").map(a => a.trim().toLowerCase()).filter(Boolean)
      : [];
    const merged = [...new Set([...groqAllergies, ...manualAllergies])];
    normalizedAllergies = merged.length > 0 ? merged.join(",") : "none";
  } catch (_) { /* keep raw values */ }

  const normArgs = isIndia
    ? [scriptBase, age, medicalDescription, normalizedAllergies]
    : [scriptBase, age, "Vega", "False", medicalDescription, normalizedAllergies];

  try {
    const stdout = await runPython(normArgs);
    const result = parsePythonResult(stdout);
    if (result) {
      result._meta = {
        originalQuery: description,
        normalizedQuery: medicalDescription,
        allergiesDetected: normalizedAllergies !== "none" ? normalizedAllergies.split(",") : [],
        country,
      };
      return res.json(result);
    }
  } catch (_) { /* fall through to Groq fallback */ }

  // Step 3: Groq fallback
  try {
    const fallbackMsg = await generateFallbackResponse(description, country);
    return res.status(404).json({ error: "no_match", message: fallbackMsg, country });
  } catch {
    return res.status(404).json({ error: "no_match", message: "No supplements found.", country });
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
  .catch((error) => console.log(`DB Failed To Connect: ${error}`));

app.listen(port, () => console.log(`SERVER IS RUNNING ON PORT ${port}`));

module.exports = app;
