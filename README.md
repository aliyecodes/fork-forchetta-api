🇬🇧 Fork & Forchetta – API

[![Render](https://img.shields.io/badge/Backend-Render-4b9)](https://fork-forchetta-api.onrender.com)
[![MongoDB](https://img.shields.io/badge/DB-MongoDB-4faa41)](#)

**Healthcheck:** `GET /healthz` → returns `{ ok: true, mongo: "connected", uptime: ... }`

A Node.js + Express + MongoDB backend for the Fork & Forchetta recipe manager.
Includes image upload via Cloudinary, search, pagination, and secure CORS configuration.

🚀 Live

API (Render): https://fork-forchetta-api.onrender.com

Frontend (Vercel): https://fork-forchetta-web.vercel.app

✨ Features

Full CRUD for recipes (title, ingredients[], optional image)

Search & pagination with query parameters (?search=...&page=1&limit=8)

Image upload via Cloudinary

- multer-storage-cloudinary

CORS allow-list via environment variable

Environment variables managed with .env

🛠️ Tech Stack

Node.js

- Express

MongoDB Atlas
with Mongoose

Multer

- Cloudinary
  for file uploads

⚡ Local Setup

- git clone https://github.com/aliyecodes/fork-forchetta-api.git
- cd fork-forchetta-api
- npm install
- cp .env.example .env
- npm start

🇮🇹 Fork & Forchetta – API

Backend Node.js + Express + MongoDB per il progetto Fork & Forchetta.
Include upload di immagini con Cloudinary, ricerca, paginazione e configurazione CORS sicura.

🚀 Live

API (Render): https://fork-forchetta-api.onrender.com

Frontend (Vercel): https://fork-forchetta-web.vercel.app

✨ Funzionalità

CRUD completo per le ricette (titolo, ingredienti[], immagine opzionale)

Ricerca e paginazione con parametri (?search=...&page=1&limit=8)

Upload immagini tramite Cloudinary

- multer-storage-cloudinary

Lista consentita CORS tramite variabile d’ambiente

Variabili d’ambiente gestite con .env

🛠️ Stack Tecnologico

Node.js

- Express

MongoDB Atlas
con Mongoose

Multer

- Cloudinary
  per l’upload delle immagini

⚡ Avvio Locale

- git clone https://github.com/aliyecodes/fork-forchetta-api.git
- cd fork-forchetta-api
- npm install
- cp .env.example .env
- npm start
