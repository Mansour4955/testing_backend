import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { createComment,deleteComment,getAllComments,getCommentById,toggleLike,updateComment } from "../controllers/commentsController.js";

const router = express.Router();

router.post("/", verifyToken ,createComment);
router.get("/", getAllComments);
router.get("/:id", validateObjectId, getCommentById);

router.patch(
  "/:id",
  validateObjectId,
  verifyToken,
  updateComment
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
  deleteComment
);
export default router;
