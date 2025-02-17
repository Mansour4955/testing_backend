import mongoose from "mongoose";
import Joi from "joi";

// Mongoose Schema
const commentSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    comment: { type: String, required: true, minlength: 1 },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Mongoose Model
const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
// Joi Validations
export const validateCreateComment = (obj) => {
  const schema = Joi.object({
    eventId: Joi.string().required(),
    user: Joi.string().required(),
    comment: Joi.string().min(1).required(),
  });

  return schema.validate(obj);
};

export const validateUpdateComment = (obj) => {
  const schema = Joi.object({
    comment: Joi.string().min(1).optional(),
    likes: Joi.array().items(Joi.string().required()).optional(),
    edited: Joi.boolean().optional(),
  });

  return schema.validate(obj);
};
