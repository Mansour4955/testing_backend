import Reply, {
  validateCreateReply,
  validateUpdateReply,
} from "../models/Reply.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";

/**-----------------------------------------------
 * @desc    Create a new Reply
 * @route   /api/replies
 * @method  POST
 * @access  private (only signed-in users)
 ------------------------------------------------*/
export const createReply = async (req, res) => {
  try {
    const userId = req.user.id;

    const theUser = await User.findById(userId);

    if (!theUser) return res.status(404).json({ message: "User not found" });

    const user = userId;

    // Validate and find the parent (Comment or Reply)
    const { parentId } = req.body;
    if (!parentId) {
      return res
        .status(400)
        .json({ message: "ParentId is required" });
    }

    const parentComment = await Comment.findById(parentId);
    const parentReply = await Reply.findById(parentId);

    let replyModel;
    if (parentComment) replyModel = "Comment";
    else if (parentReply) replyModel = "Reply";
    else return res.status(404).json({ message: "ParentId not found" });

    const parent = parentComment || parentReply
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    // Prepare the request body for creating a reply
    const replyData = {
      ...req.body,
      user,
      parentId: {
        id: parentId,
        model: replyModel,
      },
    };

    // Validate the reply data
    const { error } = validateCreateReply(replyData);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Create and save the reply
    const createdReply = await Reply.create(replyData);
    const reply = await Reply.findById(createdReply._id)
      .populate({
        path: "parentId.id",
        model: ["Comment", "Reply"],
      })
      .populate("likes childReplies user");
    parent.childReplies.push(reply._id);
    await parent.save();

    res.status(201).json(reply);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Update a Reply
 * @route   /api/replies/:id
 * @method  PATCH
 * @access  private (only the user who created the reply)
 ------------------------------------------------*/
export const updateReply = async (req, res) => {
  const { error } = validateUpdateReply(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const reply = await Reply.findById(req.params.id)
      .populate({
        path: "parentId.id",
        model: ["Comment", "Reply"],
      })
      .populate("likes childReplies user");

    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (req.user.id !== reply.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to update this reply" });
    }

    if (req.body.reply) {
      reply.reply = req.body.reply;
    }

    await reply.save();
    res.status(200).json(reply);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Delete a Reply
 * @route   /api/replies/:id
 * @method  DELETE
 * @access  private (only the user who created the reply)
 ------------------------------------------------*/
export const deleteReply = async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);

    if (!reply) return res.status(404).json({ message: "Reply not found" });
    if (req.user.id !== reply.user.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to delete this reply" });
    }

    await Reply.deleteMany({ parentId: reply._id });
    await Reply.findByIdAndDelete(reply._id);
    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get a Reply By Id
 * @route   /api/replies/:id
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getReplyById = async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id)
      .populate({
        path: "parentId.id",
        model: ["Comment", "Reply"],
      })
      .populate("likes childReplies user");

    if (!reply) return res.status(404).json({ message: "Reply not found" });

    res.status(200).json(reply);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get All Replies with Pagination
 * @route   /api/replies?parentId&page&limit
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getAllReplies = async (req, res) => {
  const { parentId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const filter = parentId ? { parentId } : {};
    const replies = await Reply.find(filter)
    .populate({
        path: "parentId.id",
        model: ["Comment", "Reply"],
      })
      .populate("likes childReplies user")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalReplies = await Reply.countDocuments(filter);

    res.status(200).json({
      replies,
      totalReplies,
      totalPages: Math.ceil(totalReplies / limit),
      currentPage: page,
      limit,
      hasMore: page < Math.ceil(totalReplies / limit), // Whether more pages exist
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Toggle Like on a Reply
 * @route   /api/replies/likes/:id
 * @method  PATCH
 * @access  private (only signed-in users)
 ------------------------------------------------*/
export const toggleLike = async (req, res) => {
  const { id } = req.params; // Event ID
  const userId = req.user.id; // Authenticated user's ID

  try {
    // Find the user (ensure the user exists)
    const theUser = await User.findById(userId);
    if (!theUser) return res.status(404).json({ message: "User not found" });

    // Find the event by ID
    const reply = await Comment.findById(id);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    // Check if the user has already liked the event
    const existingLikeIndex = reply.likes.findIndex(
      (like) => like.toString() === userId
    );

    if (existingLikeIndex > -1) {
      // User has already liked, so remove the like
      reply.likes.splice(existingLikeIndex, 1);
    } else {
      // User hasn't liked yet, so add a new like
      reply.likes.push(userId);
    }

    // Save the updated reply
    await reply.save();

    // Populate the event with related data
    const toggledReply = await Reply.findById(reply._id).populate(
      "likes childReplies user"
    );

    // Return the updated event along with the total like count
    return res.status(200).json({
      reply: toggledReply,
      totalLikes: toggledReply.likes.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
