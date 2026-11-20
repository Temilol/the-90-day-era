import { describe, it, expect, beforeEach } from 'vitest'
import { dayNumber, dateForDay, weekOf, chapterOf, addDays, diffDays, seeded, pickN, todayKey as todayKeyForTest } from '@/lib/dates'
import { walkXp, levelFor, walkKind } from '@/lib/xp'
import { computeStats } from '@/lib/stats'
import { decide, type SyncMeta } from '@/lib/syncLogic'
import { useStore, initialState } from '@/store/useStore'
import { isBonusId } from '@/lib/bonuses'

/** XP earned directly by actions, leaving out the bonuses worked out on top (streaks, badges and so on). */
const baseXp = () => useStore.getState().xp.filter((e) => !isBonusId(e.id)).reduce((n, e) => n + Math.max(0, e.amount), 0)

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
    expect(levelFor(3300).title).toBe('Unstoppable')
    expect(levelFor(4300).title).toBe('Royalty')
    expect(levelFor(5499).level).toBe(9)
    expect(levelFor(5500).title).toBe('Era Queen')
    expect(levelFor(6000).next).toBeNull()
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
    expect(baseXp()).toBe(25)
    s.logWorkout(start, { minutes: 15, incline: 12, speed: 3 })
    expect(baseXp()).toBe(15)
    s.removeWorkout(start)
    expect(baseXp()).toBe(0)
  })
  it('quests toggle on/off with XP', () => {
    const s = useStore.getState()
    s.toggleQuest(start, 'stretch'); s.toggleQuest(start, 'stretch'); s.toggleQuest(start, 'stretch')
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(5)
    expect(useStore.getState().days[start].quests.stretch).toBeTruthy()
  })
  it('spending XP does not reduce level progress', () => {
    const s = useStore.getState()
    for (let i = 0; i < 12; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
    const today = addDays(start, 11)
    let st = computeStats(useStore.getState(), today)
    expect(baseXp()).toBe(300)
    const lifetime = st.lifetimeXp
    const level = st.level.level
    expect(lifetime).toBeGreaterThan(300) // bonuses on top
    expect(st.spendableXp).toBe(lifetime)
    expect(s.buyReward('coffee')).toBe(true) // 200 XP
    st = computeStats(useStore.getState(), today)
    expect(st.spentXp).toBe(200)
    expect(st.spendableXp).toBe(st.lifetimeXp - 200)
    expect(st.lifetimeXp).toBeGreaterThanOrEqual(lifetime) // spending never lowers it
    expect(st.level.level).toBeGreaterThanOrEqual(level)
    expect(s.buyReward('grand')).toBe(false) // nowhere near 3,200
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
    expect(baseXp()).toBe(15)
    s.removeWorkout(day1)
    expect(baseXp()).toBe(0)
  })
  it('leaves walks logged under the old values alone', () => {
    fresh()
    useStore.setState((st) => ({ days: { ...st.days, [day1]: { date: day1, quests: {}, workout: { kind: 'standard', minutes: 30, incline: 12, speed: 3, loggedAt: `${day1}T10:00:00.000Z` } } }, xp: [{ id: `workout:${day1}`, amount: 30, reason: '30-minute walk', date: day1, at: `${day1}T10:00:00.000Z` }] }))
    useStore.getState().setShift(day1, 'day')
    expect(baseXp()).toBe(30)
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
  it('totals calories from typed numbers only', () => {
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
    expect(baseXp()).toBe(15 + 15 + 10) // walk, strength, and the day's one activity award
    expect(before.streak).toBe(1)
    s.setWorkoutCalories(day1, undefined)
    s.removeActivity(day1, useStore.getState().days[day1].activities![0].id)
    expect(computeStats(useStore.getState(), day1).calories.total).toBe(60)
  })
  it('other activities earn 10 XP once a day, for 30 minutes or more, whatever the order', () => {
    fresh()
    const s = useStore.getState()
    const xp = () => baseXp()
    const ids = () => useStore.getState().days[day1].activities!.map((a) => a.id)
    s.addActivity(day1, { name: 'Yoga', minutes: 20 })
    expect(xp()).toBe(0) // too short
    s.addActivity(day1, { name: 'Swim', minutes: 40 })
    s.addActivity(day1, { name: 'Bike', minutes: 45 })
    s.addActivity(day1, { name: 'Hike', minutes: 90 })
    expect(xp()).toBe(10) // once, however many qualify
    expect(useStore.getState().xp.filter((e) => e.id === `activity:${day1}`)).toHaveLength(1)
    expect(new Set(ids()).size).toBe(4)
    s.removeActivity(day1, ids()[1]) // the swim goes; bike and hike still qualify
    expect(xp()).toBe(10)
    s.removeActivity(day1, ids()[1]); s.removeActivity(day1, ids()[1])
    expect(ids()).toHaveLength(1) // only the short yoga is left
    expect(xp()).toBe(0)
    s.addActivity('2026-01-02', { name: 'Run', minutes: 30 })
    expect(xp()).toBe(10) // a new day earns its own
    const st = computeStats(useStore.getState(), '2026-01-02')
    expect(st.streak).toBe(0) // activities never count toward the streak
  })
  it('short bursts add up: three stair sessions, or one entry topped up, earn the day’s 10 XP', () => {
    fresh()
    const s = useStore.getState()
    const xp = () => baseXp()
    const acts = (d: string) => useStore.getState().days[d].activities!
    s.addActivity(day1, { name: 'Stairs', minutes: 10 })
    s.addActivity(day1, { name: 'Stairs', minutes: 10 })
    expect(xp()).toBe(0)
    s.addActivity(day1, { name: 'Stairs', minutes: 10 })
    expect(xp()).toBe(10) // 30 in total
    s.removeActivity(day1, acts(day1)[0].id)
    expect(xp()).toBe(0) // back under the line
    s.addActivity('2026-01-02', { name: 'Stairs', minutes: 5 })
    const id = acts('2026-01-02')[0].id
    for (let i = 0; i < 4; i++) s.addActivityMinutes('2026-01-02', id, 5)
    expect(acts('2026-01-02')[0].minutes).toBe(25)
    expect(xp()).toBe(0)
    s.addActivityMinutes('2026-01-02', id, 5)
    s.addActivityMinutes('2026-01-02', id, 5)
    expect(acts('2026-01-02')).toHaveLength(1)
    expect(acts('2026-01-02')[0].minutes).toBe(35)
    expect(xp()).toBe(10) // once, not again at 35
    s.addActivity('2026-01-03', { name: 'Yoga', minutes: 20 }); s.addActivity('2026-01-03', { name: 'Stairs', minutes: 10 })
    expect(xp()).toBe(20) // different activities combine too
    s.toggleQuest('2026-01-03', 'stairs')
    expect(xp()).toBe(25) // the stairs quest is separate and untouched
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
      profile: { ...base.profile, startDate: '2026-01-01', onboarded: true, waterNudges: false }, // hydration nudges are tested separately
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
  it('every prize has its own key', async () => {
    const { PRIZES } = await import('@/content/envelopes')
    const keys = PRIZES.map((p) => p.key)
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([])
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
    expect(baseXp()).toBe(60)
    s.logWorkout(today, { minutes: 10, incline: 12, speed: 3 })
    expect(baseXp()).toBe(30)
    s.setShift(today, 'off')
    expect(baseXp()).toBe(20)
    const st = useStore.getState()
    expect(prizeUsed(st.prizes[0], st, today)).toBe(true)
    expect(prizeUsed(st.prizes[1], st, today)).toBe(false)
    s.removeWorkout(today)
    expect(baseXp()).toBe(0)
    // a double-XP day that never got a walk hands the prize back the next day
    expect(prizeUsed(useStore.getState().prizes[0], useStore.getState(), addDays(today, 1))).toBe(false)
  })
  it('a discount prize lowers one shop price and is then spent', () => {
    setup({ prizes: [{ id: 'c1', key: 'off20', from: 'day30', wonAt: 'x' }], xp: [{ id: 'seed', amount: 450, reason: 'seed', date: day1, at: 'x' }] })
    const s = useStore.getState()
    expect(s.buyReward('accessory')).toBe(false) // 500 XP, only 450
    expect(s.buyReward('accessory', 'c1')).toBe(true) // 400 with 20% off
    expect(useStore.getState().purchases[0].cost).toBe(400)
    expect(useStore.getState().prizes[0].usedAt).toBeTruthy()
    expect(useStore.getState().prizes[0].note).toBe('New workout accessory')
    useStore.setState((st) => ({ xp: [...st.xp, { id: 'more', amount: 250, reason: 'seed', date: day1, at: 'x' }] }))
    expect(s.buyReward('coffee', 'c1')).toBe(true) // coupon already spent: full price
    expect(useStore.getState().purchases[1].cost).toBe(200)
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
    const early = { day5: { id: 'day5', unlockedAt: 'x' } }
    const boss = { ...early, 'boss-down': { id: 'boss-down', unlockedAt: 'x' } }
    expect(nextEnvelope(computeStats(st, addDays(day1, 3)), early)).toEqual({ title: 'Boss Down', need: '1 more boss defeat' })
    expect(nextEnvelope(computeStats(st, addDays(day1, 3)), boss)).toEqual({ title: 'One Week In', need: '3 more days' })
    expect(nextEnvelope(computeStats(st, addDays(day1, 3)), { ...boss, day7: { id: 'day7', unlockedAt: 'x' } })).toEqual({ title: 'Seven-Day Streak', need: '3 more days in a row' })
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
    expect(ENVELOPE_DEFS.filter(isSecret).map((d) => d.tier).sort()).toEqual(['common', 'common', 'common', 'legendary', 'legendary', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare'])
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
    for (const q of ['nourish', 'protein', 'stretch']) s.toggleQuest(day1, q)
    s.addWater(day1, 2000) // hydration can only be completed by logging water
    s.setBonusMission(day1, 'Dance break', 'Wheel'); s.completeBonusMission(day1)
    s.saveJournal(day1, { reflection: 'A long day, and I still did all of it.' })
    expect(secrets().perfectDay).toBe(false) // no strength yet
    s.logStrength('2026-01-02', 10) // on a different day doesn't count
    expect(secrets().perfectDay).toBe(false)
    s.logStrength(day1, 10)
    expect(secrets().perfectDay).toBe(false) // no other activity yet
    s.addActivity(day1, { name: 'Bike ride', minutes: 30 })
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
  it('Night Shift Hero: a walk of 30 minutes or more on a night shift', () => {
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'night')
    s.logWorkout(day1, { minutes: 29, incline: 12, speed: 3 })
    expect(secrets().nightShiftHero).toBe(false)
    s.logWorkout(day1, { minutes: 30, incline: 12, speed: 3 })
    expect(secrets().nightShiftHero).toBe(true)
    fresh()
    useStore.getState().setShift(day1, 'day'); useStore.getState().logWorkout(day1, { minutes: 45, incline: 12, speed: 3 })
    expect(secrets().nightShiftHero).toBe(false)
  })
  it('Hydration Hero and Dear Diary need seven days in a row', () => {
    const base = '2026-01-01'
    const days = (n: number, over: (d: string) => object, skip = -1) => Object.fromEntries(Array.from({ length: n }, (_, i) => i).filter((i) => i !== skip).map((i) => { const d = addDays(base, i); return [d, { date: d, quests: {}, ...over(d) }] }))
    const water = () => ({ water: 1893 })
    const wrote = (d: string) => ({ journal: { reflection: 'Wrote something real today.', updatedAt: `${d}T20:00:00` } })
    fresh(); useStore.setState({ days: days(7, water) })
    expect(secrets().hydrationHero).toBe(true)
    useStore.setState({ days: days(7, water, 3) })
    expect(secrets().hydrationHero).toBe(false) // a gap in the middle
    useStore.setState({ days: days(7, wrote) })
    expect(secrets().dearDiary).toBe(true)
    useStore.setState({ days: days(7, wrote, 6) })
    expect(secrets().dearDiary).toBe(false)
    useStore.setState({ days: days(7, (d) => ({ journal: { mood: 'good', updatedAt: `${d}T20:00:00` } })) })
    expect(secrets().dearDiary).toBe(false) // a mood tap is not writing
  })
  it('Theme Explorer needs every walk theme, and Fifteen Thousand needs 15,000 steps in a day', async () => {
    const { THEMES } = await import('@/content/themes')
    fresh()
    const s = useStore.getState()
    THEMES.slice(0, -1).forEach((t, i) => s.logWorkout(addDays(day1, i), { minutes: 10, incline: 12, speed: 3, theme: t.id }))
    expect(secrets().themeExplorer).toBe(false)
    s.logWorkout(addDays(day1, 20), { minutes: 10, incline: 12, speed: 3, theme: THEMES[THEMES.length - 1].id })
    expect(secrets().themeExplorer).toBe(true)
    s.setSteps(day1, 14999)
    expect(secrets().fifteenThousand).toBe(false)
    s.setSteps(day1, 15000)
    expect(secrets().fifteenThousand).toBe(true)
  })
  it('The Perfect Chapter needs all 30 days active, and a freeze day does not count', () => {
    const days = (n: number, skip = -1) => Object.fromEntries(Array.from({ length: n }, (_, i) => i).filter((i) => i !== skip).map((i) => { const d = addDays(day1, i); return [d, { date: d, quests: {}, workout: { kind: 'standard' as const, minutes: 10, incline: 12, speed: 3, loggedAt: `${d}T10:00:00` } }] }))
    fresh(); useStore.setState({ days: days(29) })
    expect(secrets().perfectChapter).toBe(false)
    useStore.setState({ days: days(30) })
    expect(secrets().perfectChapter).toBe(true)
    useStore.setState({ days: days(30, 12), freezes: { [addDays(day1, 12)]: 'x' } })
    expect(secrets().perfectChapter).toBe(false)
    // a planned recovery day is active
    useStore.setState({ days: { ...days(30, 12), [addDays(day1, 12)]: { date: addDays(day1, 12), quests: {}, recovery: true } }, freezes: {} })
    expect(secrets().perfectChapter).toBe(true)
  })
  it('Night Shift Hero and Boss Down count only from when the newer rules began', () => {
    const now = new Date().toISOString()
    const before = '2026-01-02T08:00:00.000Z', after = '2999-01-01T00:00:00.000Z'
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'night')
    s.logWorkout(day1, { minutes: 40, incline: 12, speed: 3 })
    useStore.setState({ envelopeSince: after }) // the new rules begin later than that walk
    expect(secrets().nightShiftHero).toBe(false)
    useStore.setState({ envelopeSince: before })
    expect(secrets().nightShiftHero).toBe(true)
    // bosses: one defeated before the rules began doesn't count, the next one does
    fresh()
    useStore.setState((st) => { st.xp.push({ id: 'boss:old', amount: 25, reason: 'Defeated', date: day1, at: before }) })
    useStore.setState({ envelopeSince: now })
    expect(computeStats(useStore.getState(), day1).bossesSinceUpdate).toBe(0)
    useStore.setState((st) => { st.xp.push({ id: 'boss:new', amount: 25, reason: 'Defeated', date: day1, at: after }) })
    expect(computeStats(useStore.getState(), day1).bossesSinceUpdate).toBe(1)
  })
  it('old saved data starts the newer envelope rules from now, and new data from the start', async () => {
    const { upgradeData } = await import('@/store/useStore')
    type Data = Partial<ReturnType<typeof initialState>>
    const profile = (onboarded: boolean) => ({ ...initialState().profile, onboarded })
    expect(upgradeData({ profile: profile(true) } as Data).envelopeSince).toBeTruthy()
    expect(upgradeData({ profile: profile(false) } as Data).envelopeSince).toBeUndefined()
    expect(upgradeData({ profile: profile(true), envelopeSince: '' } as Data).envelopeSince).toBe('')
    expect(initialState().envelopeSince).toBe('')
  })
  it('Double XP, two days in a row doubles both days and is spent until both have passed', async () => {
    const { prizeUsed } = await import('@/lib/prizes')
    const { todayKey } = await import('@/lib/dates')
    const today = todayKey(), tomorrow = addDays(today, 1)
    fresh(); useStore.setState({ profile: { name: 'T', startDate: addDays(today, -3), units: 'lb', onboarded: true } })
    useStore.setState({ prizes: [{ id: 'p1', key: 'double2', from: 'x', wonAt: new Date().toISOString() }] })
    useStore.getState().logWorkout(today, { minutes: 30, incline: 12, speed: 3 })
    useStore.getState().redeemPrize('p1')
    const st = useStore.getState()
    expect([st.days[today].doubleXp, st.days[tomorrow].doubleXp]).toEqual(['p1', 'p1'])
    expect(st.xp.find((e) => e.id === `double:${today}`)?.amount).toBe(25)
    expect(prizeUsed(st.prizes[0], st, today)).toBe(true)
    // Once tomorrow arrives, its walk doubles too.
    const yesterday = addDays(today, -1)
    fresh(); useStore.setState({ profile: { name: 'T', startDate: addDays(today, -3), units: 'lb', onboarded: true } })
    useStore.setState((x) => { x.prizes = [{ id: 'p2', key: 'double2', from: 'x', wonAt: yesterday, usedOn: yesterday, usedAt: yesterday }]; x.days[yesterday] = { date: yesterday, quests: {}, doubleXp: 'p2' }; x.days[today] = { date: today, quests: {}, doubleXp: 'p2' } })
    useStore.getState().logWorkout(today, { minutes: 30, incline: 12, speed: 3 })
    expect(useStore.getState().xp.find((e) => e.id === `double:${today}`)?.amount).toBe(25)
    expect(prizeUsed(useStore.getState().prizes[0], useStore.getState(), today)).toBe(true)
  })
  it('the new visible envelopes unlock on boss, strength, streak and workout goals', () => {
    fresh()
    const s = useStore.getState()
    for (let i = 0; i < 3; i++) s.logWorkout(addDays(day1, i), { minutes: 30, incline: 12, speed: 3 })
    s.logStrength(day1, 10)
    const has = (id: string) => !!useStore.getState().envelopes[id]
    s.checkProgress()
    expect([has('day5'), has('boss-down'), has('str10')]).toEqual([true, false, false])
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

describe('hydration', () => {
  const day1 = '2026-01-01'
  const fresh = (profile: object = {}) => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: day1, units: 'lb', onboarded: true, ...profile } })
  const xp = () => baseXp()
  const d = () => useStore.getState().days[day1]

  it('defaults to 64 oz, converts tidily, and eight glasses reach the goal', async () => {
    const { waterSettings, toMl, fromMl, goalMet, convertWaterSettings } = await import('@/lib/water')
    const base = initialState().profile
    const ws = waterSettings(base)
    expect([ws.unit, fromMl(ws.goalMl, 'oz'), fromMl(ws.glassMl, 'oz'), fromMl(ws.bottleMl, 'oz'), ws.nudges]).toEqual(['oz', 64, 8, 24, true])
    expect(goalMet(8 * toMl(8, 'oz'), ws.goalMl)).toBe(true)
    expect(goalMet(7 * toMl(8, 'oz'), ws.goalMl)).toBe(false)
    const ml = convertWaterSettings(base, 'ml')
    expect([ml.waterUnit, ml.waterGoal, ml.waterBottle]).toEqual(['ml', 1900, 700])
    const back = convertWaterSettings({ ...base, ...ml }, 'oz')
    expect(fromMl(back.waterGoal!, 'oz')).toBe(64)
  })
  it('cannot be ticked by hand; it follows the water log in both directions', async () => {
    const { toMl } = await import('@/lib/water')
    fresh()
    const s = useStore.getState()
    s.toggleQuest(day1, 'hydrate')
    expect(d()?.quests?.hydrate).toBeFalsy()
    expect(xp()).toBe(0)
    for (let i = 0; i < 2; i++) s.addWater(day1, toMl(24, 'oz'))
    expect(d().quests.hydrate).toBeFalsy() // 48 of 64
    s.addWater(day1, toMl(16, 'oz'))
    expect(d().quests.hydrate).toBeTruthy()
    expect(xp()).toBe(5)
    s.addWater(day1, toMl(8, 'oz'))
    expect(xp()).toBe(5) // going past the goal earns nothing more
    s.undoWater(day1)
    expect(d().quests.hydrate).toBeTruthy()
    s.undoWater(day1) // back to 48
    expect(d().quests.hydrate).toBeFalsy()
    expect(xp()).toBe(0)
    s.toggleQuest(day1, 'hydrate')
    expect(d().quests.hydrate).toBeFalsy()
    s.undoWater(day1); s.undoWater(day1); s.undoWater(day1) // nothing left to undo
    expect(d().water).toBe(0)
    s.addWater(day1, -50)
    expect(d().water).toBe(0)
  })
  it('uses the chosen goal, and leaves an older hand-ticked day alone', async () => {
    const { toMl } = await import('@/lib/water')
    fresh({ waterUnit: 'ml', waterGoal: 1500 })
    const s = useStore.getState()
    s.addWater(day1, 750); s.addWater(day1, 750)
    expect(d().quests.hydrate).toBeTruthy()
    // a day ticked by hand before water logging existed keeps its tick and XP
    useStore.setState((st) => ({ days: { ...st.days, '2026-01-02': { date: '2026-01-02', quests: { hydrate: 'x' } } }, xp: [...st.xp, { id: 'quest:2026-01-02:hydrate', amount: 5, reason: 'Daily quest', date: '2026-01-02', at: 'x' }] }))
    expect(baseXp()).toBe(10)
    const stats = computeStats(useStore.getState(), '2026-01-02')
    expect(stats.water).toEqual({ days: 1, totalMl: 1500 })
    expect(stats.questCounts.hydrate).toBe(2)
    expect(toMl(1, 'ml')).toBe(1)
  })
  it('nudges twice a day only while behind, and stops once the goal is met', async () => {
    const { buildReminderQueue } = await import('@/lib/reminderQueue')
    const { toMl } = await import('@/lib/water')
    const base = initialState()
    const local = (iso: string) => { const t = new Date(iso); return `${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}` }
    const make = (day: object, profile: object = {}) => ({ ...base, reminders: [], profile: { ...base.profile, startDate: day1, onboarded: true, walkReminders: false, ...profile }, days: { [day1]: { date: day1, quests: {}, ...day } } })
    const morning = new Date(2026, 0, 1, 5, 0)
    const water = (s: ReturnType<typeof make>) => buildReminderQueue(s, morning, 1).filter((r) => r.title === 'Water check').map((r) => local(r.fire_at))
    expect(water(make({ shift: 'day' }))).toEqual(['1 10:00', '1 14:00']) // a third and two thirds through a 6-to-6 shift
    expect(water(make({ shift: 'night' }))).toEqual(['1 22:00']) // the 2 AM one would fall on the next day
    expect(water(make({ shift: 'off' }))).toEqual(['1 12:00', '1 17:00'])
    expect(water(make({ shift: 'day', water: toMl(24, 'oz') }))).toEqual(['1 14:00']) // ahead of the first check
    expect(water(make({ shift: 'day', water: toMl(48, 'oz') }))).toEqual([])
    expect(water(make({ shift: 'day', quests: { hydrate: 'x' } }))).toEqual([])
    expect(water(make({ shift: 'day' }, { waterNudges: false }))).toEqual([])
    expect(water(make({ shift: 'day', workout: { kind: 'standard', minutes: 30, incline: 12, speed: 3, loggedAt: 'x' } }))).toEqual(['1 10:00', '1 14:00']) // still nudged after the walk
    expect(buildReminderQueue(make({ shift: 'day' }), morning, 1).find((r) => r.title === 'Water check')!.body).toBe('Aim for about 21 oz by now. You’re at 0.')
  })
})

describe('shift quests after the bottle quest was retired', () => {
  it('has the four new ones, no bottle quest, and only suggests packing a bag before a work day', async () => {
    const { questsFor } = await import('@/lib/hooks')
    const { QUEST_POOL } = await import('@/content/quests')
    const ids = QUEST_POOL.map((q) => q.id)
    expect(ids).not.toContain('water-bottle')
    for (const id of ['quiet-break', 'meal-away', 'text-love', 'pack-bag']) expect(ids).toContain(id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(QUEST_POOL.filter((q) => q.category === 'hydration')).toHaveLength(0) // water is only the tracker now
    let seen = 0
    for (let i = 0; i < 200; i++) {
      const date = addDays('2026-01-01', i)
      for (const shift of ['day', 'elective', 'off', undefined] as const) {
        const base = questsFor(date, shift)
        if (!base.some((q) => q.id === 'pack-bag')) continue
        seen++
        expect(questsFor(date, shift, undefined, undefined, 'night').map((q) => q.id)).toEqual(base.map((q) => q.id)) // work tomorrow: unchanged
        for (const tomorrow of ['off', 'recovery'] as const) {
          const adjusted = questsFor(date, shift, undefined, undefined, tomorrow)
          expect(adjusted.map((q) => q.id)).not.toContain('pack-bag')
          expect(adjusted).toHaveLength(4)
          expect(new Set(adjusted.map((q) => q.id)).size).toBe(4)
          expect(adjusted.filter((q, j) => q.id !== base[j].id)).toHaveLength(1) // only that one slot changes
        }
        // already ticked off: it stays, whatever tomorrow is
        expect(questsFor(date, shift, { 'pack-bag': 'x' }, undefined, 'off').map((q) => q.id)).toContain('pack-bag')
      }
      for (const shift of ['night', 'recovery'] as const) expect(questsFor(date, shift).map((q) => q.id)).not.toContain('pack-bag')
    }
    expect(seen).toBeGreaterThan(5)
  })
})

describe('steps', () => {
  const day1 = '2026-01-01'
  const fresh = (profile: object = {}) => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: day1, units: 'lb', onboarded: true, ...profile } })
  const stats = () => computeStats(useStore.getState(), '2026-01-20')

  it('are tracked without XP or streak, against a goal of 8,000 unless changed', () => {
    fresh()
    const s = useStore.getState()
    s.setShift(day1, 'day'); s.setSteps(day1, 12400.4)
    s.setShift('2026-01-02', 'off'); s.setSteps('2026-01-02', 3000)
    s.setSteps('2026-01-03', 8000)
    s.setSteps('2026-01-03', 7999) // editing replaces
    s.setSteps('2026-01-04', 0) // nothing to record
    s.setSteps(addDays(todayKeyForTest(), 3), 9000) // not a future day
    let st = stats()
    expect(st.steps.days).toBe(3)
    expect(st.steps.total).toBe(12400 + 3000 + 7999)
    expect(st.steps.goal).toBe(8000)
    expect(st.steps.goalDays).toBe(1)
    expect(st.steps.best).toEqual({ date: day1, value: 12400 })
    expect(st.steps.byShift.day).toEqual({ days: 1, total: 12400 })
    expect(st.steps.byShift.off).toEqual({ days: 1, total: 3000 })
    expect(st.lifetimeXp).toBe(0)
    expect(st.streak).toBe(0)
    useStore.getState().setProfile({ stepGoal: 3000 })
    expect(stats().steps.goalDays).toBe(3)
    s.setSteps(day1, undefined)
    st = stats()
    expect(st.steps.days).toBe(2)
    expect(useStore.getState().days[day1].steps).toBeUndefined()
  })
  it('award the On Your Feet badge after ten days at goal', () => {
    fresh()
    const s = useStore.getState()
    for (let i = 0; i < 9; i++) s.setSteps(addDays(day1, i), 8000)
    s.setSteps(addDays(day1, 9), 7000)
    expect(useStore.getState().badges['steps-10']).toBeUndefined()
    s.setSteps(addDays(day1, 9), 9500)
    expect(useStore.getState().badges['steps-10']).toBeTruthy()
  })
})

describe('app updates', () => {
  it('waits for a moment when nothing would be lost', async () => {
    const { safeToRefresh } = await import('@/lib/appUpdate')
    const idle = { hidden: false, dialogOpen: false, fieldFocused: false, msSinceTyping: 10 * 60_000, msSinceTouch: 60_000 }
    expect(safeToRefresh(idle)).toBe(true)
    expect(safeToRefresh({ ...idle, dialogOpen: true })).toBe(false) // a form or envelope is open
    expect(safeToRefresh({ ...idle, fieldFocused: true })).toBe(false) // cursor in a field
    expect(safeToRefresh({ ...idle, msSinceTyping: 30_000 })).toBe(false) // typed half a minute ago
    expect(safeToRefresh({ ...idle, msSinceTouch: 3_000 })).toBe(false) // tapping around right now
    expect(safeToRefresh({ ...idle, hidden: true, msSinceTouch: 3_000 })).toBe(true) // just switched away: the best moment
    expect(safeToRefresh({ ...idle, hidden: true, msSinceTyping: 30_000 })).toBe(false) // switched away mid-entry
  })
})

describe('bonus XP worked out from what she has logged', () => {
  const day1 = '2026-01-01'
  const fresh = (start = day1, extra: object = {}) => useStore.setState({ ...initialState(), profile: { name: 'T', startDate: start, units: 'lb', onboarded: true }, ...extra })
  const xpOf = (id: string) => useStore.getState().xp.find((e) => e.id === id)?.amount ?? 0
  const walk = (date: string, minutes = 30) => useStore.getState().logWorkout(date, { minutes, incline: 12, speed: 3 })

  it('streak milestones pay once each and follow the streak', () => {
    fresh()
    walk(day1); walk('2026-01-02')
    expect(xpOf('streak:3')).toBe(0)
    useStore.getState().setRecovery('2026-01-03', true) // a rest day keeps the streak
    expect(xpOf('streak:3')).toBe(10)
    for (let i = 3; i < 7; i++) walk(addDays(day1, i))
    expect([xpOf('streak:3'), xpOf('streak:7'), xpOf('streak:14')]).toEqual([10, 20, 0])
    expect(useStore.getState().xp.filter((e) => e.id === 'streak:3')).toHaveLength(1)
    useStore.getState().removeWorkout('2026-01-04') // now the longest run is 3
    expect([xpOf('streak:3'), xpOf('streak:7')]).toEqual([10, 0])
  })
  it('five treadmill walks in a challenge week pay 20; rest days and other activity do not count', () => {
    fresh()
    for (let i = 0; i < 4; i++) walk(addDays(day1, i), 10)
    useStore.getState().setRecovery('2026-01-05', true)
    useStore.getState().addActivity('2026-01-06', { name: 'Bike', minutes: 60 })
    expect(xpOf('week5:1')).toBe(0)
    walk('2026-01-07', 5)
    expect(xpOf('week5:1')).toBe(20)
    expect(useStore.getState().xp.find((e) => e.id === 'week5:1')!.date).toBe('2026-01-07')
    walk('2026-01-06')
    expect(xpOf('week5:1')).toBe(20) // a sixth walk adds nothing
    walk('2026-01-08') // week 2 starts fresh
    expect(xpOf('week5:2')).toBe(0)
    useStore.getState().removeWorkout('2026-01-01'); useStore.getState().removeWorkout('2026-01-02')
    expect(xpOf('week5:1')).toBe(0)
  })
  it('all four quests in a day pay 5 extra', () => {
    fresh()
    const s = useStore.getState()
    for (const q of ['nourish', 'protein', 'stretch']) s.toggleQuest(day1, q)
    expect(xpOf(`fullquests:${day1}`)).toBe(0)
    s.addWater(day1, 2000)
    expect(xpOf(`fullquests:${day1}`)).toBe(5)
    s.toggleQuest(day1, 'stretch')
    expect(xpOf(`fullquests:${day1}`)).toBe(0)
  })
  it('badges pay 10 XP, hidden ones 20', async () => {
    const { BADGES } = await import('@/content/badges')
    fresh()
    walk(day1)
    const held = Object.keys(useStore.getState().badges)
    expect(held.length).toBeGreaterThan(0)
    for (const id of held) expect(xpOf(`badge:${id}`)).toBe(BADGES.find((b) => b.id === id)!.hidden ? 20 : 10)
    useStore.setState((st) => ({ badges: { ...st.badges, 'night-owl': new Date().toISOString() } }))
    useStore.getState().checkProgress()
    expect(xpOf('badge:night-owl')).toBe(20)
  })
  it('the newer badges unlock on the rules they describe', async () => {
    const { BADGES } = await import('@/content/badges')
    const stats = (over: Record<string, unknown>) => ({ currentDay: 0, daysLogged: 0, bestStreak: 0, questsCompleted: 0, bonusMissions: 0, comebacks: 0, weekly: [], byShift: {}, freezesLeftByChapter: [1, 1, 1], ...over }) as unknown as Parameters<(typeof BADGES)[number]['check']>[0]
    const earns = (id: string, over: Record<string, unknown>) => BADGES.find((b) => b.id === id)!.check(stats(over))
    expect(earns('week-one', { currentDay: 7, daysLogged: 3 })).toBe(true)
    expect(earns('week-one', { currentDay: 7, daysLogged: 2 })).toBe(false)
    expect(earns('perfect-week', { weekly: [{ workouts: 4 }, { workouts: 5 }] })).toBe(true)
    expect(earns('perfect-week', { weekly: [{ workouts: 4 }] })).toBe(false)
    expect(earns('streak-30', { bestStreak: 30 })).toBe(true)
    expect(earns('streak-30', { bestStreak: 29 })).toBe(false)
    expect(earns('quests-100', { questsCompleted: 100 })).toBe(true)
    expect(earns('bonus-10', { bonusMissions: 9 })).toBe(false)
    expect(earns('resilient', { comebacks: 3 })).toBe(true)
    const walks = (n: number) => ({ days: n, walks: n, minutes: 0 })
    expect(earns('every-kind', { byShift: { day: walks(1), night: walks(1), elective: walks(1), off: walks(1) } })).toBe(true)
    expect(earns('every-kind', { byShift: { day: walks(1), night: walks(1), elective: walks(1), off: walks(0) } })).toBe(false)
    // A chapter only counts once it is over, and only when its freeze is still unused.
    expect(earns('never-needed', { currentDay: 20, daysLogged: 20, freezesLeftByChapter: [1, 1, 1] })).toBe(false)
    expect(earns('never-needed', { currentDay: 31, daysLogged: 20, freezesLeftByChapter: [1, 1, 1] })).toBe(true)
    expect(earns('never-needed', { currentDay: 31, daysLogged: 20, freezesLeftByChapter: [0, 1, 1] })).toBe(false)
    expect(earns('never-needed', { currentDay: 31, daysLogged: 5, freezesLeftByChapter: [1, 1, 1] })).toBe(false)
  })
  it('a journal entry pays 5 when it has real writing and was written on its day or the day after', () => {
    const today = todayKeyForTest()
    fresh(addDays(today, -10))
    const s = useStore.getState()
    s.saveJournal(today, { mood: 'good' })
    expect(xpOf(`journal:${today}`)).toBe(0) // a mood tap is not writing
    s.saveJournal(today, { reflection: 'Short.' })
    expect(xpOf(`journal:${today}`)).toBe(0)
    s.saveJournal(today, { reflection: 'Felt strong on the incline today.' })
    expect(xpOf(`journal:${today}`)).toBe(5)
    s.saveJournal(today, { gratitude: 'A quiet shift.' })
    expect(useStore.getState().xp.filter((e) => e.id === `journal:${today}`)).toHaveLength(1)
    const yesterday = addDays(today, -1)
    s.saveJournal(yesterday, { reflection: 'Writing this the morning after a night shift.' })
    expect(xpOf(`journal:${yesterday}`)).toBe(5)
    const old = addDays(today, -5)
    s.saveJournal(old, { reflection: 'Filling in a day from last week, long after.' })
    expect(xpOf(`journal:${old}`)).toBe(0)
    s.saveJournal(today, { reflection: '', gratitude: '' })
    expect(xpOf(`journal:${today}`)).toBe(0)
  })
  it('a journal entry written on time before this update still earns when edited later', () => {
    const today = todayKeyForTest()
    const date = addDays(today, -6)
    fresh(addDays(today, -10), { days: { [date]: { date, quests: {}, journal: { reflection: 'Written on the day, before bonuses existed.', updatedAt: `${date}T20:00:00` } } } })
    useStore.getState().checkProgress()
    expect(xpOf(`journal:${date}`)).toBe(5)
    useStore.getState().saveJournal(date, { gratitude: 'Adding a line a week later.' })
    expect(xpOf(`journal:${date}`)).toBe(5)
  })
  it('one check-in and one victory pay per challenge week, and the time capsule pays once', () => {
    const today = todayKeyForTest()
    fresh(addDays(today, -8)) // today is day 9, in week 2
    const s = useStore.getState()
    s.addWeight(addDays(today, -8), 180)
    s.addWeight(addDays(today, -7), 179.5)
    expect(xpOf('checkin:1')).toBe(10)
    expect(xpOf('checkin:2')).toBe(0)
    s.addPhoto(today, 'photo-1')
    expect(xpOf('checkin:2')).toBe(10)
    s.removeWeight(addDays(today, -8))
    expect(xpOf('checkin:1')).toBe(10) // the other weigh-in that week still counts
    s.removeWeight(addDays(today, -7))
    expect(xpOf('checkin:1')).toBe(0)
    s.addNsv('Energy', 'Took the stairs without stopping'); s.addNsv('Sleep', 'Slept through')
    expect(xpOf('nsv:2')).toBe(5)
    expect(useStore.getState().xp.filter((e) => e.id.startsWith('nsv:'))).toHaveLength(1)
    s.sealCapsule('Dear me, you kept going.')
    expect(xpOf('capsule')).toBe(20)
  })
  it('gives past days their bonuses the first time it runs, and settles in one go', () => {
    const days = Object.fromEntries(Array.from({ length: 8 }, (_, i) => { const date = addDays(day1, i); return [date, { date, quests: { a: 'x', b: 'x', c: 'x', hydrate: 'x' }, workout: { kind: 'standard' as const, minutes: 30, incline: 12, speed: 3, loggedAt: `${date}T10:00:00` } }] }))
    fresh(day1, { days, weights: [{ date: day1, value: 180 }] })
    expect(useStore.getState().xp).toHaveLength(0)
    useStore.getState().checkProgress()
    expect([xpOf('streak:3'), xpOf('streak:7'), xpOf('week5:1'), xpOf(`fullquests:${day1}`), xpOf('checkin:1')]).toEqual([10, 20, 20, 5, 10])
    const after = useStore.getState().xp.length
    useStore.getState().checkProgress()
    expect(useStore.getState().xp).toHaveLength(after) // nothing more to add or remove
    for (const id of Object.keys(useStore.getState().badges)) expect(xpOf(`badge:${id}`)).toBeGreaterThan(0)
  })

  describe('the newer bonuses', () => {
    const today = todayKeyForTest()
    const log = (date: string, over: object = {}) => ({ date, quests: {}, ...over })
    const walked = (date: string, minutes = 30, theme?: string) => ({ kind: 'standard' as const, minutes, incline: 12, speed: 3, loggedAt: `${date}T10:00:00`, theme })
    const withDays = (start: string, entries: Record<string, object>) => { fresh(start, { days: Object.fromEntries(Object.entries(entries).map(([d, o]) => [d, log(d, o)])) }); useStore.getState().checkProgress() }

    it('a perfect day pays 15, needs every part, and is kept once earned', () => {
      const date = addDays(today, -1)
      const full = { workout: walked(date), strength: { minutes: 5, loggedAt: `${date}T11:00:00` }, activities: [{ id: 'a', name: 'Bike', minutes: 30, loggedAt: `${date}T12:00:00` }], bonusMission: { text: 'Dance', source: 'Wheel', done: true }, journal: { reflection: 'Did every single thing today.', updatedAt: `${date}T21:00:00` }, quests: { a: 'x', b: 'x', c: 'x', d: 'x' } }
      withDays(addDays(today, -5), { [date]: full })
      expect(xpOf(`perfect:${date}`)).toBe(15)
      // each missing part means no perfect day
      const short: Record<string, object> = { walk: { workout: walked(date, 29) }, strength: { strength: { minutes: 4, loggedAt: '' } }, activity: { activities: [{ id: 'a', name: 'Bike', minutes: 29, loggedAt: '' }] }, mission: { bonusMission: { text: 'Dance', source: 'Wheel', done: false } }, journal: { journal: { mood: 'good', updatedAt: `${date}T21:00:00` } }, quests: { quests: { a: 'x', b: 'x', c: 'x' } } }
      for (const [k, v] of Object.entries(short)) { withDays(addDays(today, -5), { [date]: { ...full, ...v } }); expect([k, xpOf(`perfect:${date}`)]).toEqual([k, 0]) }
      // once earned it stays, even if the day is edited afterwards
      withDays(addDays(today, -5), { [date]: full })
      useStore.setState((st) => { st.days[date] = { ...st.days[date], journal: undefined } })
      useStore.getState().checkProgress()
      expect(xpOf(`perfect:${date}`)).toBe(15)
    })

    it('a chapter pays 30, 45 or 60 only with 20 active days, and is kept', () => {
      const start = addDays(today, -31) // today is day 32, so chapter 1 is over
      withDays(start, Object.fromEntries(Array.from({ length: 19 }, (_, i) => [addDays(start, i), { workout: walked(addDays(start, i), 10) }])))
      expect(xpOf('chapter:1')).toBe(0)
      withDays(start, Object.fromEntries(Array.from({ length: 20 }, (_, i) => [addDays(start, i), { workout: walked(addDays(start, i), 10) }])))
      expect(xpOf('chapter:1')).toBe(30)
      expect(xpOf('chapter:2')).toBe(0) // chapter 2 isn't over yet
      useStore.getState().removeWorkout(start)
      expect(xpOf('chapter:1')).toBe(30) // earned, so it stays
    })

    it('a comeback pays 10 after three quiet days, once per challenge week', () => {
      const start = addDays(today, -20)
      const w = (i: number) => [addDays(start, i), { workout: walked(addDays(start, i), 10) }] as const
      // walk day 1, three quiet days, walk day 5; then quiet 6-8, walk day 9 (week 2)
      withDays(start, Object.fromEntries([w(0), w(4), w(8)]))
      expect([xpOf('comeback:1'), xpOf('comeback:2')]).toEqual([10, 10])
      // two quiet days is not a break
      withDays(start, Object.fromEntries([w(0), w(3)]))
      expect(xpOf('comeback:1')).toBe(0)
      // two breaks in one week still pay once
      withDays(start, Object.fromEntries([w(0), w(4), w(6)]))
      expect(useStore.getState().xp.filter((e) => e.id.startsWith('comeback:'))).toHaveLength(1)
      // the first walk of the challenge is not a comeback
      withDays(start, Object.fromEntries([w(4)]))
      expect(xpOf('comeback:1')).toBe(0)
    })

    it('water and journal weeks need every day of the week', () => {
      const start = addDays(today, -13)
      const week = (from: number, over: (d: string) => object) => Object.fromEntries(Array.from({ length: 7 }, (_, i) => [addDays(start, from + i), over(addDays(start, from + i))]))
      const wrote = (d: string) => ({ journal: { reflection: 'Wrote something real today.', updatedAt: `${d}T20:00:00` } })
      withDays(start, { ...week(0, () => ({ water: 1893 })), ...week(7, () => ({ water: 1893 })) })
      expect([xpOf('waterweek:1'), xpOf('waterweek:2')]).toEqual([10, 10])
      withDays(start, { ...week(0, () => ({ water: 1893 })), ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [addDays(start, 7 + i), { water: 1893 }])) })
      expect([xpOf('waterweek:1'), xpOf('waterweek:2')]).toEqual([10, 0])
      withDays(start, { ...week(0, wrote), ...week(7, (d) => (d === addDays(start, 9) ? {} : wrote(d))) })
      expect([xpOf('journalweek:1'), xpOf('journalweek:2')]).toEqual([10, 0])
      // kept once earned
      useStore.setState((st) => { st.days[start] = { ...st.days[start], journal: undefined } })
      useStore.getState().checkProgress()
      expect(xpOf('journalweek:1')).toBe(10)
    })

    it('the first walk in each new theme pays 3, once per theme', () => {
      const start = addDays(today, -5)
      withDays(start, { [start]: { workout: walked(start, 10, 'hill') }, [addDays(start, 1)]: { workout: walked(addDays(start, 1), 10, 'hill') }, [addDays(start, 2)]: { workout: walked(addDays(start, 2), 10, 'interval') } })
      expect([xpOf('theme:hill'), xpOf('theme:interval')]).toEqual([3, 3])
      expect(useStore.getState().xp.filter((e) => e.id.startsWith('theme:'))).toHaveLength(2)
    })
  })
})

describe('shop prices', () => {
  it('uses the new defaults and moves untouched old prices up once', async () => {
    const { upgradeData, applySnapshot } = await import('@/store/useStore')
    const { DEFAULT_REWARDS } = await import('@/content/rewards')
    expect(DEFAULT_REWARDS.map((r) => r.cost)).toEqual([200, 500, 900, 1300, 1900, 3200])
    const old = [
      { id: 'coffee', name: 'Favorite snack or drink treat', cost: 100, emoji: '🧋' },
      { id: 'accessory', name: 'New workout accessory', cost: 250, emoji: '🎀' }, // she changed this one
      { id: 'grand', name: 'Special grand prize', cost: 1000, emoji: '👑' },
      { id: 'c1', name: 'Her own reward', cost: 100, emoji: '🎁', custom: true },
    ]
    const up = upgradeData({ rewards: old } as Partial<ReturnType<typeof initialState>>)
    expect(up.rewards!.map((r) => r.cost)).toEqual([200, 250, 3200, 100])
    expect(up.priceRev).toBe(2)
    const lowered = up.rewards!.map((r) => (r.id === 'coffee' ? { ...r, cost: 100 } : r))
    expect(upgradeData({ ...up, rewards: lowered }).rewards![0].cost).toBe(100) // not bumped a second time
    applySnapshot({ ...initialState(), priceRev: undefined as unknown as number, rewards: old })
    expect(useStore.getState().rewards.map((r) => r.cost)).toEqual([200, 250, 3200, 100])
    expect(useStore.getState().priceRev).toBe(2)
  })
})

describe('day reset times', () => {
  const shifts: Record<string, 'day' | 'night' | 'off'> = { '2026-01-02': 'night', '2026-01-03': 'night', '2026-01-04': 'off' } // Fri, Sat nights; Sun off
  const shiftOf = (d: string) => shifts[d]
  const at = (day: number, h: number, m = 0) => new Date(2026, 0, day, h, m)

  it('keeps midnight unless a time is chosen, and the night time follows the everyday one until set', async () => {
    const { resetTimes, appDay } = await import('@/lib/dayReset')
    expect(resetTimes({})).toEqual({ day: 0, night: 0 })
    expect(resetTimes({ dayReset: 240 })).toEqual({ day: 240, night: 240 })
    expect(resetTimes({ dayReset: 0, nightReset: 420 })).toEqual({ day: 0, night: 420 })
    expect(resetTimes({ nightReset: 5000 }).night).toBe(720) // never later than noon
    expect(appDay(at(3, 3), resetTimes({}), shiftOf)).toBe('2026-01-03')
  })

  it('keeps a whole night shift on the day it started, then hands over at the chosen time', async () => {
    const { appDay, carryOver, dayEnd, minutesInto } = await import('@/lib/dayReset')
    const r = { day: 0, night: 420 }
    expect(appDay(at(2, 23, 59), r, shiftOf)).toBe('2026-01-02')
    expect(appDay(at(3, 3), r, shiftOf)).toBe('2026-01-02') // 3 AM on the shift still counts as Friday
    expect(appDay(at(3, 6, 59), r, shiftOf)).toBe('2026-01-02')
    expect(appDay(at(3, 7), r, shiftOf)).toBe('2026-01-03')
    expect(appDay(at(4, 6, 59), r, shiftOf)).toBe('2026-01-03') // second night in a row
    expect(appDay(at(4, 7), r, shiftOf)).toBe('2026-01-04')
    expect(appDay(at(5, 0, 1), r, shiftOf)).toBe('2026-01-05') // Sunday was a day off, so it ended at midnight
    expect(carryOver(at(3, 3), r, shiftOf)).toEqual({ date: '2026-01-02', shift: 'night', resetAt: 420 })
    expect(carryOver(at(3, 9), r, shiftOf)).toBeNull()
    expect(dayEnd('2026-01-02', r, shiftOf).getTime()).toBe(at(3, 7).getTime())
    expect(dayEnd('2026-01-04', r, shiftOf).getTime()).toBe(at(5, 0).getTime())
    expect(minutesInto('2026-01-02', at(3, 3))).toBe(27 * 60)
  })

  it('uses the everyday time on days that are not night shifts', async () => {
    const { appDay } = await import('@/lib/dayReset')
    const r = { day: 240, night: 420 }
    expect(appDay(at(5, 3, 59), r, shiftOf)).toBe('2026-01-04')
    expect(appDay(at(5, 4), r, shiftOf)).toBe('2026-01-05')
    expect(appDay(at(3, 5), r, shiftOf)).toBe('2026-01-02') // the night time still applies after a night shift
  })

  it('makes the store’s "today" follow the reset, so water at 3 AM lands on the shift’s day', async () => {
    const { vi } = await import('vitest')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(at(3, 3))
      const base = initialState()
      useStore.setState({ ...base, profile: { ...base.profile, name: 'T', startDate: '2026-01-01', onboarded: true, nightReset: 420 }, days: { '2026-01-02': { date: '2026-01-02', quests: {}, shift: 'night' } } })
      expect(todayKeyForTest()).toBe('2026-01-02')
      useStore.getState().addWater(todayKeyForTest(), 500)
      expect(useStore.getState().days['2026-01-02'].water).toBe(500)
      expect(useStore.getState().days['2026-01-03']).toBeUndefined()
      expect(computeStats(useStore.getState()).today).toBe('2026-01-02')
      vi.setSystemTime(at(3, 7))
      expect(todayKeyForTest()).toBe('2026-01-03')
      // with no time chosen, nothing changes from before
      vi.setSystemTime(at(3, 3))
      useStore.setState({ profile: { ...useStore.getState().profile, nightReset: undefined } })
      expect(todayKeyForTest()).toBe('2026-01-03')
    } finally {
      vi.useRealTimers()
      useStore.setState(initialState())
    }
  })

  it('sends the second water nudge of a night shift after midnight, counted against the shift’s day', async () => {
    const { buildReminderQueue } = await import('@/lib/reminderQueue')
    const base = initialState()
    const state = (nightReset?: number) => ({
      ...base,
      profile: { ...base.profile, startDate: '2026-01-01', onboarded: true, walkReminders: false, nightReset },
      days: { '2026-01-02': { date: '2026-01-02', quests: {}, shift: 'night' as const } },
    })
    const local = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }
    const nudges = (s: ReturnType<typeof state>, now: Date) => buildReminderQueue(s, now, 1).filter((r) => r.title === 'Water check').map((r) => local(r.fire_at))
    expect(nudges(state(), at(2, 12))).toEqual(['1/2 22:00']) // as before: the 2 AM one is past midnight
    expect(nudges(state(420), at(2, 12))).toEqual(['1/2 22:00', '1/3 2:00'])
    expect(nudges(state(420), at(3, 1))).toEqual(['1/3 2:00']) // built from Friday even though the calendar says Saturday
  })
})

