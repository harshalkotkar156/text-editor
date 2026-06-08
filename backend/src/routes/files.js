import { Router } from "express";
import File from "../models/File.js";

const r = Router();

r.get("/", async (_, res) => {
  const files = await File.find({}, { ydocState: 0 }).sort({ updatedAt: -1 });
  res.json(files);
});

r.post("/", async (req, res) => {
  const { name, language } = req.body;
  const file = await File.create({ name, language: language || "javascript" });
  res.json(file);
});

r.get("/:id", async (req, res) => {
  const f = await File.findById(req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  res.json(f);
});

export default r;
