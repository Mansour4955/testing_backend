import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  updateEvent,
  toggleLike,
  getAllPublicEvents,
} from "../controllers/eventsController.js";

const router = express.Router();

router.post("/", verifyToken, createEvent);
router.get("/", getAllEvents);
router.get("/public", getAllPublicEvents);
router.get("/:id", validateObjectId, getEventById);

router.patch("/:id", validateObjectId, verifyToken, updateEvent);

router.patch("/join/:id", validateObjectId, verifyToken, joinEvent);
router.patch("/leave/:id", validateObjectId, verifyToken, leaveEvent);
router.patch("/likes/:id", validateObjectId, verifyToken, toggleLike);

router.delete("/:id", validateObjectId, verifyToken, deleteEvent);
export default router;
