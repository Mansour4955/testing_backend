import User, { validateUpdateUser } from "../models/User.js";
import removeAddFileUpload from "../helpers/removeAddImageHelper.js";
import removeFileFromCloudinary from "../helpers/removeFileHelper.js";
import Comment from "../models/Comment.js";
import Reply from "../models/Reply.js";
import Event from "../models/Event.js";
/**-----------------------------------------------
 * @desc    Get All Users
 * @route   /api/users
 * @method  GET
 * @access  private (only admin)
 ------------------------------------------------*/
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number (default to 1)
    const limit = 50; // Number of users per page

    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    const users = await User.find().skip(skip).limit(limit); // Fetch users with pagination
    const totalUsers = await User.countDocuments(); // Get the total number of users
    const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages

    res.status(200).json({
      currentPage: page,
      totalPages,
      totalUsers,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

/**-----------------------------------------------
 * @desc    Get a user By Id
 * @route   /api/users/:id
 * @method  GET
 * @access  private (only signin users)
 ------------------------------------------------*/
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findOne({ _id: id });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Update User with images
 * @route   /api/users/:id
 * @method  PATCH
 * @access  private (only users themselves)
 ------------------------------------------------*/
export const updateUserById = async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const { password, profileImage, ...rest } = req.body;

    // Hash password if provided
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : user.password;

    // Handle image uploads

    let profileImageData;
    if (req.files?.profileImage?.[0]) {
      profileImageData = await removeAddFileUpload(
        req.files?.profileImage?.[0],
        user.profileImage
      );
    }

    // Prepare updated data
    const updatedData = {
      password: hashedPassword,
      profileImage: profileImageData ? profileImageData : user.profileImage,
      ...rest,
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true }
    );

    res.status(200).json({ message: "Updated successfully", updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
/**-----------------------------------------------
 * @desc    Delete User with image removal error handling
 * @route   /api/users/:id
 * @method  DELETE
 * @access  private (only user themselves)
 ------------------------------------------------*/
export const deleteUserById = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the user before deletion to remove images from Cloudinary
    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove images from Cloudinary if they exist
    if (userToDelete.profileImage?.publicId !== null) {
      await removeFileFromCloudinary(userToDelete.profileImage.publicId);
    }

    // Delete associated event
    await Promise.all([
      Event.deleteMany({ host: id }), // Delete event associated with the user (host)
    ]);

    // Remove the user from the database
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "User and associated resources deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
