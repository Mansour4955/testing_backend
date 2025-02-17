import express from "express";
import { register, login } from "../controllers/usersAuthController.js";
import photoUpload from "../middlewares/photoUpload.js";

const router = express.Router();

router.post(
  "/register",
  photoUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "companyProfileImage", maxCount: 1 },
    { name: "companyCoverImage", maxCount: 1 },
  ]),
  register
);
router.post("/login", login);

export default router;
