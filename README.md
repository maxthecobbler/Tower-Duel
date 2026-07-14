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
