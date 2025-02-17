import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File Storage
const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    if (file) {
      const filename = randomUUID() + path.extname(file.originalname);
      file.filename = filename; 
      cb(null, filename);
    } else {
      cb(null, false);
    }
  },
});

// Middleware for file upload
const fileUpload = multer({
  storage: fileStorage,
  fileFilter: function (req, file, cb) {
    // Allow only images and videos
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video files are allowed!"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

export default fileUpload;
