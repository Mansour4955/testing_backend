import mongoose from "mongoose";
import consola from "consola";

const connectedToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    consola.success({
      badge: true,
      message: `🚀 Connected to MongoDB successfully! ${process.env.MONGO_URL}`,
    });
  } catch (err) {
    consola.error({
      badge: true,
      message: `❌ Error connecting to MongoDB: ${err.message}`,
    });
  }
};

export default connectedToDB;
