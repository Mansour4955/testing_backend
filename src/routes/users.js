import express from "express";
import {
getAllUsers,getUserById,updateUserById,deleteUserById
} from "../controllers/usersController.js";
import {
  verifyTokenAndOnlyUser,
  verifyToken,
  verifyTokenAndAdmin,
} from "../middlewares/verifyToken.js";
import photoUpload from "../middlewares/photoUpload.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";

const router = express.Router();

router.get("/",verifyTokenAndAdmin, getAllUsers);
router.get("/:id", validateObjectId, verifyToken, getUserById);

router.patch(
  "/:id",
  validateObjectId,
  verifyTokenAndOnlyUser,
  photoUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "companyProfileImage", maxCount: 1 },
    { name: "companyCoverImage", maxCount: 1 },
  ]),
  updateUserById
);

router.delete(
  "/:id",
  validateObjectId,
  verifyTokenAndOnlyUser,
  deleteUserById
);
export default router;
