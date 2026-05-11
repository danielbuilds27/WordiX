import { useState, useEffect, useRef, useCallback } from 'react'
import T from '../translations'

const MAX_ATTEMPTS = 6
const WORD_LENGTH  = 5
const EMOJI_MAP    = { correct: '🟩', present: '🟨', absent: '⬜' }

export default function useWordixGame() {
  // ── Lobby state ──────────────────────────────────────────────────────────
  const [lobbyStep, setLobbyStep]         = useState(1)
  const [name, setName]                   = useState('')
  const [emoji, setEmoji]                 = useState('🎮')
  const [host, setHost]                   = useState(() => `${window.location.hostname}:8765`)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [hardMode, setHardMode]           = useState(false)

  // ── Game state ───────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState('lobby')
  const [hardModeGame, setHardModeGame] = useState(false)
  const [roomCode, setRoomCode]         = useState('')
  const [guesses, setGuesses]           = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [attempts, setAttempts]         = useState(0)
  const [maxAttempts, setMaxAttempts]   = useState(MAX_ATTEMPTS)
  const [wordLength, setWordLength]     = useState(WORD_LENGTH)
  const [players, setPlayers]           = useState([])
  const [gameOverData, setGameOverData] = useState(null)
  const [seriesData, setSeriesData]     = useState(null)
  const [round, setRound]               = useState(1)
  const [totalRounds, setTotalRounds]   = useState(5)
  const [won, setWon]                   = useState(false)
  const [hints, setHints]               = useState([])   // [{position, letter}]
  const [hintsUsed, setHintsUsed]       = useState(0)
  const [maxHints, setMaxHints]         = useState(2)
  const [hintPenalty, setHintPenalty]   = useState(30)
  const [submitting, setSubmitting]     = useState(false)
  const [connecting, setConnecting]     = useState(false)
  const [shakeRow, setShakeRow]         = useState(null)
  const [bounceRow, setBounceRow]       = useState(null)
  const [letterStatuses, setLetterStatuses] = useState({})
  const [liveMsg, setLiveMsg]           = useState('')
  const [timeLeft, setTimeLeft]         = useState(null)
  const [toast, setToast]               = useState('')
  const [toastType, setToastType]       = useState('info')

  // ── Stable refs (avoid stale closures in handlers) ───────────────────────
  const t      = T.EN
  const tRef   = useRef(T.EN);   tRef.current   = T.EN
  const phaseRef     = useRef(phase);     phaseRef.current     = phase
  const roomCodeRef  = useRef(roomCode);  roomCodeRef.current  = roomCode
  const roundRef     = useRef(round);     roundRef.current     = round
  const totalRoundsRef = useRef(totalRounds); totalRoundsRef.current = totalRounds

  const wsRef         = useRef(null)
  const toastTimer    = useRef(null)
  const guessesRef    = useRef([]);  guessesRef.current  = guesses
  const handleMsgRef  = useRef(null)

  // ── URL helpers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room')
    if (r) { setRoomCodeInput(r.toUpperCase().slice(0, 6)); setLobbyStep(2) }
  }, [])

  useEffect(() => {
    if (!roomCode) return
    const url = new URL(window.location)
    url.searchParams.set('room', roomCode)
    window.history.replaceState({}, '', url)
  }, [roomCode])

  // ── Round timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || won || timeLeft === null || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft(n => Math.max(0, n - 1)), 1000)
    return () => clearTimeout(id)
  }, [phase, won, timeLeft])

  // ── Stable helpers ───────────────────────────────────────────────────────
  const showToast = useCallback((msg, duration = 2200, type = 'info') => {
    setToast(msg)
    setToastType(type)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), duration)
  }, [])

  const triggerShake = useCallback(() => {
    const row = guessesRef.current.length
    setShakeRow(row)
    setTimeout(() => setShakeRow(null), 600)
  }, [])

  const resolveServerMsg = useCallback((msg) => {
    if (!msg.code) return msg.message ?? ''
    const entry = tRef.current.serverCodes?.[msg.code]
    if (!entry) return msg.message ?? msg.code
    return typeof entry === 'function' ? entry(msg) : entry
  }, [])

  const leaveRoom = useCallback(() => {
    wsRef.current?.close()
    const url = new URL(window.location)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url)
  }, [])

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomCodeRef.current)
      .then(() => showToast(tRef.current.codeCopied(roomCodeRef.current), 2200, 'success'))
      .catch(() => showToast(roomCodeRef.current))
  }, [showToast])

  const shareResult = useCallback(() => {
    const g = guessesRef.current
    if (!g.length) return
    const r  = roundRef.current
    const tr = totalRoundsRef.current
    const header = `Wordix [${roomCodeRef.current}] R${r}/${tr}`
    const grid   = g.map(row => row.feedback.map(f => EMOJI_MAP[f.status]).join('')).join('\n')
    navigator.clipboard.writeText(`${header}\n${grid}`)
      .then(() => showToast(tRef.current.copied, 2200, 'success'))
      .catch(() => showToast(tRef.current.copyFailed, 2200, 'error'))
  }, [showToast])

  // ── Message handler (uses refs, never goes stale) ────────────────────────
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_joined':
        setRoomCode(msg.code)
        setPhase('waiting')
        setConnecting(false)
        break

      case 'game_start': {
        setPhase('playing')
        setGuesses([])
        setCurrentGuess('')
        setAttempts(0)
        setWon(false)
        setHints([])
        setHintsUsed(0)
        setMaxHints(msg.max_hints ?? 2)
        setHintPenalty(msg.hint_penalty ?? 30)
        setSubmitting(false)
        setShakeRow(null)
        setBounceRow(null)
        setLetterStatuses({})
        setMaxAttempts(msg.max_attempts)
        setWordLength(msg.word_length)
        setRound(msg.round ?? 1)
        setTotalRounds(msg.total_rounds ?? 5)
        setHardModeGame(msg.hard_mode ?? false)
        setTimeLeft(msg.time_limit ?? 120)
        setGameOverData(null)
        setSeriesData(null)
        setLiveMsg(tRef.current.startingRound)
        break
      }

      case 'feedback': {
        const newRow = guessesRef.current.length
        const word   = msg.feedback.map(f => f.letter).join('')
        setGuesses(prev => [...prev, { word, feedback: msg.feedback }])
        setCurrentGuess('')
        setAttempts(msg.attempts)
        setSubmitting(false)
        setLetterStatuses(prev => {
          const next = { ...prev }
          for (const { letter, status } of msg.feedback) {
            const cur = next[letter]
            if (cur === 'correct') continue
            if (cur === 'present' && status !== 'correct') continue
            next[letter] = status
          }
          return next
        })
        if (msg.feedback.every(f => f.status === 'correct')) {
          setWon(true)
          setTimeout(() => setBounceRow(newRow), 700)
          showToast(tRef.current.guessedIt, 5000, 'success')
          setLiveMsg(tRef.current.guessedIt)
        } else {
          const correct = msg.feedback.filter(f => f.status === 'correct').length
          const present = msg.feedback.filter(f => f.status === 'present').length
          setLiveMsg(`${msg.attempts}: ${correct}✓ ${present}~`)
        }
        break
      }

      case 'hint_response':
        setHints(prev => [...prev, { position: msg.position, letter: msg.letter }])
        setHintsUsed(msg.hints_used)
        showToast(tRef.current.hintRevealed(msg.letter, msg.position + 1, msg.penalty), 3000, 'info')
        break

      case 'game_over':
        setPhase('gameover')
        setGameOverData(msg)
        setRound(msg.round ?? roundRef.current)
        setTotalRounds(msg.total_rounds ?? totalRoundsRef.current)
        setSubmitting(false)
        break

      case 'series_over':
        setPhase('series_over')
        setSeriesData(msg)
        break

      case 'player_update':
        setPlayers(msg.players)
        break

      case 'info':
        showToast(resolveServerMsg(msg), 4000, 'info')
        break

      case 'error': {
        const errText = resolveServerMsg(msg)
        if (phaseRef.current === 'waiting' && !roomCodeRef.current) {
          showToast(errText, 4000, 'error')
          setPhase('lobby')
          setLobbyStep(2)
        } else {
          showToast(errText, 2200, 'error')
          setSubmitting(false)
          triggerShake()
        }
        setConnecting(false)
        setLiveMsg(errText)
        break
      }
    }
  }, [showToast, triggerShake, resolveServerMsg])

  // Keep handleMsgRef always fresh so ws.onmessage never goes stale
  handleMsgRef.current = handleMessage

  // ── WebSocket factory ────────────────────────────────────────────────────
  const doConnect = useCallback((buildMsg) => {
    const trimmedName = name.trim()
    if (!trimmedName) { showToast(tRef.current.needName, 2200, 'error'); return }
    setConnecting(true)

    const proto = host.includes('ngrok') ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${host}`)
    wsRef.current = ws

    ws.onopen    = () => ws.send(JSON.stringify(buildMsg(trimmedName, emoji)))
    ws.onmessage = (e) => { try { handleMsgRef.current(JSON.parse(e.data)) } catch { /* ignore */ } }
    ws.onerror   = () => { showToast(tRef.current.connFailed, 2200, 'error'); setConnecting(false) }
    ws.onclose   = () => {
      setPhase('lobby')
      setRoomCode('')
      setPlayers([])
      setSubmitting(false)
      setConnecting(false)
      setTimeLeft(null)
    }
  }, [name, emoji, host, showToast])

  const createRoom = useCallback(() =>
    doConnect((n, e) => ({ type: 'create_room', player_name: n, emoji: e, hard_mode: hardMode })),
  [doConnect, hardMode])

  const joinRoom = useCallback(() => {
    const code = roomCodeInput.trim().toUpperCase()
    if (code.length < 4) { showToast(tRef.current.validCode, 2200, 'error'); return }
    doConnect((n, e) => ({ type: 'join_room', player_name: n, emoji: e, code }))
  }, [roomCodeInput, doConnect, showToast])

  // ── Guess input ──────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'guess', word: currentGuess }))
    setSubmitting(true)
  }, [currentGuess])

  const requestHint = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'hint' }))
  }, [])

  const onKey = useCallback((key) => {
    if (phaseRef.current !== 'playing' || won || submitting) return
    if (key === 'ENTER') {
      if (currentGuess.length === wordLength) submitGuess()
      else { showToast(tRef.current.wordLength(wordLength), 2200, 'error'); triggerShake() }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
    } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => (prev + key).toUpperCase())
    }
  }, [won, submitting, currentGuess, wordLength, submitGuess, showToast, triggerShake])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Enter')          onKey('ENTER')
      else if (e.key === 'Backspace') onKey('BACKSPACE')
      else if (e.key.length === 1)    onKey(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey])

  return {
    lobbyStep, setLobbyStep,
    name, setName,
    emoji, setEmoji,
    host, setHost,
    roomCodeInput, setRoomCodeInput,
    hardMode, setHardMode,
    connecting,
    phase,
    hardModeGame,
    roomCode,
    guesses,
    currentGuess,
    attempts,
    maxAttempts,
    wordLength,
    players,
    gameOverData,
    seriesData,
    round,
    totalRounds,
    won,
    hints,
    hintsUsed,
    maxHints,
    hintPenalty,
    submitting,
    shakeRow,
    bounceRow,
    letterStatuses,
    liveMsg,
    timeLeft,
    toast,
    toastType,
    t,
    createRoom,
    joinRoom,
    leaveRoom,
    submitGuess,
    requestHint,
    onKey,
    shareResult,
    copyRoomCode,
    showToast,
  }
}
