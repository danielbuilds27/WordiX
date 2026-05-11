# WordiX - Real-time Multiplayer Wordle

A multiplayer word-guessing game running on WebSocket infrastructure that supports up to 10 concurrent players. Built to demonstrate networking concepts for Computer Networks course.

---

## ✨ Features

- **Real-time Multiplayer:** Up to 10 players in the same room
- **Dual Game Modes:** Normal and Hard mode (forced letter reuse)
- **Smart Scoring System:** Points based on attempts, speed, and hint usage
- **Live Competition:** Everyone guesses the same word simultaneously
- **Instant Feedback:** Color-coded letter hints after each guess
- **Hint System:** 2 hints per round (30-point penalty each)
- **Series Mode:** Configurable multi-round tournaments
- **Room System:** Private 6-character room codes
- **Cross-platform:** Works on desktop, tablet, and mobile browsers

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | Python 3.9+ | Server logic |
| Async Framework | asyncio | Concurrent connections |
| Protocol | WebSockets | Real-time communication |
| Frontend Framework | React 18 | UI components |
| Build Tool | Vite 5 | Fast dev server & bundling |
| State Management | Custom Hooks | WebSocket + game state |
| Dictionary | English 5-letter words | ~480 valid words |

---

## 📋 Software Stack

- **Language:** Python 3.9+
- **Async I/O:** asyncio + websockets 12.0
- **Frontend:** React 18 + Vite 5
- **Styling:** Custom CSS
- **Word List:** English dictionary (~480 targets)

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/danielbuilds27/WordiX.git
cd WordiX
```

### 2. One-Command Setup (Recommended)

```bash
./start.sh
```

This will:
- Check for Python 3.9+ and Node 18+
- Install system dependencies
- Create Python virtual environment
- Install Python packages (`websockets`)
- Install frontend dependencies (`npm install`)
- Start WebSocket server (background)
- Launch Vite dev server

### 3. Manual Setup (Two Terminals)

**Terminal 1 - Backend:**
```bash
pip3 install websockets
python3 wordix_ws_server.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Game

Open browser at: `http://localhost:5173`

---

## 📱 How to Play

### Setup
1. **Enter Name:** Pick a username (max 20 characters)
2. **Choose Avatar:** Select an emoji
3. **Select Mode:**
   - **Normal:** Standard Wordle rules
   - **Hard:** Must reuse all revealed letters

### Gameplay
1. **Create/Join Room:** Generate or enter 6-character room code
2. **Wait for Players:** Minimum 2 players to start
3. **Guess Word:** Type 5-letter words (6 attempts max)
4. **Get Feedback:**
   - 🟩 **Correct:** Right letter, right position
   - 🟨 **Present:** Right letter, wrong position
   - ⬜ **Absent:** Letter not in word
5. **Use Hints:** Request letter reveals (2 per round, -30 points each)
6. **Complete Series:** Play through all rounds (default: 5)

### Winning
- **Per Round:** First correct guess or highest score
- **Overall:** Highest cumulative score across all rounds

---

## 🌐 Game Modes

### Normal Mode
- Standard Wordle rules
- Any valid 5-letter word accepted
- No restrictions on guesses

### Hard Mode
- **Forced Letter Reuse:** Every guess MUST include all previously revealed letters
- **Validation:** `HARD_MODE_VIOLATION` error if rules broken
- **Strategy:** Requires careful planning

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Server                         │
│                 (wordix_ws_server.py)                        │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  Room   │         │Detection│         │ Scoring │
    │ Manager │         │ Engine  │         │ System  │
    └─────────┘         └─────────┘         └─────────┘
         │                    │                    │
    Validates          Wordle Algorithm      Points Calculator
    Connections        Letter Checking       Speed/Attempt Bonus
         
         ↓                    ↓                    ↓
    
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│                    (Vite Dev Server)                         │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  Lobby  │         │ Playing │         │Game Over│
    │  Phase  │         │  Phase  │         │  Phase  │
    └─────────┘         └─────────┘         └─────────┘
