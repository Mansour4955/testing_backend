import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary upload image
export const cloudinaryUploadImage = async (imageUpload) => {
  try {
    if (!imageUpload.mimetype.startsWith("image")) {
      throw new Error("Invalid file type. Only images are allowed.");
    }
    console.log("imageUpload.path: ", imageUpload.path);

    const data = await cloudinary.uploader.upload(imageUpload.path, {
      resource_type: "image",
      format: "webp", // Convert image to WebP
      quality: "auto", // Auto optimize quality
    });
    try {
      fs.unlinkSync(imageUpload.path);
      console.log("File deleted:", imageUpload.path);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
    return data;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Cloudinary upload media (images or videos)
export const cloudinaryUploadMedia = async (fileToUpload) => {
  try {
    const resourceType = fileToUpload.mimetype.startsWith("video")
      ? "video"
      : fileToUpload.mimetype.startsWith("image")
      ? "image"
      : null;
    if (resourceType === null) {
      throw new Error("Invalid file type. Only images or videos are allowed.");
    }
    const options =
      resourceType === "video"
        ? { resource_type: "video", format: "mp4", quality: "auto" } // Optimize video
        : { resource_type: "image", format: "webp", quality: "auto" }; // Optimize image

    const data = await cloudinary.uploader.upload(fileToUpload.path, options);
    try {
      fs.unlinkSync(fileToUpload.path);
      console.log("File deleted:", fileToUpload.path);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
    return data;
  } catch (error) {
    console.error("Error uploading media:", error);
    throw error;
  }
};

// Cloudinary remove media (images or videos)
export const cloudinaryRemoveMedia = async (mediaPublicId) => {
  try {
     await cloudinary.uploader.destroy(mediaPublicId);
     // const result =
    // return result;
  } catch (error) {
    console.error("Error removing media:", error);
    throw error;
  }
};

// Cloudinary remove multiple media (images or videos)
export const cloudinaryRemoveMultipleMedia = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error("Error removing multiple media:", error);
    throw error;
  }
};
