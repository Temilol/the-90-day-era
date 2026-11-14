import { describe, it, expect, beforeEach } from 'vitest'
import { dayNumber, dateForDay, weekOf, chapterOf, addDays, diffDays, seeded, pickN, todayKey as todayKeyForTest } from '@/lib/dates'
import { walkXp, levelFor, walkKind } from '@/lib/xp'
import { computeStats } from '@/lib/stats'
import { decide, type SyncMeta } from '@/lib/syncLogic'
import { useStore, initialState } from '@/store/useStore'

describe('dates', () => {
  it('computes challenge day from start date', () => {
    expect(dayNumber('2026-01-01', '2026-01-01')).toBe(1)
    expect(dayNumber('2026-01-01', '2026-03-31')).toBe(90)
    expect(dayNumber('2026-01-01', '2025-12-31')).toBe(0)
    expect(dateForDay('2026-01-01', 90)).toBe('2026-03-31')
  })
  it('handles DST transitions as whole days', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2)
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2)
  })
  it('weeks and chapters', () => {
    expect(weekOf(1)).toBe(1); expect(weekOf(7)).toBe(1); expect(weekOf(8)).toBe(2); expect(weekOf(90)).toBe(13)
    expect(chapterOf(30)).toBe(1); expect(chapterOf(31)).toBe(2); expect(chapterOf(61)).toBe(3)
  })
  it('seeded random is deterministic', () => {
    const a = pickN([1, 2, 3, 4, 5, 6], 3, seeded('x'))
    const b = pickN([1, 2, 3, 4, 5, 6], 3, seeded('x'))
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(3)
  })
})

describe('xp', () => {
  it('walk xp tiers', () => {
    expect(walkXp(3)).toBe(0); expect(walkXp(5)).toBe(10); expect(walkXp(10)).toBe(10)
    expect(walkXp(11)).toBe(15); expect(walkXp(20)).toBe(15); expect(walkXp(21)).toBe(25)
    expect(walkXp(30)).toBe(25); expect(walkXp(31)).toBe(30)
    expect(walkKind(30)).toBe('standard'); expect(walkKind(15)).toBe('modified'); expect(walkKind(40)).toBe('extended')
  })
  it('levels', () => {
    expect(levelFor(0).title).toBe('Rookie')
    expect(levelFor(149).level).toBe(1)
    expect(levelFor(150).title).toBe('Explorer')
    expect(levelFor(1800).title).toBe('Legend')
    expect(levelFor(3300).title).toBe('Era Queen')
    expect(levelFor(4000).next).toBeNull()
    expect(levelFor(275).progress).toBeCloseTo(0.5)
  })
})

describe('store', () => {
  const start = '2026-01-01'
  beforeEach(() => {
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: start, units: 'lb', onboarded: true } })
  })
  it('awards workout XP once per day and updates on edit', () => {
    const s = useStore.getState()
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    expect(useStore.getState().xp.filter((e) => e.id === `workout:${start}`)).toHaveLength(1)
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(25)
    s.logWorkout(start, { minutes: 15, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(15)
    s.removeWorkout(start)
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(0)
  })
  it('quests toggle on/off with XP', () => {
    const s = useStore.getState()
    s.toggleQuest(start, 'hydrate'); s.toggleQuest(start, 'hydrate'); s.toggleQuest(start, 'hydrate')
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(5)
    expect(useStore.getState().days[start].quests.hydrate).toBeTruthy()
  })
  it('spending XP does not reduce level progress', () => {
    const s = useStore.getState()
    for (let i = 0; i < 4; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
    const today = addDays(start, 3)
    let st = computeStats(useStore.getState(), today)
    expect(st.lifetimeXp).toBe(100); expect(st.level.level).toBe(1)
    for (let i = 4; i < 6; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
    st = computeStats(useStore.getState(), addDays(start, 5))
    expect(st.lifetimeXp).toBe(150); expect(st.level.level).toBe(2)
    expect(s.buyReward('coffee')).toBe(true)
    expect(s.buyReward('coffee')).toBe(false)
    st = computeStats(useStore.getState(), addDays(start, 5))
    expect(st.spendableXp).toBe(50); expect(st.lifetimeXp).toBe(150); expect(st.level.level).toBe(2)
  })
  it('streak counts recovery days and resets on gaps', () => {
    const s = useStore.getState()
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    s.setRecovery(addDays(start, 1), true)
    s.logWorkout(addDays(start, 2), { minutes: 10, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), addDays(start, 2)).streak).toBe(3)
    expect(computeStats(useStore.getState(), addDays(start, 3)).streak).toBe(3) // today not yet logged
    expect(computeStats(useStore.getState(), addDays(start, 4)).streak).toBe(0)
    expect(computeStats(useStore.getState(), addDays(start, 4)).bestStreak).toBe(3)
  })
  it('refuses logs outside the challenge window', () => {
    const s = useStore.getState()
    s.logWorkout('2025-12-25', { minutes: 30, incline: 12, speed: 3 })
    expect(useStore.getState().xp).toHaveLength(0)
  })
  it('unlocks badges once', () => {
    const s = useStore.getState()
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    const at = useStore.getState().badges['first-steps']
    expect(at).toBeTruthy()
    s.toggleQuest(start, 'sleep')
    expect(useStore.getState().badges['first-steps']).toBe(at)
  })
  it('boss claim is idempotent', () => {
    const s = useStore.getState()
    s.claimBoss('consistency-monster'); s.claimBoss('consistency-monster')
    expect(useStore.getState().xp.filter((e) => e.id.startsWith('boss:'))).toHaveLength(1)
  })
  it('export/import roundtrip', async () => {
    const s = useStore.getState()
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    const { exportJson } = await import('@/store/useStore')
    const raw = exportJson()
    s.resetAll()
    expect(Object.keys(useStore.getState().days)).toHaveLength(0)
    expect(useStore.getState().importData(raw).ok).toBe(true)
    expect(useStore.getState().days[start].workout?.minutes).toBe(30)
    expect(useStore.getState().importData('{"nope":1}').ok).toBe(false)
  })
})

describe('comebacks', () => {
  it('does not count the very first workout as a comeback', async () => {
    const { useStore, initialState } = await import('@/store/useStore')
    const start = '2026-01-01'
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: start, units: 'lb', onboarded: true } })
    const s = useStore.getState()
    s.logWorkout(addDays(start, 9), { minutes: 30, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), addDays(start, 9)).comebacks).toBe(0)
    s.logWorkout(addDays(start, 13), { minutes: 30, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), addDays(start, 13)).comebacks).toBe(1)
  })
})

