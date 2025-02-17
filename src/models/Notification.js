import mongoose from "mongoose";
import Joi from "joi";

// Mongoose Schema
const notificationSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    recipient: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      ],
      required: true,
    },
    notificationType: {
      type: String,
      required: true,
      enum: ["comment", "reply", "access_offer", "reaction", "joined", "leaved"],
    },
    reference: {
      referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "reference.referenceModel", // Dynamic reference to associated model
        required: true,
      },
      referenceModel: {
        type: String,
        enum: ["Comment", "Reply", "Event"], // Related models
        required: true,
      },
      _id: false,
    },
    isNotificationDeleted: { type: Boolean, default: false },
    peopleDeletedTheNotification: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      ],
      default: [],
    },
    seen: { type: Boolean, default: false },
    seenBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Export Mongoose Model
const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
// Joi Validation for Creating Notification
export const validateCreateNotification = (obj) => {
  const schema = Joi.object({
    actor: Joi.string().required(),
    recipient: Joi.array().items(Joi.string().required()).required(),
    notificationType: Joi.string()
      .valid("comment", "reply", "access_offer", "reaction", "joined", "leaved")
      .required(), // Validate notification type
    reference: Joi.object({
      referenceId: Joi.string().required(), // Validate reference id as ObjectId
      referenceModel: Joi.string()
        .valid("Comment", "Reply", "Event")
        .required(), // Validate reference model
    }).required(),
  });

  return schema.validate(obj);
};

// Joi Validation for Updating Notification
export const validateUpdateNotification = (obj) => {
  const schema = Joi.object({
    isNotificationDeleted: Joi.boolean(), // Validate isNotificationDeleted as a boolean
    peopleDeletedTheNotification: Joi.array()
      .items(Joi.string().required())
      .optional(), // Validate as an array of objects
    seen: Joi.boolean().optional(), // Validate seen as a boolean
    seenBy: Joi.array().items(Joi.string().required()).optional(),
  });

  return schema.validate(obj);
};
