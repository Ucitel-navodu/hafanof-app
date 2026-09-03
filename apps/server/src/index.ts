import express from "express";
import cors from "cors";
import path from "node:path";
import { migrate } from "./db/schema";
import authRoutes from "./routes/auth";
import dogRoutes from "./routes/dogs";
import coordinatorRoutes from "./routes/coordinator";
import fosterRoutes from "./routes/foster";
import storyRoutes from "./routes/stories";
import patronRoutes from "./routes/patron";
import adopterRoutes from "./routes/adopter";
import uploadRoutes from "./routes/uploads";

migrate();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/dogs", dogRoutes);
app.use("/api/coordinator", coordinatorRoutes);
app.use("/api/foster", fosterRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/patron", patronRoutes);
app.use("/api/adopter", adopterRoutes);
app.use("/api/uploads", uploadRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Hafanof API listening on http://localhost:${PORT}`);
});
