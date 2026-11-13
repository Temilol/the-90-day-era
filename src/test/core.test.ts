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
    expect(walkXp(11)).toBe(20); expect(walkXp(20)).toBe(20); expect(walkXp(21)).toBe(30)
    expect(walkXp(30)).toBe(30); expect(walkXp(31)).toBe(35)
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
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(30)
    s.logWorkout(start, { minutes: 15, incline: 12, speed: 3 })
    expect(computeStats(useStore.getState(), start).lifetimeXp).toBe(20)
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
    expect(st.lifetimeXp).toBe(120); expect(st.level.level).toBe(1)
    for (let i = 4; i < 6; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
    st = computeStats(useStore.getState(), addDays(start, 5))
    expect(st.lifetimeXp).toBe(180); expect(st.level.level).toBe(2)
    expect(s.buyReward('coffee')).toBe(true)
    expect(s.buyReward('coffee')).toBe(false)
    st = computeStats(useStore.getState(), addDays(start, 5))
    expect(st.spendableXp).toBe(80); expect(st.lifetimeXp).toBe(180); expect(st.level.level).toBe(2)
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
    for (let i = 0; i < 5; i++) s.logWorkout(addDays(start, i), { minutes: 30, incline: 12, speed: 3 })
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
