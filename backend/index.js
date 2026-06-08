import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import connectDB  from "./src/config/db.js";
import { makeRedis } from "./src/config/redis.js";
import filesRoute from "./src/routes/files.js";
import { attachSocket } from "./src/socket.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());
app.use("/api/files", filesRoute);
app.get("/health", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  const pub = makeRedis(process.env.REDIS_URL);
  const sub = makeRedis(process.env.REDIS_URL);
  attachSocket(server, pub, sub, process.env.CLIENT_ORIGIN);
  server.listen(process.env.PORT, () =>
    console.log(`API on http://localhost:${process.env.PORT}`)
  );
};
start();