describe('balance after a spent bonus is removed', () => {
  it('never shows below zero, and says how much has to be earned back', () => {
    const base = initialState()
    const state = { ...base, profile: { ...base.profile, startDate: '2026-01-01', onboarded: true }, xp: [{ id: 'workout:2026-01-01', amount: 25, reason: 'Walk', date: '2026-01-01', at: 'x' }], purchases: [{ id: 'p1', rewardId: 'r', name: 'Treat', cost: 40, at: 'x' }] }
    const owing = computeStats(state, '2026-01-02')
    expect([owing.spendableXp, owing.balanceXp, owing.owedXp]).toEqual([-15, 0, 15])
    const fine = computeStats({ ...state, purchases: [] }, '2026-01-02')
    expect([fine.spendableXp, fine.balanceXp, fine.owedXp]).toEqual([25, 25, 0])
  })
})

describe('journal quest ticks itself', () => {
  it('ticks once when the entry first has real writing, and can still be changed by hand', async () => {
    const { questsFor } = await import('@/lib/quests')
    const base = initialState()
    // find a day whose quests include the journal one
    let date = ''
    for (let i = 0; i < 200 && !date; i++) { const k = addDays('2026-01-01', i); if (questsFor(k).some((q) => q.id === 'journal')) date = k }
    expect(date).not.toBe('')
    const other = addDays(date, 1 + [...Array(50).keys()].find((i) => !questsFor(addDays(date, 1 + i)).some((q) => q.id === 'journal'))!)
    useStore.setState({ ...base, profile: { ...base.profile, name: 'T', startDate: '2025-12-01', onboarded: true } })
    const st = () => useStore.getState()
    const questXp = (d: string) => st().xp.find((e) => e.id === `quest:${d}:journal`)?.amount ?? 0
    if (date > todayKeyForTest() || other > todayKeyForTest()) return // only meaningful for days that have happened
    st().saveJournal(date, { mood: 'good' })
    expect(st().days[date].quests.journal).toBeUndefined() // a mood tap is not writing
    st().saveJournal(date, { reflection: 'A long enough line about today.' })
    expect(st().days[date].quests.journal).toBeTruthy()
    expect(questXp(date)).toBe(5)
    st().toggleQuest(date, 'journal') // untick by hand
    expect(st().days[date].quests.journal).toBeUndefined()
    st().saveJournal(date, { reflection: 'A long enough line about today, edited.' })
    expect(st().days[date].quests.journal).toBeUndefined() // editing does not tick it again
    st().toggleQuest(date, 'journal') // and it can be ticked by hand
    expect(questXp(date)).toBe(5)
    // on a day without the journal quest, writing ticks nothing
    st().saveJournal(other, { reflection: 'A long enough line about another day.' })
    expect(st().days[other].quests.journal).toBeUndefined()
    useStore.setState(initialState())
  })
})