describe('streak freeze', () => {
  it('patches a missed day, one per chapter, and is released by a real log', async () => {
    const { useStore, initialState } = await import('@/store/useStore')
    const start = '2026-01-01'
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: start, units: 'lb', onboarded: true } })
    const s = useStore.getState()
    s.logWorkout(start, { minutes: 30, incline: 12, speed: 3 })
    s.logWorkout(addDays(start, 2), { minutes: 30, incline: 12, speed: 3 })
    const today = addDays(start, 2)
    expect(computeStats(useStore.getState(), today).streak).toBe(1)
    // can't freeze today or a logged day
    expect(useStore.getState().applyFreeze(today)).toBe(false)
    expect(useStore.getState().applyFreeze(start)).toBe(false)
    expect(useStore.getState().applyFreeze(addDays(start, 1))).toBe(true)
    let st = computeStats(useStore.getState(), today)
    expect(st.streak).toBe(3)
    expect(st.daysLogged).toBe(2) // freeze is not an active day
    expect(st.freezesLeftByChapter[0]).toBe(0)
    // second freeze in chapter 1 refused
    s.logWorkout(addDays(start, 4), { minutes: 30, incline: 12, speed: 3 })
    expect(useStore.getState().applyFreeze(addDays(start, 3))).toBe(false)
    // logging a rest on the frozen day gives the freeze back
    s.setRecovery(addDays(start, 1), true)
    expect(useStore.getState().freezes[addDays(start, 1)]).toBeUndefined()
    expect(computeStats(useStore.getState(), addDays(start, 4)).freezesLeftByChapter[0]).toBe(1)
  })
})

describe('step 1 fixes', () => {
  const start = '2026-01-01'
  it('announces a level-up exactly once', async () => {
    const { useStore, initialState } = await import('@/store/useStore')
    const { useUi } = await import('@/store/ui')
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: start, units: 'lb', onboarded: true } })
    useUi.setState({ unlocks: [] })
    const s = useStore.getState()
    for (let i = 0; i < 6; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
    const levels = () => useUi.getState().unlocks.filter((u) => u.kind === 'level')
    expect(levels()).toHaveLength(1)
    expect(levels()[0].name).toContain('Explorer')
    s.logWorkout(addDays(start, 4), { minutes: 30, incline: 12, speed: 3 })
    expect(levels()).toHaveLength(1)
  })
  it('choosing the Recovery shift logs the recovery day, but not for future days or walked days', async () => {
    const { useStore, initialState } = await import('@/store/useStore')
    const today = todayKeyForTest()
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: addDays(today, -3), units: 'lb', onboarded: true } })
    const s = useStore.getState()
    s.setShift(today, 'recovery')
    expect(useStore.getState().days[today].recovery).toBe(true)
    expect(useStore.getState().xp.filter((e) => e.id === `recovery:${today}`)).toHaveLength(1)
    s.setShift(today, 'recovery')
    expect(useStore.getState().xp.filter((e) => e.id === `recovery:${today}`)).toHaveLength(1)
    s.setShift(addDays(today, 1), 'recovery')
    expect(useStore.getState().days[addDays(today, 1)].recovery).toBeFalsy()
    s.logWorkout(addDays(today, -1), { minutes: 30, incline: 12, speed: 3 })
    s.setShift(addDays(today, -1), 'recovery')
    expect(useStore.getState().days[addDays(today, -1)].recovery).toBeFalsy()
  })
})

