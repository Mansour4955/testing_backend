import Comment, {
  validateCreateComment,
  validateUpdateComment,
} from "../models/Comment.js";
import Professional from "../models/Professional.js";
import User from "../models/User.js";
import Reply from "../models/Reply.js";
import Post from "../models/Post.js";

/**-----------------------------------------------
 * @desc    Create a new Comment
 * @route   /api/comments
 * @method  POST
 * @access  private (only sing in users and professionals)
 ------------------------------------------------*/
export const createComment = async (req, res) => {
  const userId = req.user.id;
  const theProfessional = await Professional.findById(userId);
  const theUser = await User.findById(userId);
  let model;
  if (theUser) model = "User";
  else if (theProfessional) model = "Professional";
  else return res.status(404).json({ message: "User not found" });
  const user = {
    id: userId,
    model,
  };
  req.body = { ...req.body, user };
  const { error } = validateCreateComment(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const post = await Post.findById(req.body.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const createdComment = await Comment.create(req.body);
    const comment = await Comment.findById(createdComment._id)
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("postId childReplies");
    post.comments.push(comment._id);
    await post.save();
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
    const comment = await Comment.findById(req.params.id)
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("postId childReplies");

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (req.user.id !== comment.user.id._id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to update this comment" });
    }

    if (req.body.comment) {
      comment.previousVersions.push({
        comment: comment.comment,
        updatedAt: new Date().toISOString(),
      });
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
    if (req.user.id !== comment.user.id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to delete this comment" });
    }
    await Reply.deleteMany({ "parentId.id": comment._id });
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
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("postId childReplies")
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
 * @route   /api/comments?postId&page&limit
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getAllComments = async (req, res) => {
  const { postId } = req.query; // Post ID to filter comments
  const page = parseInt(req.query.page) || 1; // Default page is 1
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10 comments per page
  const skip = (page - 1) * limit; // Calculate the number of comments to skip

  try {
    // Filter comments by postId if provided
    const filter = postId ? { postId } : {};

    // Get paginated comments
    const comments = await Comment.find(filter)
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("postId childReplies")
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
  const { id } = req.params; // Comment ID
  const userId = req.user.id; // Authenticated user's ID
  const theProfessional = await Professional.findById(userId);
  const theUser = await User.findById(userId);
  let model;
  if (theUser) model = "User";
  else if (theProfessional) model = "Professional";
  else res.status(404).json({ message: "User not found" });
  try {
    // Find the comment by ID
    const comment = await Comment.findById(id)
      // .populate({
      //   path: "user.id",
      //   model: ["User", "Professional"],
      // })
      // .populate({
      //   path: "likes.likedById",
      //   model: ["User", "Professional"],
      // })
      // .populate("postId childReplies");
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if the user has already liked the comment
    const existingLikeIndex = comment.likes.findIndex(
      (like) => like.likedById.toString() === userId
    );

    if (existingLikeIndex > -1) {
      const { reactionType } = req.body;

      if (reactionType !== null) {
        // Update the reaction type
        comment.likes[existingLikeIndex].reactionType = reactionType;
      } else {
        // Remove the like if reactionType is null
        comment.likes.splice(existingLikeIndex, 1);
      }
    } else {
      // Validate the incoming like object (e.g. reactionType)
      const { reactionType } = req.body;

      if (!reactionType) {
        return res.status(400).json({
          message: "reactionType is required.",
        });
      }

      // Push a new like object to the likes array
      comment.likes.push({
        likedById: userId, // Authenticated user's ID
        likedByModel: model, // Should be provided by the client (e.g., "User" or "Professional")
        reactionType, // Reaction type (e.g., "like", "love", etc.)
      });
    }

    // Save the updated comment
    await comment.save();
    const toggledComment = await Comment.findById(comment._id)
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("postId childReplies");
    // Return the updated likes array and total like count
    return res.status(200).json({
      comment: toggledComment,
      totalLikes: toggledComment.likes.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