describe('progress page numbers', () => {
  const start = '2026-01-05' // a Monday
  const log = (date: string, over: object = {}) => [date, { date, quests: {}, ...over }] as const
  const walk = (minutes: number, theme?: string) => ({ workout: { kind: 'standard' as const, minutes, incline: 12, speed: 3, loggedAt: '', theme } })
  it('counts walks by weekday, Monday first, and ignores walks under 5 minutes', async () => {
    const { walksByWeekday } = await import('@/lib/walkStats')
    const days = Object.fromEntries([log('2026-01-05', walk(20)), log('2026-01-06', walk(20)), log('2026-01-12', walk(30)), log('2026-01-11', walk(4))])
    expect(walksByWeekday(days, start, '2026-02-01')).toEqual([2, 1, 0, 0, 0, 0, 0])
    expect(walksByWeekday(days, start, '2026-01-05')).toEqual([1, 0, 0, 0, 0, 0, 0]) // days after today don't count
  })
  it('splits walks into the four length buckets', async () => {
    const { walkLengthMix } = await import('@/lib/walkStats')
    const mins = [5, 10, 11, 20, 21, 30, 31, 60]
    const days = Object.fromEntries(mins.map((m, i) => log(addDays(start, i), walk(m))))
    expect(walkLengthMix(days, start, addDays(start, 30))).toEqual([2, 2, 2, 2])
  })
  it('ranks themes by walks and ignores ones that no longer exist', async () => {
    const { themeCounts } = await import('@/lib/walkStats')
    const days = Object.fromEntries(['a', 'b', 'b', 'c', 'zzz'].map((t, i) => log(addDays(start, i), walk(10, t))))
    expect(themeCounts(days, start, addDays(start, 30), ['a', 'b', 'c'])).toEqual([{ id: 'b', count: 2 }, { id: 'a', count: 1 }, { id: 'c', count: 1 }])
  })
  it('groups other activities by name, ignoring case and spacing, most minutes first', async () => {
    const { activityRanking } = await import('@/lib/walkStats')
    const act = (name: string, minutes: number) => ({ id: name + minutes, name, minutes, loggedAt: '' })
    const days = Object.fromEntries([log(start, { activities: [act('Spin class', 45), act('Stairs', 10)] }), log(addDays(start, 1), { activities: [act(' spin  CLASS ', 30), act('', 20)] })])
    const r = activityRanking(days, start, addDays(start, 5))
    expect(r.rows).toEqual([{ name: 'Spin class', minutes: 75, sessions: 2 }, { name: 'Stairs', minutes: 10, sessions: 1 }])
    expect([r.minutes, r.sessions]).toEqual([85, 3])
  })
  it('counts journal days by the same writing rule that pays XP', async () => {
    const { journalDays } = await import('@/lib/walkStats')
    const days = Object.fromEntries([log(start, { journal: { reflection: 'Wrote something real today.', updatedAt: '' } }), log(addDays(start, 1), { journal: { mood: 'good', updatedAt: '' } }), log(addDays(start, 2), { journal: { reflection: 'Short.', updatedAt: '' } })])
    expect(journalDays(days, start, addDays(start, 5))).toBe(1)
  })
})