describe('sync decisions', () => {
  const uid = 'u1'
  const meta = (m: Partial<SyncMeta> = {}): SyncMeta => ({ userId: uid, version: 3, dirty: false, lastSyncedAt: null, ...m })
  it('uploads when the cloud is empty and this device has data', () => {
    expect(decide({ uid, meta: meta({ userId: null, version: 0 }), remoteVersion: null, localHasData: true })).toBe('create')
    expect(decide({ uid, meta: meta({ userId: null, version: 0 }), remoteVersion: null, localHasData: false })).toBe('noop')
  })
  it('a fresh device pulls; a device with its own data asks', () => {
    expect(decide({ uid, meta: meta({ userId: null, version: 0 }), remoteVersion: 5, localHasData: false })).toBe('pull')
    expect(decide({ uid, meta: meta({ userId: null, version: 0 }), remoteVersion: 5, localHasData: true })).toBe('ask')
    expect(decide({ uid, meta: meta({ userId: 'someone-else' }), remoteVersion: 3, localHasData: true })).toBe('ask')
  })
  it('a known device pushes, pulls, or asks depending on who changed', () => {
    expect(decide({ uid, meta: meta(), remoteVersion: 3, localHasData: true })).toBe('noop')
    expect(decide({ uid, meta: meta({ dirty: true }), remoteVersion: 3, localHasData: true })).toBe('push')
    expect(decide({ uid, meta: meta(), remoteVersion: 4, localHasData: true })).toBe('pull')
    expect(decide({ uid, meta: meta({ dirty: true }), remoteVersion: 4, localHasData: true })).toBe('ask')
  })
  it('snapshot round-trips through applySnapshot without action functions', async () => {
    const { useStore, initialState, snapshot, applySnapshot } = await import('@/store/useStore')
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate: '2026-01-01', units: 'lb', onboarded: true } })
    useStore.getState().logWorkout('2026-01-01', { minutes: 30, incline: 12, speed: 3 })
    const snap = JSON.parse(JSON.stringify(snapshot()))
    expect(Object.values(snap).some((v) => typeof v === 'function')).toBe(false)
    useStore.getState().resetAll()
    applySnapshot(snap)
    expect(useStore.getState().days['2026-01-01'].workout?.minutes).toBe(30)
    expect(typeof useStore.getState().logWorkout).toBe('function')
  })
})

describe('progress photos', () => {
  it('keeps one photo per date, oldest first, and survives a round trip', async () => {
    const { snapshot, applySnapshot } = await import('@/store/useStore')
    useStore.setState({ ...initialState() })
    const s = useStore.getState()
    s.addPhoto('2026-01-10', 'b')
    s.addPhoto('2026-01-03', 'a')
    s.addPhoto('2026-01-10', 'c') // replaces b
    expect(useStore.getState().photos.map((p) => p.id)).toEqual(['a', 'c'])
    s.removePhoto('a')
    expect(useStore.getState().photos.map((p) => p.date)).toEqual(['2026-01-10'])
    const snap = JSON.parse(JSON.stringify(snapshot()))
    applySnapshot({ ...snap, photos: undefined }) // data saved before photos existed
    expect(useStore.getState().photos).toEqual([])
    applySnapshot(snap)
    expect(useStore.getState().photos[0].id).toBe('c')
  })
  it('writes a readable zip', async () => {
    const { crc32, makeZip } = await import('@/lib/zip')
    const enc = new TextEncoder()
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926)
    const zip = makeZip([{ name: '2026-01-03.jpg', data: enc.encode('one') }, { name: '2026-01-10.jpg', data: enc.encode('second') }])
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    const end = zip.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50)
  })
})

