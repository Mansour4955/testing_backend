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
    companyProfileImage,
    companyCoverImage,
    settings,
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
    // default paypal
    const defaultPaypal = {
      paypalCustomerId: "", // PayPal's unique customer ID
      paypalSubscriptionId: "", // PayPal's subscription ID
      paypalSubscriptionStatus: "INACTIVE", // Default status for subscription
      paypalPlan: "", // Plan type (e.g., "premium_professional")
      paypalSubscriptionPeriod: "", // Subscription period (e.g., "monthly", "quarterly", "yearly")
      paypalSubscriptionPrice: 0, // Subscription price
      paypalSubscriptionStart: "", // Subscription start date
      paypalSubscriptionEnd: "", // Subscription end date
      paypalInvoiceSettings: {
        billingEmail: "", // Email for billing purposes
        billingCity: "", // City for billing
        billingCountry: "", // Country for billing
      },
      paypalPaymentMethod: "", // Payment method details (e.g., PayPal account ID or funding source)
    };
    // Initialize images
    const defaultImagesData = { url: "", publicId: null };
    const defaultSettings = {
      isAcceptingToShowUpOnline: true,
    };
    let profileImageData;
    let companyProfileImageData;
    let companyCoverImageData;

    if (req.files?.profileImage?.[0]) {
      try {
        profileImageData = req.files?.profileImage?.[0]
          ? await uploadImage(req.files?.profileImage?.[0])
          : defaultImagesData;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }
    if (req.files?.companyProfileImage?.[0]) {
      try {
        companyProfileImageData = req.files?.companyProfileImage?.[0]
          ? await uploadImage(req.files?.companyProfileImage?.[0])
          : defaultImagesData;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }
    if (req.files?.companyCoverImage?.[0]) {
      try {
        companyCoverImageData = req.files?.companyCoverImage?.[0]
          ? await uploadImage(req.files?.companyCoverImage?.[0])
          : defaultImagesData;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    const userData = {
      email,
      password: hashedPassword,
      settings: defaultSettings,
      profileImage: profileImageData,
      companyProfileImage: companyProfileImageData,
      companyCoverImage: companyCoverImageData,
      paypal: defaultPaypal,
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
        role: user.role,
      },
      process.env.JWT_SECRET,
    );

    res.status(200).json({ message: "Login successful", token, id: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
