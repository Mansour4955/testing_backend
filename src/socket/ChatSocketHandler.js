import Chat from "../models/Chat.js";
import { io,socketToUserMap } from "../index.js";

// Set user online
export const setUserOnline = async (userId) => {
  await Chat.updateMany(
    { "users.id": userId },
    { $set: { "users.$.isOnline": true } }
  );
  console.log(`User ${userId} is marked as online.`);
};

// Set user offline and update lastSeen
export const setUserOffline = async (userId) => {
  await Chat.updateMany(
    { "users.id": userId },
    {
      $set: {
        "users.$.isOnline": false,
        "users.$.lastSeen": new Date(),
      },
    }
  );
  console.log(`User ${userId} is marked as offline.`);
};

// Helper function to update chat fields
const updateChat = async (chatId, updateData) => {
  try {
    // Using the $set operator to update the chat fields without overwriting the entire document
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $set: updateData },
      { new: true }
    );
    return updatedChat;
  } catch (err) {
    console.error("Error updating chat:", err);
    return null;
  }
};

// Socket Event Handlers
export const handleSocketConnections = (socket) => {
    // Join a specific chat room
    socket.on("joinChat", async(chatId) => {
      try {
        const userId = socketToUserMap[socket.id]
        const chat = await Chat.findById(chatId)
        if (!chat) {
          return socket.to(chatId).emit("error", { message: "Chat not found" });
        }
        const userBelongsToChat = chat.users.some(user => user.id.toString() === userId)
        if(!userBelongsToChat){
          console.error("Error handling Join chat");
        }else {
          socket.join(chatId); // User joins the room for this chat
          console.log(`User ${socket.id} joined chat room: ${chatId}`);
        }
      } catch (err) {
        console.error("Error handling Join chat:", err);
      }
    
    });
  // Listen for typing events
  socket.on("typing", async (chatId, userId, isTyping) => {
    try {
      // Fetch the chat document
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return socket.to(chatId).emit("error", { message: "Chat not found" });
      }

      // Find the user and update the isTyping status
      const userIndex = chat.users.findIndex(user => user.id.toString() === userId);
      if (userIndex !== -1) {
        chat.users[userIndex].isTyping = isTyping;
      } else {
        return socket.to(chatId).emit("error", { message: "User not found in chat" });
      }

      // Update the chat document with only the modified user
      const updatedChat = await updateChat(chatId, { "users": chat.users });

      if (updatedChat) {
        io.to(chatId).emit("chatUpdated", updatedChat); // Broadcast updated chat to all clients
      }
    } catch (err) {
      console.error("Error handling typing event:", err);
      socket.to(chatId).emit("error", { message: "Error handling typing event" });
    }
  });

  // Listen for last seen updates by User
  socket.on("updateLastSeenByUser", async (chatId, lastSeenByUser) => {
    try {
      const updateData = { lastSeenByUser };
      const updatedChat = await updateChat(chatId, updateData);

      if (updatedChat) {
        io.to(chatId).emit("chatUpdated", updatedChat); // Broadcast updated chat to all clients
      }
    } catch (err) {
      console.error("Error handling last seen update:", err);
      socket.to(chatId).emit("error", { message: "Error handling last seen update" });
    }
  });

  // Listen for last seen updates by Professional
  socket.on("updateLastSeenByProfessional", async (chatId, lastSeenByProfessional) => {
    try {
      const updateData = { lastSeenByProfessional };
      const updatedChat = await updateChat(chatId, updateData);

      if (updatedChat) {
        io.to(chatId).emit("chatUpdated", updatedChat); // Broadcast updated chat to all clients
      }
    } catch (err) {
      console.error("Error handling professional last seen update:", err);
      socket.to(chatId).emit("error", { message: "Error handling professional last seen update" });
    }
  });
};