describe('shifts with impact', () => {
  const day1 = '2026-01-01'
  const fresh = () => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: day1, units: 'lb', onboarded: true } })
  const xpOf = (id: string) => useStore.getState().xp.find((e) => e.id === id)?.amount ?? 0

  it('adds the shift bonus on day and night shifts only, and it follows the shift', () => {
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'night')
    s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    expect(xpOf(`workout:${day1}`)).toBe(25)
    expect(xpOf(`shiftbonus:${day1}`)).toBe(5)
    s.setShift(day1, 'off')
    expect(xpOf(`shiftbonus:${day1}`)).toBe(0)
    s.setShift(day1, 'elective')
    expect(xpOf(`shiftbonus:${day1}`)).toBe(0)
    expect(useStore.getState().days[day1].hours).toEqual({ start: '08:00', end: '17:00' })
    s.setShift(day1, 'day')
    expect(xpOf(`shiftbonus:${day1}`)).toBe(5)
    expect(useStore.getState().days[day1].hours).toBeUndefined()
    s.logWorkout(day1, { minutes: 10, incline: 12, speed: 3 })
    expect(useStore.getState().xp.filter((e) => e.id === `shiftbonus:${day1}`)).toHaveLength(1)
    expect(computeStats(useStore.getState(), day1).lifetimeXp).toBe(15)
    s.removeWorkout(day1)
    expect(computeStats(useStore.getState(), day1).lifetimeXp).toBe(0)
  })
  it('leaves walks logged under the old values alone', () => {
    fresh()
    useStore.setState((st) => ({ days: { ...st.days, [day1]: { date: day1, quests: {}, workout: { kind: 'standard', minutes: 30, incline: 12, speed: 3, loggedAt: `${day1}T10:00:00.000Z` } } }, xp: [{ id: `workout:${day1}`, amount: 30, reason: '30-minute walk', date: day1, at: `${day1}T10:00:00.000Z` }] }))
    useStore.getState().setShift(day1, 'day')
    expect(computeStats(useStore.getState(), day1).lifetimeXp).toBe(30)
  })
  it('fills a schedule, keeps hand-set and logged days, and stays editable', async () => {
    const { planFill } = await import('@/lib/schedule')
    fresh()
    const s = useStore.getState()
    s.setShift('2026-01-03', 'off') // set by hand
    s.setShift(day1, 'day'); s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 }) // logged
    const opts = { from: day1, to: '2026-01-06', pattern: ['night', 'night', 'elective'] as const, hours: { start: '10:00', end: '16:00' }, keepMine: true }
    expect(planFill(useStore.getState().days, { ...opts, pattern: [...opts.pattern] }).map((p) => p.kept)).toEqual([true, false, true, false, false, false])
    expect(s.fillShifts({ ...opts, pattern: [...opts.pattern] })).toBe(4)
    const d = useStore.getState().days
    expect(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06'].map((k) => d[k].shift)).toEqual(['day', 'night', 'off', 'night', 'night', 'elective'])
    expect(d['2026-01-06'].hours).toEqual({ start: '10:00', end: '16:00' })
    expect(d['2026-01-02'].shiftSet).toBe('plan')
    // without "keep mine", hand-set days are replaced but a logged day still isn't
    expect(s.fillShifts({ from: day1, to: '2026-01-03', pattern: ['recovery'], keepMine: false })).toBe(2)
    expect(useStore.getState().days[day1].shift).toBe('day')
    expect(useStore.getState().days['2026-01-03'].recovery).toBeFalsy() // planning rest doesn't log it
    s.setShift('2026-01-02', 'off')
    expect(useStore.getState().days['2026-01-02'].shiftSet).toBe('me')
  })
  it('draws one quest that fits the shift, skips clashes, varies by day, and keeps ticked quests', async () => {
    const { questsFor } = await import('@/lib/hooks')
    const { QUEST_POOL } = await import('@/content/quests')
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const date = addDays(day1, i)
      for (const shift of ['day', 'night', 'off', 'recovery', 'elective'] as const) {
        const q = questsFor(date, shift)
        expect(q).toHaveLength(4)
        expect(q[0].id).toBe('hydrate')
        expect(new Set(q.map((x) => x.id)).size).toBe(4)
        expect(q[1].fits).toContain(shift)
        expect(q.some((x) => x.avoid?.includes(shift))).toBe(false)
        expect(questsFor(date, shift)).toEqual(q)
        if (shift === 'night') seen.add(q[1].id)
      }
    }
    expect(seen.size).toBeGreaterThan(3) // not the same night quest every time
    for (const s of ['day', 'night', 'off', 'recovery', 'elective'] as const) expect(QUEST_POOL.filter((q) => q.fits?.includes(s)).length).toBeGreaterThanOrEqual(5)
    const kept = questsFor(day1, 'night', { 'batch-cook': 'x', hydrate: 'x' })
    expect(kept).toHaveLength(4)
    expect(kept.map((x) => x.id)).toContain('batch-cook')
    expect(questsFor(day1)).toHaveLength(4)
  })
  it('plans walk windows around the shift', async () => {
    const { planFor, planStatus, clock, usualWalkTime } = await import('@/lib/walkPlan')
    const dayPlan = planFor('day')
    expect(dayPlan.windows.map((w) => [clock(w.start), clock(w.end)])).toEqual([['4:30 AM', '5:15 AM'], ['6:45 PM', '8:30 PM']])
    const night = planFor('night')
    expect(night.windows.map((w) => [clock(w.start), clock(w.end)])).toEqual([['3:30 PM', '4:45 PM']])
    const late = planFor('elective', { start: '10:00', end: '18:00' })
    expect(late.windows.map((w) => clock(w.start))).toEqual(['8 AM', '6:45 PM'])
    expect(planFor('recovery').kind).toBe('rest')
    expect(planFor(undefined).kind).toBe('none')
    expect(planFor('off').windows).toHaveLength(1)
    expect(planStatus(dayPlan, 3 * 60)?.text).toBe('Your window opens in 1 h 30 min')
    expect(planStatus(dayPlan, 5 * 60)?.state).toBe('open')
    expect(planStatus(dayPlan, 12 * 60)?.text).toBe('Next window opens in 6 h 45 min')
    expect(planStatus(dayPlan, 22 * 60)?.state).toBe('passed')
    // a usual time inside working hours is ignored; one outside leads the plan
    expect(planFor('day', undefined, 12 * 60).windows[0].label).toBe('Before work')
    expect(planFor('day', undefined, 19 * 60 + 30).windows.map((w) => w.label)).toEqual(['Before work', 'Your usual time'])
    const at = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, '0')}:10:00`).toISOString()
    const days = Object.fromEntries(['2026-01-01', '2026-01-02', '2026-01-03'].map((d, i) => [d, { date: d, quests: {}, shift: 'night' as const, workout: { kind: 'standard' as const, minutes: 30, incline: 12, speed: 3, loggedAt: at(d, 15 + i) } }]))
    expect(usualWalkTime(days, 'night')).toBe(16 * 60 + 10)
    expect(usualWalkTime(days, 'day')).toBeNull()
  })
  it('totals calories from typed numbers only, and other activities earn no XP', () => {
    fresh()
    const s = useStore.getState()
    s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), day1).calories.total).toBe(0) // nothing typed, nothing invented
    s.setWorkoutCalories(day1, 310)
    s.logStrength(day1, 10, undefined, 60)
    s.addActivity(day1, { name: 'Bike', minutes: 40, calories: 280 })
    s.addActivity(day1, { name: 'Yoga', minutes: 20 })
    s.logWorkout(day1, { minutes: 20, incline: 10, speed: 3 }) // editing keeps the calories
    const before = computeStats(useStore.getState(), day1)
    expect(before.calories.total).toBe(650)
    expect(before.calories.byDate[day1]).toBe(650)
    expect(before.calories.walkTotal).toBe(310)
    expect(before.otherActivities).toBe(2)
    expect(before.lifetimeXp).toBe(15 + 15) // walk + strength only
    expect(before.streak).toBe(1)
    s.setWorkoutCalories(day1, undefined)
    s.removeActivity(day1, useStore.getState().days[day1].activities![0].id)
    expect(computeStats(useStore.getState(), day1).calories.total).toBe(60)
  })
  it('counts walks by kind of day', () => {
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'night'); s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    s.setShift('2026-01-02', 'night')
    s.setShift('2026-01-03', 'off'); s.logWorkout('2026-01-03', { minutes: 20, incline: 12, speed: 3 })
    s.setShift('2026-01-09', 'night') // in the future relative to "today" below
    const st = computeStats(useStore.getState(), '2026-01-03')
    expect(st.byShift.night).toEqual({ days: 2, walks: 1, minutes: 30 })
    expect(st.byShift.off).toEqual({ days: 1, walks: 1, minutes: 20 })
  })
})

describe('push reminder queue', () => {
  it('queues a nudge before each walk window and matching custom reminders, and skips finished days', async () => {
    const { buildReminderQueue } = await import('@/lib/reminderQueue')
    const base = initialState()
    const state = {
      ...base,
      profile: { ...base.profile, startDate: '2026-01-01', onboarded: true },
      reminders: [
        { id: 'a', label: 'Night walk', time: '16:00', shifts: ['night' as const], enabled: true },
        { id: 'b', label: 'Off', time: '10:00', shifts: ['off' as const], enabled: false },
      ],
      days: {
        '2026-01-01': { date: '2026-01-01', quests: {}, shift: 'day' as const },
        '2026-01-02': { date: '2026-01-02', quests: {}, shift: 'night' as const },
        '2026-01-03': { date: '2026-01-03', quests: {}, shift: 'night' as const, recovery: true },
        '2026-01-04': { date: '2026-01-04', quests: {}, shift: 'recovery' as const },
      },
    }
    const now = new Date(2026, 0, 1, 12, 0) // midday on Day 1: the morning window has gone
    const local = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }
    const q = buildReminderQueue(state, now)
    expect(q.map((r) => [local(r.fire_at), r.title])).toEqual([
      ['1/1 18:30', 'Walk window opens at 6:45 PM'],
      ['1/2 15:15', 'Walk window opens at 3:30 PM'],
      ['1/2 16:00', 'Night walk'],
      // days with no shift set get every enabled reminder
      ['1/5 16:00', 'Night walk'], ['1/6 16:00', 'Night walk'], ['1/7 16:00', 'Night walk'],
    ])
    expect(buildReminderQueue({ ...state, profile: { ...state.profile, walkReminders: false } }, now).map((r) => r.title)).toEqual(['Night walk', 'Night walk', 'Night walk', 'Night walk'])
    expect(buildReminderQueue({ ...state, profile: { ...state.profile, startDate: null } }, now)).toEqual([])
  })
})

describe('envelopes: tiers, pick one of three, prizes you keep', () => {
  const day1 = '2026-01-01'
  const setup = (extra: Partial<ReturnType<typeof initialState>> = {}) => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: day1, units: 'lb', onboarded: true }, ...extra })
  const unlocked = (id: string, options?: string[]) => ({ [id]: { id, unlockedAt: 'x', ...(options ? { options } : {}) } })
  const xpOf = (id: string) => useStore.getState().xp.find((e) => e.id === id)?.amount ?? 0

  it('draws three different prizes from the right tier, once', async () => {
    const { PRIZES, ENVELOPE_DEFS } = await import('@/content/envelopes')
    const { drawOptions } = await import('@/lib/prizes')
    for (const tier of ['common', 'rare', 'legendary'] as const) {
      expect(PRIZES.filter((p) => p.tiers.includes(tier)).length).toBeGreaterThanOrEqual(5)
      for (let i = 0; i < 30; i++) {
        const o = drawOptions(tier, [])
        expect(new Set(o).size).toBe(3)
        expect(o.every((k) => PRIZES.find((p) => p.key === k)!.tiers.includes(tier))).toBe(true)
      }
    }
    expect(ENVELOPE_DEFS.find((d) => d.id === 'day90')!.tier).toBe('legendary')
    // treats already won are avoided while enough others remain
    const won = ['drink', 'lazy'].map((key, i) => ({ id: `p${i}`, key, from: 'x', wonAt: 'x' }))
    for (let i = 0; i < 30; i++) expect(drawOptions('common', won).some((k) => k === 'drink' || k === 'lazy')).toBe(false)
    setup({ envelopes: unlocked('day30') })
    useStore.getState().drawEnvelope('day30')
    const first = useStore.getState().envelopes.day30.options
    useStore.getState().drawEnvelope('day30')
    expect(useStore.getState().envelopes.day30.options).toEqual(first) // reopening can't re-roll
  })
  it('picking keeps one prize, adds XP prizes straight away, and can only happen once', () => {
    setup({ envelopes: { ...unlocked('day7', ['xp25', 'drink', 'swap']), ...unlocked('day30', ['freeze', 'double', 'off20']) } })
    const s = useStore.getState()
    s.chooseEnvelope('day7', 'movie') // not one of the three
    expect(useStore.getState().prizes).toHaveLength(0)
    s.chooseEnvelope('day7', 'xp25')
    s.chooseEnvelope('day7', 'drink')
    expect(useStore.getState().prizes.map((p) => p.key)).toEqual(['xp25'])
    expect(xpOf('envelope:day7')).toBe(25)
    expect(useStore.getState().envelopes.day7.reward).toBe('25 bonus XP')
    s.chooseEnvelope('day30', 'freeze')
    expect(useStore.getState().prizes.map((p) => p.key)).toEqual(['xp25', 'freeze'])
  })
  it('an envelope freeze covers a day after the chapter freeze is gone, and comes back if undone', () => {
    setup({ prizes: [{ id: 'f1', key: 'freeze', from: 'day30', wonAt: 'x' }] })
    const s = useStore.getState()
    const today = todayKeyForTest()
    useStore.setState((st) => ({ profile: { ...st.profile, startDate: addDays(today, -10) } }))
    const a = addDays(today, -5), b = addDays(today, -4), c = addDays(today, -3)
    expect(computeStats(useStore.getState()).bonusFreezes).toBe(1)
    expect(s.applyFreeze(a)).toBe(true) // the chapter's own
    expect(computeStats(useStore.getState()).bonusFreezes).toBe(1)
    expect(s.applyFreeze(b)).toBe(true) // the envelope's
    expect(computeStats(useStore.getState()).bonusFreezes).toBe(0)
    expect(s.applyFreeze(c)).toBe(false)
    s.removeFreeze(b)
    expect(computeStats(useStore.getState()).bonusFreezes).toBe(1)
    expect(s.applyFreeze(c)).toBe(true)
  })
  it('double XP doubles the day’s walk and follows changes to it', async () => {
    const { prizeUsed } = await import('@/lib/prizes')
    const today = todayKeyForTest()
    setup({ prizes: [{ id: 'd1', key: 'double', from: 'day30', wonAt: 'x' }, { id: 'd2', key: 'double', from: 'w25', wonAt: 'x' }] })
    useStore.setState((st) => ({ profile: { ...st.profile, startDate: addDays(today, -3) } }))
    const s = useStore.getState()
    s.setShift(today, 'night')
    s.redeemPrize('d1')
    s.redeemPrize('d2') // one per day
    expect(useStore.getState().days[today].doubleXp).toBe('d1')
    expect(xpOf(`double:${today}`)).toBe(0) // nothing to double yet
    s.logWorkout(today, { minutes: 30, incline: 12, speed: 3 })
    expect(xpOf(`double:${today}`)).toBe(30) // walk 25 + shift bonus 5
    expect(computeStats(useStore.getState()).lifetimeXp).toBe(60)
    s.logWorkout(today, { minutes: 10, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState()).lifetimeXp).toBe(30)
    s.setShift(today, 'off')
    expect(computeStats(useStore.getState()).lifetimeXp).toBe(20)
    const st = useStore.getState()
    expect(prizeUsed(st.prizes[0], st, today)).toBe(true)
    expect(prizeUsed(st.prizes[1], st, today)).toBe(false)
    s.removeWorkout(today)
    expect(computeStats(useStore.getState()).lifetimeXp).toBe(0)
    // a double-XP day that never got a walk hands the prize back the next day
    expect(prizeUsed(useStore.getState().prizes[0], useStore.getState(), addDays(today, 1))).toBe(false)
  })
  it('a discount prize lowers one shop price and is then spent', () => {
    setup({ prizes: [{ id: 'c1', key: 'off20', from: 'day30', wonAt: 'x' }], xp: [{ id: 'seed', amount: 180, reason: 'seed', date: day1, at: 'x' }] })
    const s = useStore.getState()
    expect(s.buyReward('accessory')).toBe(false) // 200 XP, only 180
    expect(s.buyReward('accessory', 'c1')).toBe(true) // 160 with 20% off
    expect(useStore.getState().purchases[0].cost).toBe(160)
    expect(useStore.getState().prizes[0].usedAt).toBeTruthy()
    expect(useStore.getState().prizes[0].note).toBe('New workout accessory')
    useStore.setState((st) => ({ xp: [...st.xp, { id: 'more', amount: 90, reason: 'seed', date: day1, at: 'x' }] }))
    expect(s.buyReward('coffee', 'c1')).toBe(true) // coupon already spent: full price
    expect(useStore.getState().purchases[1].cost).toBe(100)
  })
  it('a quest swap trades one of today’s quests and uses the prize', async () => {
    const { questsFor } = await import('@/lib/hooks')
    const today = todayKeyForTest()
    setup({ prizes: [{ id: 's1', key: 'swap', from: 'day7', wonAt: 'x' }] })
    useStore.setState((st) => ({ profile: { ...st.profile, startDate: addDays(today, -3) } }))
    const s = useStore.getState()
    s.setShift(today, 'day')
    const before = questsFor(today, 'day')
    expect(s.swapQuest(today, 'hydrate')).toBe(false)
    expect(s.swapQuest(today, before[2].id)).toBe(true)
    const d = useStore.getState().days[today]
    const after = questsFor(today, 'day', d.quests, d.swaps)
    expect(after).toHaveLength(4)
    expect(after.map((q) => q.id)).not.toContain(before[2].id)
    expect([after[0].id, after[1].id, after[3].id]).toEqual([before[0].id, before[1].id, before[3].id])
    expect(after.some((q) => q.avoid?.includes('day'))).toBe(false)
    expect(new Set(after.map((q) => q.id)).size).toBe(4)
    expect(s.swapQuest(today, after[1].id)).toBe(false) // prize already used
  })
  it('seals the time capsule once and says what the next envelope needs', async () => {
    const { nextEnvelope } = await import('@/lib/prizes')
    setup()
    const s = useStore.getState()
    s.sealCapsule('  Dear me, keep going.  ')
    s.sealCapsule('A second letter')
    expect(useStore.getState().capsule?.text).toBe('Dear me, keep going.')
    for (let i = 0; i < 4; i++) s.logWorkout(addDays(day1, i), { minutes: 30, incline: 12, speed: 3 })
    const st = useStore.getState()
    expect(nextEnvelope(computeStats(st, addDays(day1, 3)), {})).toEqual({ title: 'One Week In', need: '3 more days' })
    expect(nextEnvelope(computeStats(st, addDays(day1, 3)), { day7: { id: 'day7', unlockedAt: 'x' } })).toEqual({ title: 'Seven-Day Streak', need: '3 more days in a row' })
  })
})

describe('secret envelopes', () => {
  const day1 = '2026-01-01'
  const fresh = () => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: day1, units: 'lb', onboarded: true } })
  const secrets = () => computeStats(useStore.getState(), '2026-02-15').secrets
  const has = (id: string) => !!useStore.getState().envelopes[id]

  it('starts with none found and never appears in the next-envelope hint', async () => {
    const { nextEnvelope } = await import('@/lib/prizes')
    const { ENVELOPE_DEFS, isSecret } = await import('@/content/envelopes')
    fresh()
    expect(Object.values(secrets()).some(Boolean)).toBe(false)
    expect(ENVELOPE_DEFS.filter(isSecret).map((d) => d.tier).sort()).toEqual(['common', 'common', 'legendary', 'rare', 'rare'])
    const all = Object.fromEntries(ENVELOPE_DEFS.filter((d) => !isSecret(d)).map((d) => [d.id, { id: d.id, unlockedAt: 'x' }]))
    expect(nextEnvelope(computeStats(useStore.getState(), day1), all)).toBeNull()
  })
  it('Showed Up Anyway: a short walk on a day or night shift', () => {
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'off'); s.logWorkout(day1, { minutes: 10, incline: 12, speed: 3 })
    s.setShift('2026-01-02', 'elective'); s.logWorkout('2026-01-02', { minutes: 10, incline: 12, speed: 3 })
    s.setShift('2026-01-03', 'night'); s.logWorkout('2026-01-03', { minutes: 20, incline: 12, speed: 3 })
    expect(secrets().showedUp).toBe(false)
    s.logWorkout('2026-01-03', { minutes: 19, incline: 12, speed: 3 })
    expect(secrets().showedUp).toBe(true)
    expect(has('secret-showed-up')).toBe(true)
  })
  it('Couldn’t Sit Still: a walk on a planned rest day', () => {
    fresh()
    const s = useStore.getState()
    s.fillShifts({ from: day1, to: day1, pattern: ['recovery'], keepMine: true })
    expect(secrets().restWalk).toBe(false)
    s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    expect(secrets().restWalk).toBe(true)
    expect(has('secret-rest-walk')).toBe(true)
  })
  it('The Perfect Day needs every piece on the same day', () => {
    fresh()
    const s = useStore.getState()
    s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    for (const q of ['hydrate', 'nourish', 'protein', 'stretch']) s.toggleQuest(day1, q)
    s.setBonusMission(day1, 'Dance break', 'Wheel'); s.completeBonusMission(day1)
    s.saveJournal(day1, { mood: 'good' })
    expect(secrets().perfectDay).toBe(false) // no strength yet
    s.logStrength('2026-01-02', 10) // on a different day doesn't count
    expect(secrets().perfectDay).toBe(false)
    s.logStrength(day1, 10)
    expect(secrets().perfectDay).toBe(true)
    expect(has('secret-perfect-day')).toBe(true)
  })
  it('Going Long: ten walks over 30 minutes', () => {
    fresh()
    const s = useStore.getState()
    for (let i = 0; i < 9; i++) s.logWorkout(addDays(day1, i), { minutes: 35, incline: 12, speed: 3 })
    s.logWorkout(addDays(day1, 9), { minutes: 30, incline: 12, speed: 3 })
    expect(secrets().goingLong).toBe(false)
    s.logWorkout(addDays(day1, 9), { minutes: 31, incline: 12, speed: 3 })
    expect(secrets().goingLong).toBe(true)
  })
  it('The Perfect Week: 6 walks, 4 strength, the reflection and the boss in one week', async () => {
    const { BOSSES } = await import('@/content/bosses')
    fresh()
    const s = useStore.getState()
    const week2 = (i: number) => addDays(day1, 7 + i)
    for (let i = 0; i < 6; i++) s.logWorkout(week2(i), { minutes: 30, incline: 12, speed: 3 })
    for (let i = 0; i < 4; i++) s.logStrength(week2(i), 10)
    s.saveReflection(2, 'A solid week with a lot of walking in it.')
    s.claimBoss(BOSSES.find((b) => b.week === 1)!.id) // the wrong week's boss
    expect(secrets().perfectWeek).toBe(false)
    s.claimBoss(BOSSES.find((b) => b.week === 2)!.id)
    expect(secrets().perfectWeek).toBe(true)
    expect(has('secret-perfect-week')).toBe(true)
    s.removeWorkout(week2(0)) // an envelope once found stays found
    expect(secrets().perfectWeek).toBe(false)
    expect(has('secret-perfect-week')).toBe(true)
  })
})
