"use strict";
// Tower Duel — multiplayer server
// Serves the game client from /public and relays turn orders between players.
// The server is the referee: it holds each player's orders until BOTH are in
// (keeping builds secret), validates gold spent, and cross-checks the clients'
// post-battle state reports to detect desyncs/cheating.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); // allow clients hosted elsewhere (e.g. itch.io)

const START_GOLD = 14;
const COST = { wall: 3, harvester: 5, turret: 8, soldier: 4, archer: 6, brute: 10 };

const rooms = {};          // code -> room
let quickQueue = null;     // one waiting socket

const makeCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid confusion
  let c;
  do { c = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(""); }
  while (rooms[c]);
  return c;
};

function startGame(room) {
  room.seed = (Math.random() * 2 ** 31) | 0;
  room.gold = { p: START_GOLD, b: START_GOLD };
  room.orders = {};
  room.reports = {};
  room.players[0].emit("start", { seed: room.seed, side: "p" });
  room.players[1].emit("start", { seed: room.seed, side: "b" });
  console.log(`[${room.code}] game started (seed ${room.seed})`);
}

function sideOf(room, sock) { return room.players[0] === sock ? "p" : "b"; }

io.on("connection", (sock) => {
  sock.on("create", (cb) => {
    const code = makeCode();
    rooms[code] = { code, players: [sock] };
    sock.roomCode = code;
    if (typeof cb === "function") cb({ code });
  });

  sock.on("join", (code, cb) => {
    const room = rooms[String(code || "").toUpperCase()];
    if (!room || room.players.length !== 1) {
      if (typeof cb === "function") cb({ error: "Room not found (or already full)." });
      return;
    }
    room.players.push(sock);
    sock.roomCode = room.code;
    if (typeof cb === "function") cb({ ok: true });
    startGame(room);
  });

  sock.on("quick", (cb) => {
    if (quickQueue && quickQueue.connected && quickQueue !== sock) {
      const code = makeCode();
      rooms[code] = { code, players: [quickQueue, sock] };
      quickQueue.roomCode = code;
      sock.roomCode = code;
      quickQueue = null;
      if (typeof cb === "function") cb({ ok: true });
      startGame(rooms[code]);
    } else {
      quickQueue = sock;
      if (typeof cb === "function") cb({ waiting: true });
    }
  });

  // a player locks in their turn orders
  sock.on("orders", (orders) => {
    const room = rooms[sock.roomCode];
    if (!room || !room.gold) return;
    const side = sideOf(room, sock);
    if (!Array.isArray(orders)) orders = [];

    // anti-cheat: total cost must fit the server-tracked gold for that side
    let cost = 0;
    for (const o of orders) cost += COST[o && o.kind] ?? 1e9;
    if (cost > room.gold[side] + 1e-6) {
      sock.emit("rejected");
      console.log(`[${room.code}] rejected ${side}: spent ${cost} > ${room.gold[side]}`);
      return;
    }
    room.orders[side] = orders;

    // both in → deduct, relay to both clients simultaneously
    if (room.orders.p && room.orders.b) {
      for (const s of ["p", "b"])
        for (const o of room.orders[s]) room.gold[s] -= COST[o.kind];
      const payload = { p: room.orders.p, b: room.orders.b };
      room.players.forEach((p) => p.emit("resolve", payload));
      room.orders = {};
    }
  });

  // post-battle state report from each client; must match exactly
  sock.on("report", (rep) => {
    const room = rooms[sock.roomCode];
    if (!room || !room.gold) return;
    const side = sideOf(room, sock);
    room.reports[side] = rep;
    if (room.reports.p && room.reports.b) {
      if (JSON.stringify(room.reports.p) !== JSON.stringify(room.reports.b)) {
        room.players.forEach((p) => p.emit("desync"));
        console.log(`[${room.code}] DESYNC`, room.reports);
      } else {
        // adopt agreed gold totals (includes income from surviving harvesters)
        room.gold.p = room.reports.p.pG;
        room.gold.b = room.reports.p.bG;
      }
      room.reports = {};
    }
  });

  sock.on("disconnect", () => {
    if (quickQueue === sock) quickQueue = null;
    const room = rooms[sock.roomCode];
    if (room) {
      room.players.forEach((p) => { if (p !== sock) p.emit("opponentLeft"); });
      delete rooms[room.code];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Tower Duel server on http://localhost:${PORT}`));
