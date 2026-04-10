const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { execFile } = require("child_process");
const Groq = require("groq-sdk");

const app = express();
const port = process.env.PORT || 3001;

// ── Groq client ───────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes     = require("./routes/auth");
const userRoutes     = require("./routes/user");
const questionRoutes = require("./routes/question");

app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/questions", questionRoutes);

// ── Helper: Normalize any user input into medical terminology via Groq ─────────
async function normalizeHealthInput(description, rawAllergies = "none") {
  const response = await groq.chat.completions.create({
    model: "llama3-70b-8192",
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
- Normalize user allergy text to standard food allergen names (fish, peanuts, dairy, wheat, soy, eggs, shellfish, tree nuts, sesame, mustard)
- If no allergies mentioned, return []
- If description is gibberish or totally irrelevant, use "general health, immune support"`,
      },
    ],
  });

  const raw   = response.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Helper: Fallback Groq response when dataset has no match ──────────────────
async function generateFallbackResponse(originalDescription) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 250,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful health supplement advisor. Keep responses brief, friendly, and always recommend consulting a healthcare provider.",
      },
      {
        role: "user",
        content: `A user searched for supplement recommendations with: "${originalDescription}".
Our database had no exact matches. In 2-3 sentences, mention what types of supplements are generally associated with their need, and suggest they consult a healthcare provider. Do NOT recommend specific brands or exact dosages.`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// ── GET /run-python/:age/:description ─────────────────────────────────────────
app.get("/run-python/:age/:description", async (req, res) => {
  let { age, description } = req.params;

  description = decodeURIComponent(description);
  age = age.charAt(0).toUpperCase() + age.slice(1);

  let medicalDescription  = description;
  let normalizedAllergies = "none";

  // Step 1: Normalize with Groq
  try {
    const normalized = await normalizeHealthInput(description, "none");
    medicalDescription  = normalized.medicalDescription || description;
    normalizedAllergies =
      Array.isArray(normalized.normalizedAllergies) && normalized.normalizedAllergies.length > 0
        ? normalized.normalizedAllergies.join(",")
        : "none";

    console.log(`[Groq] Original:   "${description}"`);
    console.log(`[Groq] Normalized: "${medicalDescription}"`);
    console.log(`[Groq] Allergies:  "${normalizedAllergies}"`);
  } catch (normError) {
    console.warn("[Groq] Normalization failed, using raw input:", normError.message);
  }

  // Step 2: Run Python NER pipeline
  execFile(
    "python",
    ["check.py", age, "Vega", "False", medicalDescription, normalizedAllergies],
    { maxBuffer: 1024 * 1024 * 5 },
    async (error, stdout, stderr) => {
      if (error) {
        console.error("[Python] Error:", stderr || error.message);

        // Step 3: Groq fallback if NER / dataset fails
        try {
          const fallbackMsg = await generateFallbackResponse(description);
          return res.status(404).json({
            error:           "no_match",
            message:         fallbackMsg,
            originalQuery:   description,
            normalizedQuery: medicalDescription,
          });
        } catch (fbError) {
          console.error("[Groq] Fallback also failed:", fbError.message);
          return res.status(404).json({
            error:         "no_match",
            message:       "We couldn't find supplements matching your specific needs. Please consult a healthcare provider for personalized recommendations.",
            originalQuery: description,
          });
        }
      }

      // Step 4: Parse & return Python result
      try {
        const result = JSON.parse(stdout);

        result._meta = {
          originalQuery:     description,
          normalizedQuery:   medicalDescription,
          allergiesDetected: normalizedAllergies !== "none" ? normalizedAllergies.split(",") : [],
        };

        res.json(result);
      } catch (parseError) {
        console.error("[Parse] Error:", parseError.message, "| Output:", stdout.slice(0, 200));
        try {
          const fallbackMsg = await generateFallbackResponse(description);
          return res.status(500).json({
            error:         "parse_error",
            message:       fallbackMsg,
            originalQuery: description,
          });
        } catch {
          return res.status(500).json({ error: "Internal Server Error" });
        }
      }
    }
  );
});

// ── POST /run-python-advanced (allergies passed explicitly in body) ───────────
app.post("/run-python-advanced", async (req, res) => {
  let { age = "Adult", description = "", allergies = "" } = req.body;

  if (!description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  age = age.charAt(0).toUpperCase() + age.slice(1);

  let medicalDescription  = description;
  let normalizedAllergies = "none";

  try {
    const normalized = await normalizeHealthInput(description, allergies);
    medicalDescription = normalized.medicalDescription || description;

    // Merge Groq-detected + manually provided allergies
    const groqAllergies   = normalized.normalizedAllergies || [];
    const manualAllergies = allergies
      ? allergies.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)
      : [];
    const allAllergies = [...new Set([...groqAllergies, ...manualAllergies])];
    normalizedAllergies = allAllergies.length > 0 ? allAllergies.join(",") : "none";

    console.log(`[Groq Advanced] Normalized: "${medicalDescription}"`);
    console.log(`[Groq Advanced] Allergies:  "${normalizedAllergies}"`);
  } catch (err) {
    console.warn("[Groq Advanced] Normalization failed:", err.message);
  }

  execFile(
    "python",
    ["check.py", age, "Vega", "False", medicalDescription, normalizedAllergies],
    { maxBuffer: 1024 * 1024 * 5 },
    async (error, stdout, stderr) => {
      if (error) {
        console.error("[Python Advanced] Error:", stderr || error.message);
        try {
          const fallbackMsg = await generateFallbackResponse(description);
          return res.status(404).json({ error: "no_match", message: fallbackMsg });
        } catch {
          return res.status(404).json({ error: "no_match", message: "No supplements found." });
        }
      }

      try {
        const result = JSON.parse(stdout);
        result._meta = {
          originalQuery:     description,
          normalizedQuery:   medicalDescription,
          allergiesDetected: normalizedAllergies !== "none" ? normalizedAllergies.split(",") : [],
        };
        res.json(result);
      } catch {
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
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

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(port, () => console.log(`SERVER IS RUNNING ON PORT ${port}`));

module.exports = app;