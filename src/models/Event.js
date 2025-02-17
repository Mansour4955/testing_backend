import mongoose from "mongoose";
import Joi from "joi";

// Mongoose Schema
const eventSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    maxParticipants: { type: Number, required: true, min: 1 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    content: {
      url: { type: String, required: true },
      publicId: { type: String, default: null },
      type: { type: String, required: true, enum: ["image", "video"] },
      _id: false,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "conference",
        "workshop",
        "meetup",
        "seminar",
        "webinar",
        "social",
      ], // Add more categories as needed
    },
    status: {
      type: String,
      required: true,
      enum: ["scheduled", "ongoing", "completed", "cancelled"], // Event status
      default: "scheduled", // Default status when creating a new event
    },
    access: { type: string, enum: ["private", "public"] },
    accessOnlyTo: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      ],
      default: [],
    },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

// Mongoose Model
const Event = mongoose.model("Event", eventSchema);
export default Event;

// Joi Validations
export const validateCreateEvent = (obj) => {
  const schema = Joi.object({
    description: Joi.string().trim().required(),
    date: Joi.date().required(),
    location: Joi.string().trim().required(),
    maxParticipants: Joi.number().min(1).required(),
    host: Joi.string().required(),
    content: Joi.optional(),
    category: Joi.string()
      .valid("conference", "workshop", "meetup", "seminar", "webinar", "social")
      .required(), // Validation for category
    status: Joi.string()
      .valid("scheduled", "ongoing", "completed", "cancelled")
      .default("scheduled"), // Validation for status
    access: Joi.string().valid("private", "public").required(),
    accessOnlyTo: Joi.array().items(Joi.string().required()).optional(),
  });

  return schema.validate(obj);
};

export const validateUpdateEvent = (obj) => {
  const schema = Joi.object({
    description: Joi.string().trim().optional(),
    date: Joi.date().optional(),
    location: Joi.string().trim().optional(),
    maxParticipants: Joi.number().min(1).optional(),
    participants: Joi.array().items(Joi.string().required()).optional(),
    content: Joi.optional(),
    category: Joi.string()
      .valid("conference", "workshop", "meetup", "seminar", "webinar", "social")
      .optional(), // Category is optional for update
    status: Joi.string()
      .valid("scheduled", "ongoing", "completed", "cancelled")
      .optional(), // Status can be updated
    accessOnlyTo: Joi.array().items(Joi.string().required()).optional(),
    likes: Joi.array().items(Joi.string().required()).optional(),
  });

  return schema.validate(obj);
};
