import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthGate } from './features/auth/AuthGate'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dm" replace />} />
      <Route path="/dm" element={<AuthGate role="dm" />} />
      <Route path="/display" element={<AuthGate role="display" />} />
      <Route path="/player" element={<AuthGate role="player" />} />
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
