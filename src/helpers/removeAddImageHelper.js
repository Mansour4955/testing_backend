import { cloudinaryRemoveMedia } from "../utils/cloudinary.js";
import uploadImage from "./addImageHelper.js";

// Helper function for handling image upload
const removeAddFileUpload = async (file, existingImage) => {
  if (file) {
    if (existingImage.publicId !== null) {
      await cloudinaryRemoveMedia(existingImage.publicId);
    }
    return await uploadImage(file);
  }
  return existingImage;
};

export default removeAddFileUpload;
