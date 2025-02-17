import { cloudinaryRemoveMedia } from "../utils/cloudinary.js";

const removeFileFromCloudinary = async (filePublicId) => {
  if (filePublicId !== null) {
    try {
      await cloudinaryRemoveMedia(filePublicId);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error removing cover image", error: err });
      return;
    }
  }
};
export default removeFileFromCloudinary;