describe('backup and restore', () => {
  it('a full export/reset/import keeps everything, including kept bonuses and the envelope baseline', async () => {
    const { exportJson, snapshot } = await import('@/store/useStore')
    const today = todayKeyForTest()
    const startDate = addDays(today, -40)
    useStore.setState({ ...initialState(), profile: { name: 'T', startDate, units: 'lb', onboarded: true }, envelopeSince: addDays(today, -10) + 'T08:00:00.000Z' })
    const s = useStore.getState()
    // Thirty days of walks, strength and journal so chapter 1 completes and perfect days can form.
    for (let i = 0; i < 30; i++) {
      const d = addDays(startDate, i)
      s.logWorkout(d, { minutes: 35, incline: 12, speed: 3, theme: i % 2 ? 'true-crime' : 'comedy' })
      s.toggleQuest(d, 'stretch')
    }
    for (let i = 0; i < 3; i++) s.saveJournal(addDays(startDate, i), { gratitude: 'A proper bit of writing for the day.' } as never)
    s.checkProgress()
    const before = snapshot()
    const keptBefore = before.xp.filter((e) => /^(chapter|comeback|perfect|waterweek|journalweek|theme):/.test(e.id)).map((e) => e.id).sort()
    expect(keptBefore.length).toBeGreaterThan(0)

    const raw = exportJson()
    s.resetAll()
    expect(useStore.getState().xp).toHaveLength(0)
    expect(useStore.getState().importData(raw).ok).toBe(true)
    useStore.getState().checkProgress()

    const after = snapshot()
    for (const k of Object.keys(initialState()) as (keyof typeof after)[]) {
      if (k === 'xp') continue
      expect(after[k], `field ${String(k)}`).toEqual(before[k])
    }
    expect(after.envelopeSince).toBe(before.envelopeSince)
    // Every XP entry is back, nothing doubled, and the kept bonuses are all still there.
    expect(after.xp.map((e) => e.id).sort()).toEqual(before.xp.map((e) => e.id).sort())
    expect(new Set(after.xp.map((e) => e.id)).size).toBe(after.xp.length)
    expect(after.xp.filter((e) => /^(chapter|comeback|perfect|waterweek|journalweek|theme):/.test(e.id)).map((e) => e.id).sort()).toEqual(keptBefore)
    expect(after.xp.reduce((n, e) => n + e.amount, 0)).toBe(before.xp.reduce((n, e) => n + e.amount, 0))
  })
  it('an old backup without envelopeSince gets a baseline on import so past bosses and night walks do not unlock envelopes', async () => {
    const { exportJson } = await import('@/store/useStore')
    const parsed = JSON.parse(exportJson())
    delete parsed.envelopeSince
    parsed.profile = { name: 'T', startDate: addDays(todayKeyForTest(), -20), units: 'lb', onboarded: true }
    useStore.getState().resetAll()
    expect(useStore.getState().importData(JSON.stringify(parsed)).ok).toBe(true)
    expect(useStore.getState().envelopeSince).toBeTruthy()
  })
})
