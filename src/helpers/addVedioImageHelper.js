import { cloudinaryUploadMedia } from "../utils/cloudinary.js";

const uploadFile = async (file) => {
  try {

    const result = await cloudinaryUploadMedia(file);

    return { url: result.secure_url, publicId: result.public_id, type: result.resource_type};
  } catch (err) {
    throw new Error("Error uploading the file: " + err.message);
  }
};

export default uploadFile;
