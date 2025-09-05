require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const rateLimit = require("express-rate-limit");

const { z } = require("zod");

const Recipe = require("./models/Recipe");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests,please try again later." },
});

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "forchetta",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, crop: "limit" }],
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const RecipePayload = z.object({
  title: z.string().trim().min(1).max(120),
  ingredients: z.array(z.string().trim().min(1)).min(1).max(50),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
});

function normalizeAndValidate(req) {
  let { title, ingredients, instructions } = req.body;
  if (typeof ingredients === "string") {
    try {
      const parsed = JSON.parse(ingredients);
      ingredients = Array.isArray(parsed)
        ? parsed
        : String(ingredients)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    } catch {
      ingredients = String(ingredients)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  const parsed = RecipePayload.safeParse({ title, ingredients, instructions });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  return { value: parsed.data };
}

const allowList = (process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowList.includes("*") || allowList.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing. Check .env");
  process.exit(1);
}
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(limiter);

app.get("/", (_req, res) => res.send("API is working!"));

app.get("/healthz", (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    mongo: mongoOk ? "up" : "down",
    cloudinary: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.get("/recipes", async (req, res) => {
  try {
    const q = (req.query.search || req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit || "8", 10))
    );

    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q
      ? {
          $or: [
            { title: { $regex: esc(q), $options: "i" } },
            { ingredients: { $elemMatch: { $regex: esc(q), $options: "i" } } },
            { instructions: { $regex: esc(q), $options: "i" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      Recipe.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Recipe.countDocuments(filter),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({ items, page, limit, total, pages, totalPages: pages });
  } catch (e) {
    console.error("GET /recipes error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/recipes/:id", async (req, res) => {
  try {
    const doc = await Recipe.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Invalid id" });
  }
});

function normalizeIngredients(input) {
  if (Array.isArray(input))
    return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input === "string") {
    try {
      const maybe = JSON.parse(input);
      if (Array.isArray(maybe))
        return maybe.map((s) => String(s).trim()).filter(Boolean);
    } catch (_) {}
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

app.post("/recipes", upload.single("image"), async (req, res) => {
  try {
    const result = normalizeAndValidate(req);
    if (result.error) {
      return res
        .status(400)
        .json({ error: "ValidationError", details: result.error });
    }
    const { title, ingredients, instructions } = result.value;

    // Cloudinary storage'da req.file.path zaten tam URL; local olsaydı base eklerdik
    const imageUrl = req.file?.path || req.file?.secure_url || "";

    const created = await Recipe.create({
      title,
      ingredients,
      instructions: instructions || "",
      imageUrl,
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create failed" });
  }
});

app.put("/recipes/:id", upload.single("image"), async (req, res) => {
  try {
    const result = normalizeAndValidate(req);
    if (result.error) {
      return res
        .status(400)
        .json({ error: "ValidationError", details: result.error });
    }
    const { title, ingredients, instructions } = result.value;

    const update = { title, ingredients, instructions: instructions || "" };
    if (req.file?.path || req.file?.secure_url) {
      update.imageUrl = req.file.path || req.file.secure_url;
    }

    const updated = await Recipe.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid id" });
  }
});

app.delete("/recipes/:id", async (req, res) => {
  try {
    const removed = await Recipe.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: "Not found" });
    res.json(removed);
  } catch (e) {
    res.status(400).json({ error: "Invalid id" });
  }
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

module.exports = app;

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error:
        "File too large. Max 5MB allowed. / File troppo grande. Massimo 5 MB consentiti.",
    });
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
  });
});
