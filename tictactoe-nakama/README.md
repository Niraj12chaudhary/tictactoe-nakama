<!--
# LILA Engineering Assignment - Multiplayer Tic-Tac-Toe

This project is a production-ready, server-authoritative multiplayer Tic-Tac-Toe game built using **Nakama** as the backend infrastructure and **React/TypeScript** for the frontend.

## 🚀 Live Demos
- **Game URL (Frontend):** `[INSERT_YOUR_VERCEL_OR_NETLIFY_LINK_HERE]`
- **Nakama Server Endpoint:** `[INSERT_YOUR_RENDER_URL_HERE] (e.g. wss://tictactoe-nakama.onrender.com)`

---

## ✅ Features & Deliverables Completed

### Core Requirements
- [x] **Server-Authoritative Logic:** The client only sends intents (OpCode `1 MAKE_MOVE`). The Nakama backend strictly validates turns, positions, and game rules. Cheating is impossible.
- [x] **Matchmaking System:** Fully integrated Nakama Matchmaker. Players can auto-queue or create/join Private Rooms via unique Match IDs.
- [x] **Graceful Disconnects:** If a player leaves the match early, the server immediately detects it and awards a default win to the remaining player.
- [x] **Cloud Deployment:** Backend deployed to **Render** (via Docker), Frontend hosted on Vercel/Netlify.

### Bonus Features Implemented
- [x] **Concurrent Game Support:** The architecture safely supports infinite simultaneous game sessions. Each match creates an isolated, stateful authoritative Nakama Match Instance (`matchHandler.ts`).
- [x] **Leaderboard System:** Global Ranking system (`leaderboard.ts`). Tracks cumulative wins and assigns points automatically at the end of each authoritative match.
- [x] **Timer-Based Game Mode:** Players can queue for "Timed" mode. The server enforces a strict 30-second move timer. If the timer expires, the server triggers an automatic forfeit (`timer.ts`).

---

## 🏗️ Architecture and Design Decisions

```text
+-----------------+    HTTP + WebSocket    +--------------------------+
| React Client    | <--------------------> | Nakama 3.22             |

| Vite + TS | | - Device auth |
| Zustand store | | - RPCs |
| nakama-js | | - Authoritative match |
+--------+--------+ | - Matchmaker hook |
| | - Leaderboard writes |
| +------------+-------------+
| |
| | SQL persistence
+--------------------------------------------> +------------------+
| PostgreSQL 14 |
| - Sessions & Data|
+------------------+

````

1. **Zustand over Redux:** The client leverages Zustand for lightweight, reactive state management. The UI perfectly mirrors the authoritative server state.
2. **Hooking the Matchmaker:** Standard Nakama matchmaker puts players in a P2P mesh by default. I intercept this using `registerMatchmakerMatched` on the backend to immediately upgrade matches to an Authoritative Server instance.
3. **Timer Authority:** Turn timers are evaluated in the backend's `matchLoop` tick. This prevents clients from manipulating local clocks or freezing the browser tab to avoid losing.

---

## 💻 Setup and Installation (Local Development)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd tictactoe-nakama
````

2. **Install Dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```
3. **Build the Backend Runtime:**
   ```bash
   cd backend && npm run build && cd ..
   ```
4. **Start the Docker Stack:**
   ```bash
   docker-compose up -d
   ```
5. **Play Locally:**
   Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment Process Documentation

### 1. Backend Deployment (Render)

The repository is configured as Infrastructure-as-Code (IaC) for **Render** using a `render.yaml` Blueprint and a custom `Dockerfile`.

1. Push your repository to GitHub.
2. Create an account on Render.
3. Click **"New" -> "Blueprint"**.
4. Connect your GitHub repository.
5. Render will read the `render.yaml` file and automatically spin up both a **PostgreSQL Database** and the **Nakama Web Service**.
6. Copy the deployed Web Service URL (e.g., `tictactoe-nakama.onrender.com`).

### 2. Frontend Deployment (Vercel/Netlify)

Deploying the React application requires pointing it to your deployed Nakama instance.

1. Go to Vercel or Netlify and import the `/frontend` directory from your repository.
2. Set the following **Environment Variables** in the Vercel/Netlify dashboard:
   - `VITE_NAKAMA_HOST`: `[YOUR_RENDER_URL_WITHOUT_HTTPS]` (e.g., `tictactoe-nakama.onrender.com`)
   - `VITE_NAKAMA_PORT`: `443`
   - `VITE_NAKAMA_USE_SSL`: `true`
   - `VITE_NAKAMA_SERVER_KEY`: `defaultkey`
3. Deploy the application.

---

## 🎮 How to Test Multiplayer Functionality

1. **Matchmaking Validation:**
   - Open your deployed Frontend URL in two completely separate browser windows (or one normal tab, one Incognito tab).
   - In both tabs, enter a Username and click **"Find Match"**.
   - The Nakama server will pair the two clients and automatically load the game board.

2. **Private Room Isolation:**
   - Tab 1: Click **"Create Private Room"** and copy the generated Code.
   - Tab 2: Paste the Code in the input field and click **"Join Room"**.

3. **Testing Timed Forfeits (Bonus):**
   - Switch both tabs to **"Timed"** mode before searching.
   - Let the 30-second timer expire on your turn.
   - The server will intercept the timeout, declare a forfeit, and award the win to your opponent.

4. **Testing Disconnects:**
   - Join a match with two tabs.
   - Close Tab 1 entirely.
   - Tab 2 will instantly receive a "You Win! Opponent Disconnected" message from the server.
