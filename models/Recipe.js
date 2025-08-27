const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    ingredients: {
      type: [String],
      required: true,
      validate: v => Array.isArray(v) && v.filter(Boolean).length > 0
    },
    imageUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", recipeSchema);
