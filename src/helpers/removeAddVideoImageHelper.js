import { cloudinaryRemoveMedia } from "../utils/cloudinary.js";
import uploadFile from "./addVedioImageHelper.js";

// Helper function for handling image upload
const removeAddVideoImageUpload = async (file, existingFilePublicId) => {
  if (file) {
    if (existingFilePublicId !== null) {
      await cloudinaryRemoveMedia(existingFilePublicId);
    }
    return await uploadFile(file);
  }
  return existingImage;
};

export default removeAddVideoImageUpload;
