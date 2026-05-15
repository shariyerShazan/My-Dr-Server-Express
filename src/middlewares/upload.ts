import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure the directories exist
const uploadDocsDir = path.join(process.cwd(), "uploads", "docs");
const uploadProfilesDir = path.join(process.cwd(), "uploads", "profiles");

[uploadDocsDir, uploadProfilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "profilePic") {
      cb(null, uploadProfilesDir);
    } else {
      cb(null, uploadDocsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
