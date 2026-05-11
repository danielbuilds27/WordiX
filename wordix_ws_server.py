"""
Wordix - WebSocket Server with private rooms and scoring system

Usage:
    pip3 install websockets
    python3 wordix_ws_server.py
"""

import asyncio
import json
import os
import random
import re
import time
from datetime import datetime
import websockets

# ── Config ────────────────────────────────────────────────────────────────────
WS_HOST          = "0.0.0.0"
WS_PORT          = 8765
WORD_LENGTH      = 5
MAX_ATTEMPTS     = 6
MAX_PLAYERS      = 10

# Security
CONNECT_TIMEOUT  = 10       # seconds to send first message after connecting
GUESS_COOLDOWN   = 1.5      # minimum seconds between guesses per player
ROUND_TIMEOUT    = 120      # seconds per round before forced end
MAX_MSG_BYTES    = 4_096    # max WebSocket message size
NAME_MAX_LEN     = 20       # max player name length
_NAME_RE         = re.compile(r'^[\w\s\-\.]+$', re.UNICODE)
MAX_HINTS        = 2        # hints per player per round
HINT_PENALTY     = 30       # points deducted per hint used

# ── Word lists ────────────────────────────────────────────────────────────────
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

_FALLBACK_EN = [
    "ADIEU","AUDIO","OUNCE","STARE","SLATE","CRANE","CRATE","TRACE","SPACE","SPARE",
    "SNARE","SHARE","SCARE","ARISE","RAISE","IRATE","AROSE","ROAST","TEARS","STALE",
    "LEAST","STEAL","TALES","WHICH","THINK","BRING","THROW","WRONG","HOUSE","MOUSE",
    "HORSE","THOSE","WHOSE","SHAPE","GRAPE","SNAKE","BRAKE","SHAKE","BLADE","SHADE",
    "TRADE","GRADE","FRAME","BLAME","FLAME","GAMES","NAMES","LEMON","TORCH","STONE",
]

def _load_words(filename: str, fallback: list) -> list:
    path = os.path.join(_DATA_DIR, filename)
    try:
        with open(path, encoding="utf-8") as f:
            words = [w.strip().upper() for w in f
                     if w.strip() and len(w.strip()) == WORD_LENGTH]
        if words:
            return words
    except FileNotFoundError:
        pass
    return fallback

TARGETS_EN: list = _load_words("targets_en.txt", _FALLBACK_EN)
VALID_EN:   set  = set(TARGETS_EN)

CORRECT = "correct"
PRESENT = "present"
ABSENT  = "absent"

# ── Message helpers ───────────────────────────────────────────────────────────
def info_msg(code: str, **kw) -> dict:
    return {"type": "info",  "code": code, **kw}

def error_msg(code: str, **kw) -> dict:
    return {"type": "error", "code": code, **kw}

# ── Logging ───────────────────────────────────────────────────────────────────
_PID      = os.getpid()
_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wordix_ws.log")

