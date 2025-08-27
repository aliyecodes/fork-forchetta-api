require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

const Recipe = require("./models/Recipe");

const app = express();
const allowList = (process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/postman vb.
    if (allowList.includes("*") || allowList.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing. Check .env");
  process.exit(1);
}
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get("/", (_req, res) => {
  res.send("API is working!");
});

/**
 * LIST (search + pagination)
 * GET /recipes?search=...&page=1&limit=8
 * 'q' alias'ını da kabul eder.
 * Not: 'pages' VE 'totalPages' alanlarını birlikte döndürüyoruz (frontend uyumu için).
 */
app.get("/recipes", async (req, res) => {
  try {
    const q = (req.query.search || req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "8", 10)));

    // Güvenli regex
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q
      ? {
          $or: [
            { title: { $regex: esc(q), $options: "i" } },
            { ingredients: { $elemMatch: { $regex: esc(q), $options: "i" } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      Recipe.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Recipe.countDocuments(filter),
    ]);
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items,
      page,
      limit,
      total,
      pages,          // <-- bizim kullandığımız
      totalPages: pages, // <-- eski/kod varyantı için uyumluluk
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/** GET one by id */
app.get("/recipes/:id", async (req, res) => {
  try {
    const doc = await Recipe.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Invalid id" });
  }
});

/** CREATE (JSON veya multipart/form-data 'image' ile) */
app.post("/recipes", upload.single("image"), async (req, res) => {
  try {
    let { title, ingredients } = req.body;

    if (typeof ingredients === "string") {
      ingredients = ingredients.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof title !== "string" || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "Invalid payload: title and ingredients[] required" });
    }

    const base = `${req.protocol}://${req.get("host")}`;
    const imageUrl = req.file ? `${base}/uploads/${req.file.filename}` : "";

    const created = await Recipe.create({
      title: title.trim(),
      ingredients,
      imageUrl,
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create failed" });
  }
});

/** UPDATE */
app.put("/recipes/:id", upload.single("image"), async (req, res) => {
  try {
    let { title, ingredients } = req.body;

    if (typeof ingredients === "string") {
      ingredients = ingredients.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof title !== "string" || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "Invalid payload: title and ingredients[] required" });
    }

    const update = { title: title.trim(), ingredients };
    if (req.file) {
      const base = `${req.protocol}://${req.get("host")}`;
      update.imageUrl = `${base}/uploads/${req.file.filename}`;
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

/** DELETE */
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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
