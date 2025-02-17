import Comment, {
  validateCreateComment,
  validateUpdateComment,
} from "../models/Comment.js";
import User from "../models/User.js";
import Reply from "../models/Reply.js";
import Event from "../models/Event.js";

/**-----------------------------------------------
 * @desc    Create a new Comment
 * @route   /api/comments
 * @method  POST
 * @access  private (only sing in users)
 ------------------------------------------------*/
export const createComment = async (req, res) => {
  const userId = req.user.id;
  const theUser = await User.findById(userId);
  if (!theUser) return res.status(404).json({ message: "User not found" });
  const user = userId;
  req.body = { ...req.body, user };
  const { error } = validateCreateComment(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const event = await Event.findById(req.body.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const createdComment = await Comment.create(req.body);
    const comment = await Comment.findById(createdComment._id).populate(
      "user likes"
    );
    res.status(201).json(comment);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Update the comment in Comment
 * @route   /api/comments/:id
 * @method  PATCH
 * @access  private (only the user who created the comment)
 ------------------------------------------------*/
export const updateComment = async (req, res) => {
  const { error } = validateUpdateComment(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const comment = await Comment.findById(req.params.id).populate(
      "user likes"
    );

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (req.user.id !== comment.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to update this comment" });
    }

    if (req.body.comment) {
      comment.comment = req.body.comment;
    }

    await comment.save();
    res.status(200).json(comment);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Delete a Comment
 * @route   /api/comments/:id
 * @method  DELETE
 * @access  private (only the user who created the comment)
 ------------------------------------------------*/
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (req.user.id !== comment.user.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to delete this comment" });
    }
    await Reply.deleteMany({ parentId: comment._id });
    await Comment.findByIdAndDelete(comment._id);
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get a Comment By Id
 * @route   /api/comments/:id
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("user likes")
      .lean();

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    res.status(200).json(comment);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get All Comments with Pagination
 * @route   /api/comments?eventId&page&limit
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getAllComments = async (req, res) => {
  const { eventId } = req.query; // eventId to filter comments
  const page = parseInt(req.query.page) || 1; // Default page is 1
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10 comments per page
  const skip = (page - 1) * limit; // Calculate the number of comments to skip

  try {
    // Filter comments by postId if provided
    const filter = eventId ? { eventId } : {};

    // Get paginated comments
    const comments = await Comment.find(filter)
      .populate("user likes")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest comments first

    // Get the total number of comments for this query
    const totalComments = await Comment.countDocuments(filter);

    // Return the paginated response
    res.status(200).json({
      comments,
      totalComments,
      totalPages: Math.ceil(totalComments / limit), // Total number of pages
      currentPage: page,
      limit,
      hasMore: page < Math.ceil(totalComments / limit), // Whether more pages exist
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Toggle Like on a Comment
 * @route   /api/comments/likes/:id
 * @method  PATCH
 * @access  private (only sign in users)
 ------------------------------------------------*/
export const toggleLike = async (req, res) => {
  const { id } = req.params; // Event ID
  const userId = req.user.id; // Authenticated user's ID

  try {
    // Find the user (ensure the user exists)
    const theUser = await User.findById(userId);
    if (!theUser) return res.status(404).json({ message: "User not found" });

    // Find the event by ID
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Check if the user has already liked the event
    const existingLikeIndex = comment.likes.findIndex(
      (like) => like.toString() === userId
    );

    if (existingLikeIndex > -1) {
      // User has already liked, so remove the like
      comment.likes.splice(existingLikeIndex, 1);
    } else {
      // User hasn't liked yet, so add a new like
      comment.likes.push(userId);
    }

    // Save the updated comment
    await comment.save();

    // Populate the event with related data
    const toggledComment = await Comment.findById(comment._id).populate(
      "user likes"
    );

    // Return the updated event along with the total like count
    return res.status(200).json({
      comment: toggledComment,
      totalLikes: toggledComment.likes.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
