import User, {
  validateLoginUser,
  validateRegisterUser,
} from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import uploadImage from "../helpers/addImageHelper.js";

/**-----------------------------------------------
   * @desc    User Registration
   * @route   /api/user-auth/register
   * @method  POST
   * @access  public
   ------------------------------------------------*/
// Controller function for registration
export const register = async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const {
    email,
    password,
    profileImage,
    ...rest
  } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Initialize images
    const defaultImagesData = { url: "", publicId: null };
    let profileImageData;

    if (req.files?.profileImage?.[0]) {
      try {
        profileImageData = req.files?.profileImage?.[0]
          ? await uploadImage(req.files?.profileImage?.[0])
          : defaultImagesData;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    const userData = {
      email,
      password: hashedPassword,
      profileImage: profileImageData,
      ...rest,
    };

    // Create the user instance
    const user = new User(userData);

    // Save the user
    await user.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**-----------------------------------------------
   * @desc    User Login
   * @route   /api/user-auth/login
   * @method  POST
   * @access  public
   ------------------------------------------------*/
export const login = async (req, res) => {
  const { error } = validateLoginUser(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET
    );

    res.status(200).json({ message: "Login successful", token, id: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
