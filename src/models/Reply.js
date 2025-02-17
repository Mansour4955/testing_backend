import mongoose from "mongoose";
import Joi from "joi";

// Mongoose Schema
const replySchema = new mongoose.Schema(
  {
    parentId: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "parentId.model",
      },
      model: {
        type: String,
        required: true,
        enum: ["Comment", "Reply"],
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reply: { type: String, required: true, minlength: 1 },
    childReplies: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }],
      default: [],
    },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Mongoose Model
const Reply = mongoose.model("Reply", replySchema);
export default Reply;
// Joi Validations
export const validateCreateReply = (obj) => {
  const schema = Joi.object({
    parentId: Joi.object({
      id: Joi.string().required(),
      model: Joi.string().valid("Comment", "Reply").required(),
    }).required(),
    user: Joi.string().required(),
    reply: Joi.string().min(1).required(),
  });

  return schema.validate(obj);
};

export const validateUpdateReply = (obj) => {
  const schema = Joi.object({
    reply: Joi.string().min(1).optional(),
    likes: Joi.array().items(Joi.string().required()).optional(),
    childReplies: Joi.array().items(Joi.string().required()).optional(),
    edited: Joi.boolean().optional(),
  });

  return schema.validate(obj);
};
