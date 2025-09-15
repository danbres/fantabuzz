import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("../frontend")); // serve frontend se vuoi tutto su Railway
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
const COUNTDOWN_SEC = 10;

let currentPlayer = null;
let currentBid = 0;
let highestBidder = null;
let countdown = null;
let timeLeft = 0;
const users = {};
const socketToUser = {};

function broadcastUsers() {
  io.emit("usersUpdate", users);
}

function endAuction() {
  if (highestBidder) users[highestBidder].credits -= currentBid;
  io.emit("auctionEnded", {
    player: currentPlayer,
    winner: highestBidder,
    price: currentBid,
    users
  });
  currentPlayer = null;
  currentBid = 0;
  highestBidder = null;
  broadcastUsers();
}

function startCountdown() {
  if (countdown) clearInterval(countdown);
  timeLeft = COUNTDOWN_SEC;
  io.emit("countdownUpdate", timeLeft);
  countdown = setInterval(() => {
    timeLeft -= 1;
    io.emit("countdownUpdate", timeLeft);
    if (timeLeft <= 0) {
      clearInterval(countdown);
      countdown = null;
      endAuction();
    }
  }, 1000);
}

io.on("connection", (socket) => {
  socket.on("registerUser", ({ username, credits = 500, admin = false }) => {
    users[username] = { credits, admin, socketId: socket.id };
    socketToUser[socket.id] = username;
    broadcastUsers();
  });

  socket.on("startAuction", ({ user, player }) => {
    if (!users[user]?.admin || currentPlayer) return;
    currentPlayer = player;
    currentBid = 0;
    highestBidder = null;
    io.emit("auctionStarted", { player, currentBid });
    startCountdown();
  });

  socket.on("makeBid", ({ user }) => {
    if (!currentPlayer || !users[user]) return;
    const newBid = currentBid + 1;
    if (users[user].credits < newBid) {
      socket.emit("bidRejected", { reason: "Crediti insufficienti" });
      return;
    }
    currentBid = newBid;
    highestBidder = user;
    io.emit("bidUpdate", { currentBid, highestBidder });
    startCountdown();
  });

  socket.on("disconnect", () => {
    const username = socketToUser[socket.id];
    if (username) {
      delete users[username];
      delete socketToUser[socket.id];
      broadcastUsers();
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Server in ascolto su", PORT));
