# Fork & Forchetta – API

**EN (English)**  
Node.js + Express + MongoDB (Mongoose). Image upload with `multer`. Search + pagination. CORS allow-list.

**IT (Italiano)**  
Node.js + Express + MongoDB (Mongoose). Upload immagini con `multer`. Ricerca + paginazione. CORS con lista consentita.

---

## Live
- **API (Render):** https://fork-forchetta-api.onrender.com  
- **Web (Vercel):** https://fork-forchetta-web.vercel.app

## Features / Funzionalità
- CRUD for recipes (title, ingredients[], optional image)
- Search + pagination: `GET /recipes?search=...&page=1&limit=8`
- Image upload: `multipart/form-data` field `image`
- CORS allow-list via environment variable

## Local setup / Avvio locale
```bash
git clone <THIS-REPO-URL>
cd fork-forchetta-api
npm install
cp .env.example .env   # fill / compila
npm start               # http://localhost:5000
