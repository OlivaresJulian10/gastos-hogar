import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Registrar from './pages/Registrar'
import Historial from './pages/Historial'
import Comparativo from './pages/Comparativo'
import Balance from './pages/Balance'
import Presupuesto from './pages/Presupuesto'
import Personas from './pages/Personas'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/registrar" element={<Registrar />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/comparativo" element={<Comparativo />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/presupuesto" element={<Presupuesto />} />
        <Route path="/personas" element={<Personas />} />
      </Routes>
    </Layout>
  )
}
