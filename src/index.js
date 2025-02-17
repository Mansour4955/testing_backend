import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectToDb from "./config/connectedToDb.js";
import consola from "consola";
import ProfessionalsAuth from "./routes/professionalsAuth.js";
import Professionals from "./routes/professionals.js";
import Notifications from "./routes/notifications.js";
import Reviews from "./routes/reviews.js";
import UsersAuth from "./routes/usersAuth.js";
import Users from "./routes/users.js";
import Chats from "./routes/chats.js";
import Posts from "./routes/posts.js";
import Messages from "./routes/messages.js";
import Comments from "./routes/comments.js";
import Replies from "./routes/replies.js";
import Schedules from "./routes/schedules.js";
import NormalSchedules from "./routes/normalSchedules.js";
import Ads from "./routes/ads.js";
import Sponsorships from "./routes/sponsorships.js";
import webhookRouter from "./routes/subscription.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import {
  handleSocketConnections,
  setUserOffline,
  setUserOnline,
} from "./socket/ChatSocketHandler.js";
import cleanUpFolder from "./middlewares/cleanUpFiles.js";
import helmet from "helmet";
import xss from "xss-clean";
import hpp from "hpp";

dotenv.config();

// Connection to DB
connectToDb();

// Run cleanup every 4 minutes
setInterval(cleanUpFolder, 4 * 60 * 1000);

// Run the function once when the script starts
cleanUpFolder();

// Init App
const app = express();

// Security Headers
app.use(helmet());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Prevent XSS Attacks
app.use(xss());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins (update for production)
  },
});

// Middleware
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf; // Assign the raw buffer to req.rawBody
    },
  })
);
app.use(cors({ origin: "*" }));

// Routes
app.use("/api/webhook", webhookRouter);
app.use("/api/professional-auth", ProfessionalsAuth);
app.use("/api/professionals", Professionals);
app.use("/api/user-auth", UsersAuth);
app.use("/api/users", Users);
app.use("/api/notifications", Notifications);
app.use("/api/reviews", Reviews);
app.use("/api/chats", Chats);
app.use("/api/messages", Messages);
app.use("/api/comments", Comments);
app.use("/api/posts", Posts);
app.use("/api/replies", Replies);
app.use("/api/schedules", Schedules);
app.use("/api/normal_schedules", NormalSchedules);
app.use("/api/ads", Ads);
app.use("/api/sponsorships", Sponsorships);

// Error Handler Middleware
app.use(notFound);
app.use(errorHandler);

// Track users by their IDs and corresponding socketId
const userToSocketMap = {}; // { userId: socketId }
const socketToUserMap = {}; // { socketId: userId }
// Socket.io Connection Handling
io.on("connection", (socket) => {
  handleSocketConnections(socket); // Use the socket event handlers
  console.log(`User connected: ${socket.id}`);

  // Listen for login of the user/professional ID
  socket.on("login", async ({ userId }) => {
    try {
      if (!userToSocketMap[userId]) {
        // First-time login
        userToSocketMap[userId] = socket.id;
        socketToUserMap[socket.id] = userId;
        console.log(`User ${userId} login with socket ID: ${socket.id}`);
      } else if (userToSocketMap[userId] !== socket.id) {
        // Update existing mapping
        const oldSocketId = userToSocketMap[userId];
        delete socketToUserMap[oldSocketId];
        userToSocketMap[userId] = socket.id;
        socketToUserMap[socket.id] = userId;
        console.log(`User ${userId} updated to new socket ID: ${socket.id}`);
      }
      await setUserOnline(userId);
    } catch (error) {
      console.error("Error during user registration:", error.message);
    }
  });
  // Handle disconnection
  socket.on("disconnect", async () => {
    const userId = socketToUserMap[socket.id];
    if (userId) {
      await setUserOffline(userId);
      delete userToSocketMap[userId];
    }
    delete socketToUserMap[socket.id];
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Running the server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () =>
  consola.success({
    badge: true,
    message: `🚀 Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`,
  })
);

export { io, socketToUserMap, userToSocketMap };
