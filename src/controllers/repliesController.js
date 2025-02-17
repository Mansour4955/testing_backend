import Reply, {
  validateCreateReply,
  validateUpdateReply,
} from "../models/Reply.js";
import Comment from "../models/Comment.js";
import Professional from "../models/Professional.js";
import User from "../models/User.js";
import Review from "../models/Review.js";

/**-----------------------------------------------
 * @desc    Create a new Reply
 * @route   /api/replies
 * @method  POST
 * @access  private (only signed-in users and professionals)
 ------------------------------------------------*/
export const createReply = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user exists in either the User or Professional model
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

    // Validate and find the parent (Comment or Reply)
    const { parentId } = req.body;
    if (!parentId || !parentId.id) {
      return res
        .status(400)
        .json({ message: "ParentId is required and must have an id" });
    }

    const parentComment = await Comment.findById(parentId.id);
    const parentReply = await Reply.findById(parentId.id);
    const parentReview = await Review.findById(parentId.id);

    let replyModel;
    if (parentComment) replyModel = "Comment";
    else if (parentReply) replyModel = "Reply";
    else if (parentReview) replyModel = "Review";
    else return res.status(404).json({ message: "ParentId not found" });

    const parent = parentComment || parentReply || parentReview;
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    // Prepare the request body for creating a reply
    const replyData = {
      ...req.body,
      user,
      parentId: {
        ...parentId,
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
        model: ["Comment", "Reply", "Review"],
      })
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("childReplies");
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
        model: ["Comment", "Reply", "Review"],
      })
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("childReplies");

    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (req.user.id !== reply.user.id._id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to update this reply" });
    }

    if (req.body.reply) {
      reply.previousVersions.push({
        reply: reply.reply,
        updatedAt: new Date().toISOString(),
      });
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
    if (req.user.id !== reply.user.id.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to delete this reply" });
    }

    await Reply.deleteMany({ "parentId.id": reply._id });
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
        model: ["Comment", "Reply", "Review"],
      })
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("childReplies");

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
    const filter = parentId ? { "parentId.id": parentId } : {};
    const replies = await Reply.find(filter)
      .populate({
        path: "parentId.id",
        model: ["Comment", "Reply", "Review"],
      })
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("childReplies")
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
  const { id } = req.params;
  const userId = req.user.id;
  const theProfessional = await Professional.findById(userId);
  const theUser = await User.findById(userId);
  let model;
  if (theUser) model = "User";
  else if (theProfessional) model = "Professional";
  else res.status(404).json({ message: "User not found" });

  try {
    const reply = await Reply.findById(id)
      // .populate({
      //   path: "parentId.id",
      //   model: ["Comment", "Reply"],
      // })
      // .populate({
      //   path: "user.id",
      //   model: ["User", "Professional"],
      // })
      // .populate({
      //   path: "likes.likedById",
      //   model: ["User", "Professional"],
      // })
      // .populate("childReplies");
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const existingLikeIndex = reply.likes.findIndex(
      (like) => like.likedById.toString() === userId
    );

    if (existingLikeIndex > -1) {
      const { reactionType } = req.body;

      if (reactionType !== null) {
        reply.likes[existingLikeIndex].reactionType = reactionType;
      } else {
        reply.likes.splice(existingLikeIndex, 1);
      }
    } else {
      const { reactionType } = req.body;

      if (!reactionType) {
        return res.status(400).json({
          message: "reactionType is required.",
        });
      }

      reply.likes.push({
        likedById: userId,
        likedByModel: model,
        reactionType,
      });
    }

    await reply.save();

    const toggledReply = await Reply.findById(reply._id)
      .populate({
        path: "parentId.id",
        model: ["Comment", "Reply", "Review"],
      })
      .populate({
        path: "user.id",
        model: ["User", "Professional"],
      })
      .populate({
        path: "likes.likedById",
        model: ["User", "Professional"],
      })
      .populate("childReplies");

    res
      .status(200)
      .json({ reply: toggledReply, totalLikes: toggledReply.likes.length });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};
