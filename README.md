# WordiX

Real-time multiplayer Wordle I made for my networks class. You can play with up to 10 people in the same room - everyone guesses the same word and points are based on speed and how many tries it took.

**Built with:** Python (asyncio + websockets) and React + Vite

Computer Networks course, Year 2  
Transilvania University of Brașov  
May 2026

---

## Running it

Need Python 3.9+ and Node 18+.

### Quick start (easiest way)

```bash
./start.sh
```

Done. The script checks if you have the dependencies, installs what's missing, starts the server in the background, and fires up the dev server. Press Ctrl+C to kill both.

Open `http://localhost:5173` in your browser.

### Manual way (if you prefer separate terminals)

```bash
# Terminal 1
pip3 install websockets
python3 wordix_ws_server.py

# Terminal 2
cd frontend
npm install
npm run dev
```

### Using the virtual environment

There's a `.venv` folder already set up:

```bash
source .venv/bin/activate
python3 wordix_ws_server.py
```

### Changing round count

Default is 5 rounds. To change:

```bash
WORDIX_ROUNDS=3 ./start.sh
```

### Logs

Server writes to `wordix_ws.log` in the project folder (plus stdout). Helpful when things break.

---

## How it works

1. Open the game, enter your name and pick an emoji
2. Create a room (Normal or Hard mode) or join one with a code
3. Once 2+ people join, the round starts automatically
4. Everyone guesses the same 5-letter word
5. After the round, scores show up. Play through all rounds, highest total wins

**Hard mode:** You have to reuse all the green/yellow letters you've found in every guess. Way harder than it sounds.

**Hints:** 2 per round. Shows you one letter position but costs 30 points.

---

## Under the hood

### Backend

`wordix_ws_server.py` does all the heavy lifting:

- **RoomManager** handles connections, validates names, routes people to rooms
- **GameRoom** (one per active room) manages:
  - Round/series timers with asyncio tasks
  - Player state (attempts, score, hints, etc.)
  - Wordle algorithm and scoring

### Frontend

Everything game-related is in `useWordixGame.js` - one big custom hook that manages WebSocket and state. Made things way cleaner than scattering state everywhere.

UI switches between phases:
- **LobbyPhase:** name/server/mode picker (has `EmojiPicker` for avatars)
- **WaitingPhase:** room code, invite link, player list
- **PlayingPhase:** grid, keyboard, timer (`GuessGrid`, `Keyboard`, `Countdown`)
- **GameOverPhase:** round results, next round countdown (`Scoreboard`)
- **SeriesOverPhase:** final winner announcement

All text is in `translations.js` so it's easy to change or add languages. Error codes from the server get mapped to actual messages there too.

`Toast` component shows notifications (invalid word, hints, etc.).

---

## Protocol

Messages are JSON, max 4KB.

### Client → Server

| Type | Fields | Does what |
|------|--------|-----------|
| `create_room` | `player_name`, `emoji`, `hard_mode` | Creates room |
| `join_room` | `player_name`, `emoji`, `code` | Joins room |
| `guess` | `word` | Submits guess |
| `hint` | — | Asks for hint |

### Server → Client

| Type | Fields | Means |
|------|--------|-------|
| `room_joined` | `code` | You're in |
| `player_update` | `players[]` | Someone joined/left |
| `game_start` | settings | Round starting |
| `feedback` | `feedback[]`, `attempts` | Guess result |
| `hint_response` | `position`, `letter` | Here's your hint |
| `game_over` | `winner`, `word`, `leaderboard[]` | Round done |
| `series_over` | `champion`, `standings[]` | Series done |
| `info` / `error` | `code`, params | Info or error |

### Common errors

- `ROOM_FULL` — 10 players max
- `NAME_TAKEN` — pick another name
- `WRONG_LENGTH` — needs to be 5 letters
- `NOT_IN_DICTIONARY` — not a valid word
- `RATE_LIMITED` — too fast, wait 1.5s between guesses
- `HARD_MODE_VIOLATION` — forgot to reuse a revealed letter
- `NO_HINTS_LEFT` — you used both already

