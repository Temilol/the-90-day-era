import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfirmHost } from './components/ui'
import { Layout } from './components/Layout'
import { useStore } from './store/useStore'
import { useSync } from './store/sync'
import './store/photos' // keeps progress photos backed up in the background
import './store/push' // keeps the server's list of upcoming reminders current
import { EmailLinkLanding } from './components/Account'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Today from './pages/Today'
const Calendar = lazy(() => import('./pages/Calendar'))
const Bosses = lazy(() => import('./pages/Bosses'))
const Mystery = lazy(() => import('./pages/Mystery'))
const Rewards = lazy(() => import('./pages/Rewards'))
const Progress = lazy(() => import('./pages/Progress'))
const Weight = lazy(() => import('./pages/Weight'))
const Journal = lazy(() => import('./pages/Journal'))
const SettingsPage = lazy(() => import('./pages/Settings'))

export default function App() {
  return <><Screens /><ConfirmHost /></>
}

function Screens() {
  const onboarded = useStore((s) => s.profile.onboarded)
  const fromEmail = useSync((s) => s.recovery || s.arrivedFrom === 'signup')
  if (fromEmail) return <EmailLinkLanding />
  if (!onboarded) return <Onboarding />
  return (
    <Suspense fallback={<div className="min-h-[40vh] grid place-items-center text-muted text-sm">Loading…</div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="today" element={<Today />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="bosses" element={<Bosses />} />
        <Route path="mystery" element={<Mystery />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="xp" element={<Navigate to="/rewards#xp" replace />} />
        <Route path="achievements" element={<Navigate to="/rewards#badges" replace />} />
        <Route path="shop" element={<Navigate to="/rewards#shop" replace />} />
        <Route path="progress" element={<Progress />} />
        <Route path="weight" element={<Weight />} />
        <Route path="journal" element={<Journal />} />
        <Route path="shifts" element={<Navigate to="/calendar#shifts" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/:section" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
