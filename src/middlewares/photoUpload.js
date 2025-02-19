import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Photo Storage
const photoStorage = multer.diskStorage({
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

// Photo Upload Middleware
const photoUpload = multer({
  storage: photoStorage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {      
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 1 megabyte
});

export default photoUpload;
