import { cloudinaryUploadImage } from "../utils/cloudinary.js";

const uploadImage = async (image) => {
  try {

    const result = await cloudinaryUploadImage(image);

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    throw new Error("Error uploading the image: " + err.message);
  }
};

export default uploadImage;