```

### Threading Model

- **Main Thread:** WebSocket server (asyncio event loop)
- **Per-Room Tasks:** Async countdown timers
- **Per-Player:** Async message handlers
- **Frontend:** Single-threaded React app

---

## 📊 WebSocket Protocol

### Message Format
All messages are UTF-8 JSON with max 4KB frame size.

### Client → Server

| Type | Fields | Description |
|------|--------|-------------|
| `create_room` | `player_name`, `emoji`, `hard_mode` | Create private room |
| `join_room` | `player_name`, `emoji`, `code` | Join existing room |
| `guess` | `word` | Submit 5-letter guess |
| `hint` | — | Request letter hint |

### Server → Client

| Type | Fields | Description |
|------|--------|-------------|
| `room_joined` | `code` | Room entry confirmed |
| `player_update` | `players[]` | Roster change |
| `game_start` | `word_length`, `max_attempts`, `time_limit`, etc. | Round starting |
| `feedback` | `feedback[]`, `attempts`, `game_over` | Guess response |
| `hint_response` | `position`, `letter`, `hints_used`, `penalty` | Hint revealed |
| `game_over` | `winner`, `word`, `leaderboard[]` | Round ended |
| `series_over` | `champion`, `standings[]` | Series complete |
| `info` / `error` | `code`, optional params | Status messages |

### Error Codes

| Code | Trigger | Resolution |
|------|---------|------------|
| `ROOM_FULL` | 10 players reached | Wait or create new room |
| `NAME_TAKEN` | Duplicate name | Choose different name |
| `WRONG_LENGTH` | Not 5 letters | Type 5-letter word |
| `NOT_IN_DICTIONARY` | Invalid word | Try different word |
| `RATE_LIMITED` | <1.5s between guesses | Wait before next guess |
| `HARD_MODE_VIOLATION` | Missing revealed letter | Include all revealed letters |
| `NO_HINTS_LEFT` | Used 2 hints | Continue without hints |

---

## 📈 Scoring System

### Formula

```
Total Score = Base + Attempt Bonus + Speed Bonus - Hint Penalty
```

### Components

| Component | Formula | Range | Example |
|-----------|---------|-------|---------|
| **Base** | Fixed | 100 pts | 100 |
| **Attempt Bonus** | `(7 - attempts) × 20` | 20-120 pts | 3 attempts → 80 pts |
| **Speed Bonus** | `max(0, 60 - seconds)` | 0-60 pts | 25s → 35 pts |
| **Hint Penalty** | `hints_used × 30` | 0-60 pts | 1 hint → -30 pts |

### Example Calculation

```
Player guesses in 3 attempts, 25 seconds, 1 hint used:
Base:          100
Attempt:       (7-3)×20 = 80
Speed:         60-25 = 35
Hint:          1×30 = -30
────────────────────────
Total:         185 points
```

**Failed guess:** 0 points (no partial credit)

---

## 🔐 Security Features

| Measure | Implementation | Purpose |
|---------|----------------|---------|
| **Connection Timeout** | 10s first message | Prevent idle connections |
| **Name Validation** | Max 20 chars, `\w` only | Prevent injection |
| **Rate Limiting** | 1.5s between guesses | Anti-spam |
| **Message Size Cap** | 4KB frame limit | DoS prevention |
| **Input Sanitization** | Word validation | Dictionary enforcement |

---

## 📂 Project Structure

```
WordiX/
├── start.sh                     # One-command launcher
├── wordix_ws_server.py          # WebSocket server
├── wordix_ws.log                # Runtime logs (auto-generated)
├── .env.example                 # Environment template
├── .gitignore                   # Git exclusions
├── requirements.txt             # Python dependencies
├── data/
│   └── targets_en.txt           # Word list (~480 words)
├── docs/
│   ├── 1_enunt.md              # Game rules (Romanian)
│   ├── 2_implementare.md       # Implementation notes
│   └── 3_structuri.md          # Data structures reference
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx              # Main router
        ├── App.css              # Global styles
        ├── translations.js      # i18n strings
        ├── hooks/
        │   └── useWordixGame.js # WebSocket + state hook
        └── components/
            ├── LobbyPhase.jsx           # Name/server selection
            ├── WaitingPhase.jsx         # Room lobby
            ├── PlayingPhase.jsx         # Active game
            ├── GameOverPhase.jsx        # Round results
            ├── SeriesOverPhase.jsx      # Final standings
            ├── GuessGrid.jsx            # 6×5 letter grid
            ├── Keyboard.jsx             # On-screen keyboard
            ├── Countdown.jsx            # Round timer
            ├── EmojiPicker.jsx          # Avatar selector
            ├── PlayerList.jsx           # Player roster
            ├── Scoreboard.jsx           # Score breakdown
            └── Toast.jsx                # Notifications
```

---

## 🧪 Configuration

### Environment Variables

```bash
# Server settings
WORDIX_ROUNDS=5          # Number of rounds per series
WORDIX_PORT=8765         # WebSocket port
WORDIX_HOST=0.0.0.0      # Listen address

