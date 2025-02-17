import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Derive __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Folder for temporary files
const uploadsFolder = path.join(__dirname, "../uploads");

// Function to clean up old files
const cleanUpFolder = async () => {
  try {
    const now = Date.now();
    const maxFileAge = 4 * 60 * 1000; // 4 minutes in milliseconds

    console.log("Starting cleanup...");

    // Read files in the folder
    const files = await fs.readdir(uploadsFolder);

    if (files.length === 0) {
      console.log("No files to clean up.");
      return; // Exit if no files are found
    }

    for (const file of files) {
      const filePath = path.join(uploadsFolder, file);

      try {
        // Get file stats
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs; // Age of the file in milliseconds

        if (fileAge > maxFileAge) {
          // Delete files older than 4 minutes
          await fs.unlink(filePath);
          console.log(`Deleted file: ${file}`);
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
      }
    }
  } catch (err) {
    console.error("Error cleaning up folder:", err);
  }
};

export default cleanUpFolder