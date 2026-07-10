import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import { GameWorkspace } from './features/game/GameWorkspace'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dm" replace />} />
      <Route path="/dm" element={<GameWorkspace role="dm" />} />
      <Route path="/display" element={<GameWorkspace role="display" />} />
      <Route path="/player" element={<GameWorkspace role="player" />} />
      <Route
        path="*"
        element={
          <main className="not-found">
            <p>Ruta no encontrada</p>
            <NavLink to="/dm">Volver al panel del DM</NavLink>
          </main>
        }
      />
    </Routes>
  )
}

export default App
