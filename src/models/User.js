import mongoose from "mongoose";
import Joi from "joi";

// Mongoose Schema
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: {
      type: Object,
      default: {
        url: "",
        publicId: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Model
const User = mongoose.model("User", userSchema);
export default User;
// Validation Functions
export const validateRegisterUser = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    profileImage: Joi.optional(),
  });

  return schema.validate(data);
};

export const validateUpdateUser = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    password: Joi.string().optional(),
    profileImage: Joi.optional(),
  });

  return schema.validate(data);
};

export const validateLoginUser = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};
