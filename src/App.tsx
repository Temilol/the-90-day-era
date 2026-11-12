import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useStore } from './store/useStore'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Today from './pages/Today'
import Calendar from './pages/Calendar'
import Bosses from './pages/Bosses'
import Mystery from './pages/Mystery'
import XpPage from './pages/Xp'
import Achievements from './pages/Achievements'
import Shop from './pages/Shop'
import Progress from './pages/Progress'
import Weight from './pages/Weight'
import Journal from './pages/Journal'
import Shifts from './pages/Shifts'
import SettingsPage from './pages/Settings'

export default function App() {
  const onboarded = useStore((s) => s.profile.onboarded)
  if (!onboarded) return <Onboarding />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="today" element={<Today />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="bosses" element={<Bosses />} />
        <Route path="mystery" element={<Mystery />} />
        <Route path="xp" element={<XpPage />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="shop" element={<Shop />} />
        <Route path="progress" element={<Progress />} />
        <Route path="weight" element={<Weight />} />
        <Route path="journal" element={<Journal />} />
        <Route path="shifts" element={<Shifts />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
