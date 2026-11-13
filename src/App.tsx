import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useStore } from './store/useStore'
import { useSync } from './store/sync'
import './store/photos' // keeps progress photos backed up in the background
import { EmailLinkLanding } from './components/Account'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Today from './pages/Today'
const Calendar = lazy(() => import('./pages/Calendar'))
const Bosses = lazy(() => import('./pages/Bosses'))
const Mystery = lazy(() => import('./pages/Mystery'))
const XpPage = lazy(() => import('./pages/Xp'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Shop = lazy(() => import('./pages/Shop'))
const Progress = lazy(() => import('./pages/Progress'))
const Weight = lazy(() => import('./pages/Weight'))
const Journal = lazy(() => import('./pages/Journal'))
const Shifts = lazy(() => import('./pages/Shifts'))
const SettingsPage = lazy(() => import('./pages/Settings'))

export default function App() {
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
    </Suspense>
  )
}
