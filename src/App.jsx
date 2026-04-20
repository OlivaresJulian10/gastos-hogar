import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Registrar from './pages/Registrar'
import Historial from './pages/Historial'
import Comparativo from './pages/Comparativo'
import Balance from './pages/Balance'
import Presupuesto from './pages/Presupuesto'
import PresupuestoPersonal from './pages/PresupuestoPersonal'
import Personas from './pages/Personas'
import OlvidePassword from './pages/OlvidePassword'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/olvide-password" element={<OlvidePassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/registrar" element={<Registrar />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/comparativo" element={<Comparativo />} />
                <Route path="/balance" element={<Balance />} />
                <Route path="/presupuesto" element={<Presupuesto />} />
                <Route path="/mi-presupuesto" element={<PresupuestoPersonal />} />
                <Route path="/personas" element={<Personas />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