There's more in the code.

---

## Scoring

Per round:

- Start with 100 points
- `(7 - attempts) × 20` for fewer tries
- Up to 60 bonus for speed
- -30 per hint used

**Range:** 0-280 points per round

Don't guess it? 0 points. Scores stack across rounds.

---

## Security

Basic stuff to prevent abuse:

- **Timeout:** First message needs to arrive in 10s
- **Name validation:** 20 chars max, no weird characters
- **Rate limit:** 1.5s cooldown between guesses
- **Message cap:** 4KB limit on frames

Not bulletproof but good enough for a class project.

---

## Files

```
Wordle/
├── start.sh                     # One-command start script
├── wordix_ws_server.py          # Server
├── wordix_ws.log                # Server logs
├── data/
│   └── targets_en.txt           # ~480 words
├── docs/
│   ├── 1_enunt.md              # Rules (Romanian)
│   ├── 2_implementare.md       # Implementation (Romanian)
│   └── 3_structuri.md          # Data structures (Romanian)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── translations.js      # All UI text
    │   ├── hooks/
    │   │   └── useWordixGame.js
    │   └── components/
    │       ├── LobbyPhase.jsx
    │       ├── WaitingPhase.jsx
    │       ├── PlayingPhase.jsx
    │       ├── GameOverPhase.jsx
    │       ├── SeriesOverPhase.jsx
    │       ├── GuessGrid.jsx
    │       ├── Keyboard.jsx
    │       ├── Countdown.jsx
    │       ├── EmojiPicker.jsx
    │       ├── PlayerList.jsx
    │       ├── Scoreboard.jsx
    │       └── Toast.jsx
    └── package.json
```

---

## What I learned

First time really using WebSockets (not just basic HTTP). Some takeaways:

**AsyncIO** was confusing initially but it clicks eventually. Nice for handling multiple connections. Each room gets its own async tasks for timers and game logic.

**React state management** gets messy with multiple game phases. Putting everything in one hook (`useWordixGame`) helped a lot. At first I had state scattered everywhere and it was a nightmare.

**Hard mode validation** took more work than expected. You have to track which letters are revealed and verify every guess includes them. Got it wrong the first couple times.

**Race conditions** are real. When multiple people finish at the same millisecond, you need to be careful about winner logic. Used locks to prevent weirdness.

---

## Could be better

Things I'd add with more time:

- **Persistent stats** - SQLite to track wins, averages, streaks
- **Password-protected rooms** - right now anyone with the code can join
- **More modes** - blitz mode (30s rounds), co-op, daily challenge
- **Better word list** - current one's fine but could be bigger/better
- **Mobile app** - React Native version
- **Spectator mode** - watch games without playing
- **Chat** - would be fun to trash talk between rounds

But for a networks project it's solid as-is.

---

## Testing

Tried it with:
- 2 players (minimum to start)
- 5 players (sweet spot)
- 10 players (max capacity)

Works on localhost and LAN. Haven't tested over internet but should work if you port forward.

Had 4 friends test it - feedback was good, especially hard mode where everyone struggles together.

---

## Known bugs

Not perfect:

- **Timer drift:** Client and server countdowns can be off by 1-2 seconds. Annoying but not game-breaking.
- **No reconnect:** If you DC mid-round you're out until next round. Might add this later.
- **English only:** Word list is all English. Would be cool to add Romanian/other languages.

Nothing major.

---

## Final notes

Fun project overall. Learned a ton about WebSockets, async stuff, and managing complex state in React. Way more interesting than solo Wordle.

If you want to try it, clone the repo and run `./start.sh`. Pretty self-explanatory from there.

Code's all there if you want to poke around.

---

danielbuilds27  
May 11, 2026
