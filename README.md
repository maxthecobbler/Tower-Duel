# 🏰 Tower Duel — Online Multiplayer

Turn-based PvP tower defense. Build harvesters, walls, turrets and troops in secret each turn; when both players hit READY, the battle resolves identically on both screens.

## How it works

- The battle simulation is **deterministic**: the server sends a seed at match start, obstacles are generated from it, and battles run at a fixed 60Hz timestep. Only *orders* ("built wall at 5,3") travel over the network.
- The server holds each player's orders until **both** have committed — your build stays secret until the fight starts.
- The server validates gold spent per turn and cross-checks both clients' post-battle state reports, so modified clients get caught (rejected orders or a desync flag).

## Run locally

```bash
cd tower-duel
npm install
npm start
```

Open http://localhost:3000 in two browser windows (or two devices on your LAN using your computer's IP). Create a private room in one, join with the 4-letter code in the other. `Play vs Bot` works offline, straight from the file, too.

## Deploy (free)

### Option A — everything on Render (simplest)

1. Push this folder to a GitHub repo.
2. On [render.com](https://render.com): **New → Web Service** → connect the repo.
3. Settings: Build command `npm install`, Start command `npm start`. Free instance type.
4. Done — your game is live at `https://your-app.onrender.com`. Share the URL.

Railway.app and Fly.io work the same way. Note: free tiers sleep when idle; the first visit after a while takes ~30s to wake.

### Option B — client on itch.io, server on Render

Good if you want itch.io's discoverability (comments, ratings, browse pages).

1. Deploy the server as in Option A.
2. Edit `public/index.html`: just **above** the main `<script>` tag add
   ```html
   <script>window.TOWER_DUEL_SERVER = "https://your-app.onrender.com";</script>
   ```
3. Zip `index.html` (name it exactly that) and upload to itch.io as an HTML game, "This file will be played in the browser" checked.

## Going bigger (ideas)

- **Turn timer** — auto-submit after N seconds so players can't stall (server-side `setTimeout` per room).
- **Rematch** — keep the room alive after game over and re-run `startGame`.
- **Reconnect** — store a session token so a refresh can rejoin the room.
- **Ranked queue** — store Elo per player name; match adjacent ratings in the quick queue.
- **Server-authoritative sim** — for serious anti-cheat, run the same sim code on the server (extract it to a shared module) instead of trusting matching client reports.

## Files

| File | Purpose |
|---|---|
| `server.js` | Express + Socket.io: static hosting, rooms, quick match, order relay, validation |
| `public/index.html` | The whole game client (rendering, sim, bot AI, networking) |
| `package.json` | Dependencies: express, socket.io |