# Game settings
MAX_PLAYERS=10           # Room capacity
TIME_LIMIT=120           # Round duration (seconds)
MAX_HINTS=2              # Hints per player per round
```

### Changing Round Count

```bash
# Via environment variable
WORDIX_ROUNDS=3 ./start.sh

# Or edit .env file
echo "WORDIX_ROUNDS=3" > .env
```

---

## 📊 Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **Max Concurrent Rooms** | 50+ | Tested with asyncio |
| **Players Per Room** | 2-10 | Hard limit enforced |
| **Message Latency** | <100ms | Local network |
| **Server RAM Usage** | ~150MB | With 10 active rooms |
| **Frontend Bundle** | ~500KB | Gzipped |
| **TTFB** | <50ms | Vite dev server |

---

## 🐛 Troubleshooting

### WebSocket Connection Failed

```bash
# Check if server is running
ps aux | grep wordix_ws_server

# Check port availability
netstat -an | grep 8765

# Restart server
pkill -f wordix_ws_server.py
python3 wordix_ws_server.py
```

### Frontend Won't Build

```bash
# Clear node_modules
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstall
cd frontend && npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Dictionary Not Loading

```bash
# Verify file exists
ls -lh data/targets_en.txt

# Check file permissions
chmod 644 data/targets_en.txt
```

### Port Already in Use

```bash
# Find process using port 8765
lsof -ti:8765

# Kill process
kill -9 $(lsof -ti:8765)

# Or change port
WORDIX_PORT=8766 python3 wordix_ws_server.py
```

---

## 👥 Team

**Developer:** Daniel Matei ([@danielbuilds27](https://github.com/danielbuilds27))

**Timeline:** April 2026 - May 2026 (6 weeks)  
**Institution:** Transilvania University of Brașov  
**Course:** Computer Networks, Year 2  
**Project Type:** Individual coursework

---

## 🧪 Testing

### Manual Testing

**Tested scenarios:**
- ✅ 2-player minimum (game start validation)
- ✅ 10-player maximum (room capacity)
- ✅ Normal mode (standard rules)
- ✅ Hard mode (forced letter reuse)
- ✅ Hint system (2 per round, -30 points)
- ✅ Series completion (5 rounds)
- ✅ Disconnection handling (mid-game disconnect)

### Known Issues

- **Timer Drift:** Client/server countdown can desync by 1-2 seconds
- **No Reconnect:** Disconnected players can't rejoin current round
- **English Only:** Dictionary is English-only (no i18n yet)

---

## 🎓 What I Learned

### Technical Skills

- **WebSocket Protocol:** Real-time bidirectional communication
- **AsyncIO:** Concurrent request handling with coroutines
- **React Hooks:** Custom hooks for complex state management
- **Game State Management:** Multi-phase UI with WebSocket sync
- **Rate Limiting:** Preventing spam and abuse

### Challenges Overcome

1. **Race Conditions:** Multiple players finishing simultaneously → Used asyncio locks
2. **State Synchronization:** Keeping client/server in sync → Centralized state in useWordixGame hook
3. **Hard Mode Validation:** Tracking revealed letters across guesses → Server-side state management
4. **Timer Accuracy:** Client/server countdown drift → Accepted 1-2s tolerance

---

## 🚀 Future Improvements

### Planned Features
- [ ] **Persistent Stats:** SQLite database for win rates, streaks
- [ ] **Password Rooms:** Optional room passwords
- [ ] **Spectator Mode:** Watch games without playing
- [ ] **More Languages:** Spanish, French word lists
- [ ] **Chat System:** In-game text chat
- [ ] **Daily Challenge:** Global daily word

### Technical Improvements
- [ ] **Reconnection:** Mid-game rejoin capability
- [ ] **Mobile App:** React Native version
- [ ] **Analytics:** Player behavior tracking
- [ ] **Admin Panel:** Room management dashboard

---

## 📄 License

This project is for educational purposes as part of Computer Networks coursework.

---

## 🙏 Acknowledgments

- **Institution:** Transilvania University of Brașov
- **Inspiration:** Original Wordle by Josh Wardle
- **Libraries:** Python websockets, React, Vite

---

## 📞 Support

**Issues:** [GitHub Issues](https://github.com/danielbuilds27/WordiX/issues)  
**Documentation:** [docs/](docs/)  
**Contact:** [@danielbuilds27](https://github.com/danielbuilds27)

---

**⭐ Star this repo if you found it useful!**

Last updated: May 11, 2026
