import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FDF5FA, #F0E8FF)',
      gap: 12,
    }}>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
        background: 'linear-gradient(135deg, #1E0845, #A855F7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Casa ✦
      </div>
      <div style={{ fontSize: 13, color: '#B898B0', fontFamily: 'Nunito, sans-serif', fontWeight: 500 }}>
        Cargando...
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  return children
}
