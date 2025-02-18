import Notification, {
  validateCreateNotification,
  validateUpdateNotification,
} from "../models/Notification.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Reply from "../models/Reply.js";
import Event from "../models/Event.js";
import { io, userToSocketMap } from "../index.js";

/**-----------------------------------------------
 * @desc    Create a new Notification
 * @route   /api/notifications
 * @method  POST
 * @access  private (only signed in users)
 ------------------------------------------------*/
export const createNotification = async (req, res) => {
  const id = req.user.id;
  const user = await User.findOne({ _id: id });
  if (!user) return res.status(400).json({ message: "User not found" });
  const actor = id;
  req.body = { ...req.body, actor };
  const { error } = validateCreateNotification(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const notification = await Notification.create(req.body);

    res.status(201).json({ message: "Notification Created successfully" });
    if (Array.isArray(req.body.recipient) && req.body.recipient.length > 0) {
      req.body.recipient.forEach((singleRecipientId) => {
        const theUserId = singleRecipientId;
        const recipientSocketId = userToSocketMap[theUserId]; // Get the recipient's socket ID
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("newNotification", {
            message: "You have a new notification",
            notification, // Pass the notification data
          });
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
};

/**-----------------------------------------------
 * @desc    Get all notifications of a specific user
 * @route   /api/notifications
 * @method  GET
 * @access  private (each user gets only notifications where the user is a recipient)
 ------------------------------------------------*/
export const getNotifications = async (req, res) => {
  try {
    const { page = 1 } = req.query; // Default page is 1 if not provided
    const limit = 40; // Always limit to 40
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    const notifications = await Notification.find({
      $and: [
        {
          $or: [{ recipient: { $in: [req.user.id] } }],
        },
        {
          $or: [
            { isNotificationDeleted: { $ne: true } }, // Include notifications that are not deleted
            {
              $and: [
                { isNotificationDeleted: true }, // If deleted
                {
                  peopleDeletedTheNotification: { $ne: req.user.id },
                },
              ],
            },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 }) // Sort by `createdAt` in descending order (most recent first)
      .skip(skip) // Skip based on the calculated offset
      .limit(limit) // Limit the number of results to 40
      .populate({
        path: "actor",
        model: "User",
      })
      .populate({
        path: "reference.referenceId",
        model: ["Comment", "Reply", "Event"],
      })
      .lean();

    // Count the total number of notifications without pagination
    const totalNotifications = await Notification.countDocuments({
      $and: [
        {
          $or: [{ recipient: { $in: [req.user.id] } }],
        },
        {
          $or: [
            { isNotificationDeleted: { $ne: true } }, // Include notifications that are not deleted
            {
              $and: [
                { isNotificationDeleted: true }, // If deleted
                {
                  peopleDeletedTheNotification: { $ne: req.user.id },
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      notifications,
      notificationsNumber: notifications.length,
      totalNotifications,
      totalPages: Math.ceil(totalNotifications / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/**-----------------------------------------------
 * @desc    Get a specific notification
 * @route   /api/notifications/:id
 * @method  GET
 * @access  private (only user which is a recipient)
 ------------------------------------------------*/
export const getNotificationById = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findOne({
      _id: id,
      $or: [
        { recipient: req.user.id }, // Case 1: recipient is an array of IDs
      ],
    })
      .populate({
        path: "actor",
        model: ["User"],
      })
      .populate({
        path: "reference.referenceId",
        model: ["Comment", "Reply", "Event"],
      })
      .lean();

    if (
      !notification ||
      (notification.isNotificationDeleted &&
        notification.peopleDeletedTheNotification.find(
          (user) => user._id.toString() === req.user.id
        ))
    ) {
      return res.status(404).json({
        error: "Notification not found or not intended for this user",
      });
    }

    res.status(200).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
};

/**-----------------------------------------------
 * @desc    Update a specific notification
 * @route   /api/notifications/:id
 * @method  PATCH
 * @access  private (only the user who created the notification or users who got the notification)
 ------------------------------------------------*/
export const updateNotification = async (req, res) => {
  const { error } = validateUpdateNotification(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { id } = req.params;

  try {
    // Find and update the notification in one operation
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { recipient: req.user.id }, // Case 1: recipient is an array of IDs
        ],
      },
      { $set: req.body },
      { new: true } // return the updated document
    );

    if (
      !notification ||
      (notification.isNotificationDeleted &&
        notification.peopleDeletedTheNotification.includes(req.user.id))
    ) {
      return res.status(404).json({
        error: "Notification not found or not intended for this user",
      });
    }
    const updatedNotification = await Notification.findById(notification._id)
      .populate({
        path: "actor",
        model: ["User"],
      })
      .populate({
        path: "reference.referenceId",
        model: ["Comment", "Reply", "Event"],
      });
    res.status(200).json(updatedNotification);
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// /**-----------------------------------------------
//  * @desc    Delete a specific notification
//  * @route   /api/notifications/:id
//  * @method  DELETE
//  * @access  private (only the user who created the notification)
//  ------------------------------------------------*/
// export const deleteNotification = async (req, res) => {
//   const { id } = req.params;

//   try {
//     // Find the notification by ID
//     const notification = await Notification.findById(id);
//     if (!notification) {
//       return res.status(404).json({ error: "Notification not found" });
//     }

//     // Check if the user is authorized to delete this notification
//     if (req.user.id !== notification.actor.toString()) {
//       return res
//         .status(403)
//         .json({ error: "You are not authorized to delete this notification" });
//     }

//     // Delete the notification
//     await Notification.findByIdAndDelete(id);

//     // Respond with a success message
//     res.status(200).json({ message: "Notification deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to delete notification" });
//   }
// };
