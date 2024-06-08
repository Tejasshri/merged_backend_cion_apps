const { createServer } = require("http");
const { Server } = require("socket.io");

let users = {};
function initSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3001",
        "http://localhost:3000",
        "https://todoassignmentfrontend.onrender.com",
        "http://192.168.29.41:3000",
        "https://cion-chat-app-frontend-11-1rwobmyui-tejas-projects-a32dbdf2.vercel.app",
        "https://cion-chat-app-frontend-11.vercel.app",
        "https://merged-backend-cion-apps.onrender.com",
      ],
    },
  });

  io.on("connection", (socket) => {
    console.log("socket working start");
    socket.join("", (name) => {});
    socket.on("join", (name) => {
      users[socket.id] = name;
      console.log("joined");
    });

    socket.on("update message", (offlineMessage) => {
      socket.broadcast.emit("update message", offlineMessage);
    });

    socket.on("join room", (name, room) => {
      socket.join(room);
      socket.broadcast.emit("joined", name, room);
    });
  });

  return io;
}

module.exports = { initSocketServer };
