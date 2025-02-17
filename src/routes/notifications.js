import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { createNotification, deleteNotification, getNotificationById, getNotifications, updateNotification } from "../controllers/notificationsController.js";

const router = express.Router();

router.post("/",verifyToken ,createNotification);
router.get("/",verifyToken ,getNotifications);
router.get("/:id", validateObjectId, verifyToken, getNotificationById);

router.patch(
  "/:id",
  validateObjectId,
  verifyToken,
  updateNotification
);

router.delete(
  "/:id",
  validateObjectId,
  verifyToken,
  deleteNotification
);
export default router;
