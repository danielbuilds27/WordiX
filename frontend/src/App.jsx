import useWordixGame from './hooks/useWordixGame'
import LobbyPhase     from './components/LobbyPhase'
import WaitingPhase   from './components/WaitingPhase'
import PlayingPhase   from './components/PlayingPhase'
import GameOverPhase  from './components/GameOverPhase'
import SeriesOverPhase from './components/SeriesOverPhase'
import './App.css'

export default function App() {
  const game = useWordixGame()

  switch (game.phase) {
    case 'waiting':     return <WaitingPhase    key="waiting"     game={game} />
    case 'playing':     return <PlayingPhase    key="playing"     game={game} />
    case 'gameover':    return <GameOverPhase   key="gameover"    game={game} />
    case 'series_over': return <SeriesOverPhase key="series_over" game={game} />
    default:            return <LobbyPhase      key="lobby"       game={game} />
  }
}
