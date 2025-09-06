const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.setTimeout(120000);

let app;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongo.getUri();
  process.env.ALLOWED_ORIGIN = "*";
  process.env.CLOUDINARY_CLOUD_NAME = "test";
  process.env.CLOUDINARY_API_KEY = "test";
  process.env.CLOUDINARY_API_SECRET = "test";

  app = require("../index");

  if (mongoose.connection.readyState !== 1) {
    await new Promise((res) => mongoose.connection.once("open", res));
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (_) {}
  if (mongo && typeof mongo.stop === "function") {
    await mongo.stop();
  }
});

test("GET /healthz", async () => {
  const res = await request(app).get("/healthz");
  expect(res.statusCode).toBe(200);
  expect(res.body.ok).toBe(true);
});

test("CRUD happy path", async () => {
  const create = await request(app)
    .post("/recipes")
    .field("title", "Carbonara")
    .field("ingredients", JSON.stringify(["spaghetti", "egg", "pecorino"]))
    .field("instructions", "Boil pasta...");
  expect(create.statusCode).toBe(201);
  const id = create.body._id;

  const list = await request(app).get("/recipes?page=1&limit=8");
  expect(list.statusCode).toBe(200);
  expect(Array.isArray(list.body.items)).toBe(true);
  expect(list.body.items.length).toBe(1);

  const upd = await request(app)
    .put(`/recipes/${id}`)
    .field("title", "Carbonara (updated)")
    .field(
      "ingredients",
      JSON.stringify(["spaghetti", "egg", "pecorino", "guanciale"])
    );
  expect(upd.statusCode).toBe(200);
  expect(upd.body.title).toMatch(/updated/i);

  const del = await request(app).delete(`/recipes/${id}`);
  expect(del.statusCode).toBe(200);
});
