import mongoose from "mongoose";
const FileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    language: { type: String, default: "javascript" },
    // Persisted Yjs doc state (binary)
    ydocState: { type: Buffer, default: null },
    // Plain text fallback (for listing/preview only)
    contentPreview: { type: String, default: "" },
  },
  { timestamps: true }
);
export default mongoose.model("File", FileSchema);