def _log(level: str, msg: str):
    now  = datetime.now().strftime("%b %d %H:%M:%S")
    line = f"{now} wordix-ws[{_PID}]: {level} - {msg}"
    print(line)
    with open(_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def log_info(msg):  _log("INFO",  msg)
def log_error(msg): _log("ERROR", msg)

# ── Wordle algorithm ──────────────────────────────────────────────────────────
def check_guess(target: str, guess: str) -> list:
    result    = [{"letter": guess[i], "status": ABSENT} for i in range(WORD_LENGTH)]
    remaining = []
    for i in range(WORD_LENGTH):
        if guess[i] == target[i]:
            result[i]["status"] = CORRECT
        else:
            remaining.append(target[i])
    for i in range(WORD_LENGTH):
        if result[i]["status"] == CORRECT:
            continue
        if guess[i] in remaining:
            result[i]["status"] = PRESENT
            remaining.remove(guess[i])
    return result

# ── Scoring ───────────────────────────────────────────────────────────────────
def calculate_score(attempts: int, elapsed: float, won: bool, hint_count: int = 0) -> dict:
    if not won:
        return {"base": 0, "attempt_bonus": 0, "speed_bonus": 0, "hint_penalty": 0, "total": 0}
    base          = 100
    attempt_bonus = (MAX_ATTEMPTS + 1 - attempts) * 20   # 20–120
    speed_bonus   = max(0, 60 - int(elapsed))             #  0– 60
    hint_penalty  = hint_count * HINT_PENALTY
    return {
        "base":          base,
        "attempt_bonus": attempt_bonus,
        "speed_bonus":   speed_bonus,
        "hint_penalty":  hint_penalty,
        "total":         max(0, base + attempt_bonus + speed_bonus - hint_penalty),
    }

# ── Player state ──────────────────────────────────────────────────────────────
class PlayerState:
    def __init__(self, name: str, pid: int, emoji: str = "🎮"):
        self.name            = name
        self.pid             = pid
        self.emoji           = emoji
        self.attempts        = 0
        self.won             = False
        self.finished        = False
        self.win_elapsed     = 0.0
        self.round_score     = 0
        self.last_guess_time  = 0.0   # rate limiting
        self.revealed_greens: dict = {}   # pos → letter (hard mode)
        self.revealed_yellows: set = set()
        self.hint_count              = 0
        self.revealed_hint_positions: set = set()

    def reset(self):
        self.attempts         = 0
        self.won              = False
        self.finished         = False
        self.win_elapsed      = 0.0
        self.round_score      = 0
        self.last_guess_time  = 0.0
        self.revealed_greens  = {}
        self.revealed_yellows = set()
        self.hint_count              = 0
        self.revealed_hint_positions = set()

    def add_guess(self, feedback: list):
        self.attempts += 1
        if all(f["status"] == CORRECT for f in feedback):
            self.won = self.finished = True
        elif self.attempts >= MAX_ATTEMPTS:
            self.finished = True

    def to_dict(self):
        return {
            "player_id":   self.pid,
            "player_name": self.name,
            "emoji":       self.emoji,
            "attempts":    self.attempts,
            "won":         self.won,
            "finished":    self.finished,
        }

# ── Game room ─────────────────────────────────────────────────────────────────
class GameRoom:
    """One isolated game session. Many rooms can run in parallel."""

    def __init__(self, code: str, words: list, valid_words: set,
                 total_rounds: int, hard_mode: bool, on_empty):
        self.code          = code
        self.words         = words
        self.valid_words   = valid_words
        self.total_rounds  = total_rounds
        self.on_empty      = on_empty   # async callback(code) when room empties

        self.clients: dict   = {}
        self.lock            = asyncio.Lock()
        self.game_active     = False
        self.winner          = None
        self.target_word     = ""
        self.current_round   = 0
        self.game_start_time = 0.0
        self.scores          = {}
        self.rounds_won      = {}
        self.used_words: set = set()
        self.hard_mode       = hard_mode
        self._timeout_task   = None

    # ── Connection entry-point ────────────────────────────────────────────

    async def handle_player(self, websocket, name: str, emoji: str):
        player = None
        try:
            async with self.lock:
                if len(self.clients) >= MAX_PLAYERS:
                    await self._send(websocket, error_msg("ROOM_FULL"))
                    return
                if any(p.name == name for p in self.clients.values()):
                    await self._send(websocket, error_msg("NAME_TAKEN", name=name))
                    return
                player = PlayerState(name, len(self.clients) + 1, emoji=emoji)
                self.clients[websocket] = player
                count  = len(self.clients)
                active = self.game_active

            # Confirm the room join first
            await self._send(websocket, {"type": "room_joined", "code": self.code})

            log_info(f"[{self.code}] '{name}' connected ({count} players)")
            await self._broadcast_players()

            if count >= 2 and not active:
                await asyncio.sleep(0.8)
                await self._start_game()
            elif active:
                await self._send(websocket, info_msg("GAME_IN_PROGRESS"))

            async for raw in websocket:
                try:
                    msg = json.loads(raw)
                    if msg.get("type") == "guess":
                        await self._handle_guess(websocket, player, msg)
                    elif msg.get("type") == "hint":
                        await self._handle_hint(websocket, player)
                except json.JSONDecodeError:
                    pass

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            log_error(f"[{self.code}] Client error: {e}")
        finally:
            if player:
                log_info(f"[{self.code}] '{player.name}' disconnected")
            async with self.lock:
                self.clients.pop(websocket, None)
                empty = len(self.clients) == 0
            await self._broadcast_players()
            if empty:
                asyncio.create_task(self.on_empty(self.code))

    # ── Game logic ────────────────────────────────────────────────────────

    async def _start_game(self):
        async with self.lock:
            if self.game_active:
                return
            if len(self.clients) < 2:
                return
            for p in self.clients.values():
                p.reset()
            pool = [w for w in self.words if w not in self.used_words]
            if not pool:
                self.used_words.clear()
                pool = list(self.words)
            self.target_word = random.choice(pool)
            self.used_words.add(self.target_word)
            self.game_active     = True
            self.winner          = None
            self.current_round  += 1
            self.game_start_time = time.time()
            count                = len(self.clients)

        if self._timeout_task and not self._timeout_task.done():
            self._timeout_task.cancel()
        self._timeout_task = asyncio.create_task(self._round_timeout())

        log_info(f"[{self.code}] Round {self.current_round}/{self.total_rounds} | '{self.target_word}' | {count} players | hard={self.hard_mode}")
        await self._broadcast({
            "type":         "game_start",
            "word_length":  WORD_LENGTH,
            "max_attempts": MAX_ATTEMPTS,
            "time_limit":   ROUND_TIMEOUT,
            "hard_mode":    self.hard_mode,
            "player_count": count,
            "round":        self.current_round,
            "total_rounds": self.total_rounds,
            "max_hints":    MAX_HINTS,
            "hint_penalty": HINT_PENALTY,
        })

    async def _round_timeout(self):
        await asyncio.sleep(ROUND_TIMEOUT)
        if self.game_active:
            log_info(f"[{self.code}] Round {self.current_round} timed out ({ROUND_TIMEOUT}s)")
            await self._end_game()

    async def _handle_guess(self, websocket, player: PlayerState, msg: dict):
        if not self.game_active:
            await self._send(websocket, error_msg("GAME_NOT_STARTED")); return
        if player.finished:
            await self._send(websocket, error_msg("ALREADY_FINISHED")); return

        now = time.time()
        if now - player.last_guess_time < GUESS_COOLDOWN:
            await self._send(websocket, error_msg("RATE_LIMITED")); return
        player.last_guess_time = now

        guess = msg.get("word", "").upper()
        if len(guess) != WORD_LENGTH:
            await self._send(websocket, error_msg("WRONG_LENGTH", n=WORD_LENGTH)); return
        if guess not in self.valid_words:
            await self._send(websocket, error_msg("NOT_IN_DICTIONARY", word=guess)); return

        if self.hard_mode:
            for pos, letter in player.revealed_greens.items():
                if guess[pos] != letter:
                    await self._send(websocket, error_msg("HARD_MODE_VIOLATION", hint=f"{letter}@{pos+1}")); return
            for letter in player.revealed_yellows:
                if letter not in guess:
                    await self._send(websocket, error_msg("HARD_MODE_VIOLATION", hint=letter)); return

        fb = check_guess(self.target_word, guess)
        for i, f in enumerate(fb):
            if f['status'] == CORRECT:
                player.revealed_greens[i] = f['letter']
            elif f['status'] == PRESENT:
                player.revealed_yellows.add(f['letter'])
        player.add_guess(fb)
        if player.won:
            player.win_elapsed = time.time() - self.game_start_time
            log_info(f"[{self.code}] '{player.name}' won in {player.attempts} guesses ({player.win_elapsed:.1f}s)")
            async with self.lock:
                if not self.winner:
                    self.winner = player.name

        await self._send(websocket, {
            "type":      "feedback",
            "feedback":  fb,
            "attempts":  player.attempts,
            "game_over": player.finished,
        })

        if player.won:
            await self._end_game()
        else:
            async with self.lock:
                all_done = all(p.finished for p in self.clients.values())
            if all_done and self.game_active:
                await self._end_game()

    async def _handle_hint(self, websocket, player: PlayerState):
        if not self.game_active:
            await self._send(websocket, error_msg("GAME_NOT_STARTED")); return
        if player.finished:
            await self._send(websocket, error_msg("ALREADY_FINISHED")); return
        if player.hint_count >= MAX_HINTS:
            await self._send(websocket, error_msg("NO_HINTS_LEFT")); return

        revealed = set(player.revealed_greens.keys()) | player.revealed_hint_positions
        available = [i for i in range(WORD_LENGTH) if i not in revealed]
        if not available:
            await self._send(websocket, error_msg("ALL_REVEALED")); return

        pos    = random.choice(available)
        letter = self.target_word[pos]
        player.hint_count += 1
        player.revealed_hint_positions.add(pos)

        await self._send(websocket, {
            "type":       "hint_response",
            "position":   pos,
            "letter":     letter,
            "hints_used": player.hint_count,
            "max_hints":  MAX_HINTS,
            "penalty":    HINT_PENALTY,
        })

    async def _end_game(self):
        async with self.lock:
            if not self.game_active:
                return
            self.game_active = False
            if self._timeout_task and not self._timeout_task.done():
                self._timeout_task.cancel()
                self._timeout_task = None
            all_players      = list(self.clients.values())
            t0               = self.game_start_time

        now = time.time()
        breakdowns = {}
        for p in all_players:
            elapsed = p.win_elapsed if p.won else (now - t0)
            bd = calculate_score(p.attempts, elapsed, p.won, p.hint_count)
            p.round_score = bd["total"]
            self.scores[p.name]     = self.scores.get(p.name, 0) + p.round_score
            self.rounds_won[p.name] = self.rounds_won.get(p.name, 0) + (1 if p.won else 0)
            breakdowns[p.name] = bd

        sorted_players = sorted(all_players,
                                key=lambda p: (-p.round_score, p.attempts if p.won else 99))
        leaderboard = [
            {
                "player":        p.name,
                "emoji":         p.emoji,
                "attempts":      p.attempts,
                "won":           p.won,
                "base":          breakdowns[p.name]["base"],
                "attempt_bonus": breakdowns[p.name]["attempt_bonus"],
                "speed_bonus":   breakdowns[p.name]["speed_bonus"],
                "hint_penalty":  breakdowns[p.name]["hint_penalty"],
                "round_score":   p.round_score,
                "total_score":   self.scores.get(p.name, 0),
                "rounds_won":    self.rounds_won.get(p.name, 0),
            }
            for p in sorted_players
        ]

        log_info(f"[{self.code}] Round {self.current_round} ended | Winner: {self.winner} | Word: {self.target_word}")
        await self._broadcast({
            "type":         "game_over",
            "winner":       self.winner,
            "word":         self.target_word,
            "round":        self.current_round,
            "total_rounds": self.total_rounds,
            "leaderboard":  leaderboard,
        })
        asyncio.create_task(self._schedule_next())

    async def _schedule_next(self):
        await asyncio.sleep(10)
        async with self.lock:
            enough   = len(self.clients) >= 2
            is_final = self.current_round >= self.total_rounds
        if not enough:
            return
        if is_final:
            await self._end_series()
        else:
            await self._broadcast(info_msg("NEW_ROUND"))
            await self._start_game()

    async def _end_series(self):
        async with self.lock:
            standings = sorted(
                [{"player":      p.name, "emoji": p.emoji,
                  "total_score": self.scores.get(p.name, 0),
                  "rounds_won":  self.rounds_won.get(p.name, 0)}
                 for p in self.clients.values()],
                key=lambda x: -x["total_score"],
            )
        champion = standings[0]["player"] if standings else None
        log_info(f"[{self.code}] Series over! Champion: {champion}")
        await self._broadcast({
            "type":         "series_over",
            "champion":     champion,
            "total_rounds": self.total_rounds,
            "standings":    standings,
        })
        await asyncio.sleep(15)
        async with self.lock:
            self.current_round = 0
            self.scores.clear()
            self.rounds_won.clear()
            self.used_words.clear()
            enough = len(self.clients) >= 2
        if enough:
            await self._broadcast(info_msg("NEW_SERIES"))
            await self._start_game()

    # ── Helpers ───────────────────────────────────────────────────────────

    async def _send(self, ws, msg: dict):
        try:
            await ws.send(json.dumps(msg))
        except Exception as e:
            log_error(f"[{self.code}] Send error: {e}")

    async def _broadcast(self, msg: dict):
        async with self.lock:
            sockets = list(self.clients)
        for ws in sockets:
            await self._send(ws, msg)

    async def _broadcast_players(self):
        async with self.lock:
            players = [p.to_dict() for p in self.clients.values()]
        await self._broadcast({"type": "player_update", "players": players})


# ── Room manager ──────────────────────────────────────────────────────────────
class RoomManager:
    _CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    def __init__(self, total_rounds: int):
        self.total_rounds = total_rounds
        self.rooms: dict  = {}
        self.lock         = asyncio.Lock()

    def _new_code(self) -> str:
        for _ in range(200):
            code = "".join(random.choices(self._CODE_CHARS, k=6))
            if code not in self.rooms:
                return code
        return "XXXXXX"

    async def handle(self, websocket):
        # ── 1. Connection timeout ─────────────────────────────────────────
        try:
            raw = await asyncio.wait_for(websocket.recv(), timeout=CONNECT_TIMEOUT)
            msg = json.loads(raw)
        except asyncio.TimeoutError:
            log_error(f"Connection timeout from {websocket.remote_address}")
            return
        except Exception:
            return

        msg_type = msg.get("type", "")

        # ── 2. Input validation ───────────────────────────────────────────
        name = msg.get("player_name", "").strip()
        if not name:
            await websocket.send(json.dumps(error_msg("NAME_REQUIRED")))
            return
        if len(name) > NAME_MAX_LEN:
            await websocket.send(json.dumps(error_msg("NAME_TOO_LONG", max=NAME_MAX_LEN)))
            return
        if not _NAME_RE.match(name):
            await websocket.send(json.dumps(error_msg("NAME_INVALID")))
            return

        raw_emoji = msg.get("emoji", "") or ""
        emoji     = raw_emoji if 1 <= len(raw_emoji) <= 8 else "🎮"

        if msg_type == "create_room":
            hard_mode = bool(msg.get("hard_mode", False))
            async with self.lock:
                code = self._new_code()
                room = GameRoom(code, TARGETS_EN, VALID_EN,
                                self.total_rounds, hard_mode, self._cleanup_room)
                self.rooms[code] = room
            log_info(f"Room '{code}' created by '{name}' ({len(self.rooms)} active)")
            await room.handle_player(websocket, name, emoji)

        elif msg_type == "join_room":
            code = msg.get("code", "").strip().upper()
            async with self.lock:
                room = self.rooms.get(code)
            if not room:
                await websocket.send(json.dumps(error_msg("ROOM_NOT_FOUND", code=code)))
                return
            await room.handle_player(websocket, name, emoji)

        else:
            await websocket.send(json.dumps(error_msg("UNKNOWN_TYPE")))

    async def _cleanup_room(self, code: str):
        await asyncio.sleep(60)   # wait 60 s before removing (allow reconnects)
        async with self.lock:
            room = self.rooms.get(code)
            if room and not room.clients:
                del self.rooms[code]
                log_info(f"Room '{code}' removed (empty)")


# ── Entry point ───────────────────────────────────────────────────────────────

async def amain(total_rounds: int):
    manager = RoomManager(total_rounds)
    async with websockets.serve(manager.handle, WS_HOST, WS_PORT,
                                max_size=MAX_MSG_BYTES):
        log_info(f"ws://{WS_HOST}:{WS_PORT} | {total_rounds} rounds/series")
        print(f"  ws://localhost:{WS_PORT} · {total_rounds} rounds/series")
        print(f"  Waiting for connections…\n")
        await asyncio.Future()


if __name__ == "__main__":
    print("\n  Wordix WebSocket Server")
    print("  ─────────────────────────────────────")
    _rounds_env = os.environ.get("WORDIX_ROUNDS", "").strip()
    if _rounds_env:
        try:
            total_rounds = max(1, int(_rounds_env))
        except ValueError:
            total_rounds = 5
        print(f"  Rounds/series: {total_rounds} (from WORDIX_ROUNDS)\n")
    else:
        print("  Rounds per series (e.g. 3, 5, 10):\n")
        rounds_str = input("  Rounds (default 5): ").strip()
        try:
            total_rounds = max(1, int(rounds_str))
        except ValueError:
            total_rounds = 5
        print()

    try:
        asyncio.run(amain(total_rounds))
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
