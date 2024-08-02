const { createServer } = require("http");
const { Server } = require("socket.io");

let users = {};

function initSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3005",
        "http://localhost:3004",
        "http://localhost:3003",
        "http://localhost:3002",
        "http://localhost:3001",
        "http://localhost:3000",
        "https://todoassignmentfrontend.onrender.com",
        "http://192.168.29.41:3000",
        "https://cion-chat-app-frontend-11-1rwobmyui-tejas-projects-a32dbdf2.vercel.app",
        "https://cion-chat-app-frontend-11.vercel.app",
        "https://merged-backend-cion-apps.onrender.com",
      ],
    },
    pingInterval: 30000, // Increase ping interval to 30 seconds
    pingTimeout: 60000,  // Timeout after 60 seconds
    perMessageDeflate: { // Enable compression
      threshold: 1024, // Only compress messages larger than 1KB
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connection established");

    socket.on("join", (name) => {
      users[socket.id] = name;
      console.log(`${name} joined`);
      socket.emit("join_ack", { success: true });
    });

    socket.on("update message", (offlineMessage) => {
      socket.broadcast.emit("update message", offlineMessage);
    });

    socket.on("join room", (name, room) => {
      socket.join(room);
      socket.to(room).emit("joined", name, room); // Emit only to the room
    });

    socket.on("disconnect", () => {
      delete users[socket.id];
      console.log("User disconnected");
    });

    socket.on("update permissions", () => {
      
    })
  });

  return io;
}

module.exports = { initSocketServer };
