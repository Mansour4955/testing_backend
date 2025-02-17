import express from "express";
import { register, login } from "../controllers/usersAuthController.js";
import photoUpload from "../middlewares/photoUpload.js";

const router = express.Router();

router.post("/register", photoUpload.single("profileImage"), register);
router.post("/login", login);

export default router;
