import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { createReply,deleteReply,getAllReplies,getReplyById, toggleLike,updateReply } from "../controllers/repliesController.js";

const router = express.Router();

router.post("/", verifyToken ,createReply);
router.get("/", getAllReplies);
router.get("/:id", validateObjectId, getReplyById);

router.patch(
  "/:id",
  validateObjectId,
  verifyToken,
  updateReply
);

router.patch(
    "/likes/:id",
    validateObjectId,
    verifyToken,
    toggleLike
  );

router.delete(
  "/:id",
  validateObjectId,
  verifyToken,
  deleteReply
);
export default router;
