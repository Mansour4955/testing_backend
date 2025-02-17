import Event, {
  validateCreateEvent,
  validateUpdateEvent,
} from "../models/Event.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import uploadFile from "../helpers/addVedioImageHelper.js";
import removeAddVideoImageUpload from "../helpers/removeAddVideoImageHelper.js";

/**-----------------------------------------------
 * @desc    Create a new Event
 * @route   /api/events
 * @method  POST
 * @access  private (only sing in users)
 ------------------------------------------------*/
export const createEvent = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User Not Found" });
  const host = userId;
  req.body = { ...req.body, host };
  const { error } = validateCreateEvent(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { content, ...rest } = req.body;
  try {
    // Initialize images
    const defaultContentData = { url: "", publicId: null, type: null };
    let contentData;

    try {
      contentData = req.file ? await uploadFile(req.file) : defaultContentData;
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const eventData = {
      content: contentData,
      ...rest,
    };
    const createdEvent = await Event.create(eventData);
    const event = await Event.findById(createdEvent._id).populate(
      "host accessOnlyTo participants"
    );

    res.status(201).json(event);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Update Event
 * @route   /api/events/:id
 * @method  PATCH
 * @access  private (only the user who created the event)
 ------------------------------------------------*/
export const updateEvent = async (req, res) => {
  const { error } = validateUpdateEvent(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.user.id !== event.host.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to update this event" });
    }

    const { content, ...rest } = req.body;

    let contentData;
    if (req.file) {
      contentData = await removeAddVideoImageUpload(req.file, event.content);
    }

    // Prepare updated data
    const updatedData = {
      content: contentData ? contentData : event.content,
      ...rest,
    };

    // Update event
    const updateEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    ).populate("host accessOnlyTo participants");
    res.status(200).json(updateEvent);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Delete an Event
 * @route   /api/events/:id
 * @method  DELETE
 * @access  private (only the user who created the event)
 ------------------------------------------------*/
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (req.user.id !== event.host.toString()) {
      return res
        .status(401)
        .json({ message: "Unauthorized to delete this event" });
    }
    await Comment.deleteMany({ eventId: event._id });
    await Event.findByIdAndDelete(event._id);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get an Event By Id
 * @route   /api/events/:id
 * @method  GET
 * @access  private
 ------------------------------------------------*/
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("host accessOnlyTo participants likes")
      .lean();

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.access === "private") {
      // Check if user is authenticated and has access to the event
      const isUserAllowdToSeeThisEvent = event.accessOnlyTo.find(
        (user) => user._id.toString() === req.user.id
      );
      if (!isUserAllowdToSeeThisEvent) {
        return res
          .status(403)
          .json({ message: "Unauthorized to view this private event" });
      }
    }

    res.status(200).json(event);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get All events with Pagination and User-based Filtering
 * @route   /api/events?filter&page&limit
 * @method  GET
 * @access  private (only sign in users)
 ------------------------------------------------*/
export const getAllEvents = async (req, res) => {
  const { filter = "all", status } = req.query; // Default filter is 'all'
  const page = parseInt(req.query.page) || 1; // Default page is 1
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10 events per page
  const skip = (page - 1) * limit; // Calculate the number of events to skip
  const currentUserId = req.user.id; // Get the authenticated user

  try {
    // Define the filter for the query
    let filterQuery = {};

    switch (filter) {
      case "host":
        filterQuery = { host: currentUserId };
        break;

      case "participant":
        filterQuery = { participants: currentUserId };
        break;

      case "accessOnlyTo":
        filterQuery = { accessOnlyTo: { $in: [currentUserId] } };
        break;

      case "private":
        filterQuery = {
          $or: [
            { host: currentUserId },
            { accessOnlyTo: { $in: [currentUserId] } },
          ],
        };
        break;

      case "public":
        filterQuery = { accessOnlyTo: { $exists: true, $size: 0 } }; // Public events where accessOnlyTo exists but is empty
        break;

      case "in_private":
        filterQuery = {
          $and: [
            { accessOnlyTo: { $in: [currentUserId] } }, // Must be in access list
            { accessOnlyTo: { $exists: true, $ne: [] } }, // Private events must have access list that is not empty
          ],
        };
        break;

      case "in_public":
        filterQuery = {
          $and: [
            { accessOnlyTo: { $exists: true, $size: 0 } }, // Public events (accessOnlyTo is empty)
            { participants: currentUserId }, // User must be a participant
          ],
        };
        break;

      case "all":
      default:
        // Default to show all events where the user is involved (host, participant, or accessOnlyTo)
        filterQuery = {
          $or: [
            { host: currentUserId },
            { participants: currentUserId },
            { accessOnlyTo: { $in: [currentUserId] } },
          ],
        };
        break;
    }
    // If status filter is provided, add it to the query
    if (status) {
      filterQuery.status = status; // Add status filtering
    }
    // Fetch events based on the filter
    const events = await Event.find(filterQuery)
      .populate("host accessOnlyTo participants likes")
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }); // Sort by date, latest first

    // Get the total number of events for this query
    const totalEvents = await Event.countDocuments(filterQuery);

    // Return the paginated response
    res.status(200).json({
      events,
      totalEvents,
      totalPages: Math.ceil(totalEvents / limit), // Total number of pages
      currentPage: page,
      limit,
      hasMore: page < Math.ceil(totalEvents / limit), // Whether more pages exist
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Get All events with Pagination 
 * @route   /api/events/public
 * @method  GET
 * @access  public
 ------------------------------------------------*/
export const getAllPublicEvents = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default page is 1
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10 events per page
  const skip = (page - 1) * limit; // Calculate the number of events to skip

  try {
    const events = await Event.find({ access: "public" })
      .populate("host likes")
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }); // Sort by date, latest first

    // Get the total number of events for this query
    const totalEvents = await Event.countDocuments({ access: "public" });

    // Return the paginated response
    res.status(200).json({
      events,
      totalEvents,
      totalPages: Math.ceil(totalEvents / limit), // Total number of pages
      currentPage: page,
      limit,
      hasMore: page < Math.ceil(totalEvents / limit), // Whether more pages exist
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Join the event
 * @route   /api/events/join/:id
 * @method  PATCH
 * @access  private
 ------------------------------------------------*/
export const joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "host accessOnlyTo participants likes"
    );

    if (!event) return res.status(404).json({ message: "Event not found" });

    // If event is private, check if the user has access
    if (event.access === "private") {
      const isUserAllowedToJoin = event.accessOnlyTo.some(
        (user) => user._id.toString() === req.user.id
      );
      if (!isUserAllowedToJoin) {
        return res
          .status(403)
          .json({ message: "Unauthorized to join this private event" });
      }
    }

    // If the user is already a participant, return a message
    if (
      event.participants.some((user) => user._id.toString() === req.user.id)
    ) {
      return res.status(400).json({ message: "You are already a participant" });
    }

    // Add the user to the participants list
    event.participants.push(req.user.id);
    await event.save();

    res.status(200).json({ message: "Successfully joined the event", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Leave the event
 * @route   /api/events/leave/:id
 * @method  PATCH
 * @access  private
 ------------------------------------------------*/
export const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "host accessOnlyTo participants likes"
    );

    if (!event) return res.status(404).json({ message: "Event not found" });

    // If the user is not a participant, return a message
    if (
      !event.participants.some((user) => user._id.toString() === req.user.id)
    ) {
      return res.status(400).json({ message: "You are not a participant" });
    }

    // Remove the user from the participants list
    event.participants = event.participants.filter(
      (user) => user._id.toString() !== req.user.id
    );
    await event.save();

    res.status(200).json({ message: "Successfully left the event", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

/**-----------------------------------------------
 * @desc    Toggle Like on an Event
 * @route   /api/events/likes/:id
 * @method  PATCH
 * @access  private (only signed in users)
 ------------------------------------------------*/
export const toggleLike = async (req, res) => {
  const { id } = req.params; // Event ID
  const userId = req.user.id; // Authenticated user's ID

  try {
    // Find the user (ensure the user exists)
    const theUser = await User.findById(userId);
    if (!theUser) return res.status(404).json({ message: "User not found" });

    // Find the event by ID
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check if the user has already liked the event
    const existingLikeIndex = event.likes.findIndex(
      (like) => like.toString() === userId
    );

    if (existingLikeIndex > -1) {
      // User has already liked, so remove the like
      event.likes.splice(existingLikeIndex, 1);
    } else {
      // User hasn't liked yet, so add a new like
      event.likes.push(userId);
    }

    // Save the updated event
    await event.save();

    // Populate the event with related data
    const toggledEvent = await Event.findById(event._id).populate(
      "host accessOnlyTo participants likes"
    );

    // Return the updated event along with the total like count
    return res.status(200).json({
      event: toggledEvent,
      totalLikes: toggledEvent.likes.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
