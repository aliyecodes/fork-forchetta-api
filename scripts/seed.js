require("dotenv").config();
const mongoose = require("mongoose");
const Recipe = require("../models/Recipe");

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI missing");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected");

    await Recipe.deleteMany({}); // temiz başla

    await Recipe.insertMany([
      {
        title: "Tiramisù",
        ingredients: ["300 g di savoiardi", "3 uova (tuorli + albumi montati)", "250 g di mascarpone", "300 ml di caffè espresso freddo", "80 g di zucchero", "Cacao amaro q.b."],
        instructions:
          "Monta i tuorli con lo zucchero fino a ottenere una crema chiara e spumosa. Aggiungi il mascarpone e mescola bene. Monta a neve gli albumi e incorporali delicatamente alla crema. Intingi velocemente i savoiardi nel caffè e disponili in una pirofila. Copri con uno strato di crema, poi continua alternando savoiardi e crema. Termina con crema e spolvera di cacao amaro. Lascia riposare in frigo almeno 3 ore prima di servire.",
        imageUrl:
          "https://res.cloudinary.com/dn9qbyrje/image/upload/v1756830340/forchetta/k7lh95sf0a5mm9a4vx0k.webp"
      },
      {
        title: "Carbonara",
        ingredients: ["200 g di spaghetti", "2 uova (solo i tuorli)", "80 g di guanciale", "40 g di pecorino romano grattugiato", "Pepe nero q.b."],
        instructions:
          "Cuoci gli spaghetti in acqua salata. Rosola il guanciale a cubetti fino a renderlo croccante. Sbatti i tuorli con il pecorino e abbondante pepe. Scola la pasta al dente, unisci al guanciale e togli dal fuoco. Aggiungi la crema di uova e pecorino, mescola velocemente. Servi subito con altro pecorino e pepe.",
        imageUrl:
          "https://res.cloudinary.com/dn9qbyrje/image/upload/v1756830424/forchetta/jgpxveltmrpefdli3uzl.jpg"
      }
    ]);

    console.log("🌱 Seed done");
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("❌ Seed error:", e);
    process.exit(1);
  }
})();
