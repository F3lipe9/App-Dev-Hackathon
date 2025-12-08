import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './home.css'

const SESSIONS_KEY = 'umd_workouts_v1'
const EXERCISES_KEY = 'umd_exercises_v1'
const ACTIVE_KEY = 'umd_active_workout_v1'
const OVERRIDES_KEY = 'umd_exercise_overrides_v1'

type ExerciseCategory = 'Strength' | 'Cardio'

type Exercise = {
  id: string
  name: string
  muscle: string
  equipment: string
  compound: boolean
  category: ExerciseCategory
  createdByUser?: boolean
}

type ExerciseOverride = {
  id: string
  deleted?: boolean
  name?: string
  muscle?: string
  equipment?: string
  compound?: boolean
  category?: ExerciseCategory
}

type WorkoutSet = {
  id: string
  // Strength fields
  weight?: number
  reps?: number
  isWarmup: boolean

  // Cardio fields
  durationMin?: number
  distanceMi?: number
  calories?: number
  rpe?: number // 1–10
}

type WorkoutItem = {
  exerciseId: string
  sets: WorkoutSet[]
}

type WorkoutSession = {
  id: string
  dateISO: string
  name: string
  items: WorkoutItem[]
}

/* ----------------- defaults ----------------- */

const DEFAULT_STRENGTH: Exercise[] = [
  { id: 'bench', name: 'Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', compound: true, category: 'Strength' },
  { id: 'squat', name: 'Back Squat', muscle: 'Legs', equipment: 'Barbell', compound: true, category: 'Strength' },
  { id: 'deadlift', name: 'Deadlift', muscle: 'Legs', equipment: 'Barbell', compound: true, category: 'Strength' },
  { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', compound: true, category: 'Strength' },
  { id: 'row', name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', compound: true, category: 'Strength' },
  { id: 'pullup', name: 'Pull-Ups', muscle: 'Back', equipment: 'Bodyweight', compound: true, category: 'Strength' },
  { id: 'latpull', name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', compound: false, category: 'Strength' },
  { id: 'legpress', name: 'Leg Press', muscle: 'Legs', equipment: 'Machine', compound: true, category: 'Strength' },
  { id: 'curl', name: 'Dumbbell Curl', muscle: 'Arms', equipment: 'Dumbbell', compound: false, category: 'Strength' },
  { id: 'tricep', name: 'Triceps Pushdown', muscle: 'Arms', equipment: 'Cable', compound: false, category: 'Strength' },
  { id: 'lateral', name: 'Lateral Raises', muscle: 'Shoulders', equipment: 'Dumbbell', compound: false, category: 'Strength' },
]

const DEFAULT_CARDIO: Exercise[] = [
  { id: 'tread', name: 'Treadmill Run', muscle: 'Cardio', equipment: 'Treadmill', compound: false, category: 'Cardio' },
  { id: 'bike', name: 'Stationary Bike', muscle: 'Cardio', equipment: 'Bike', compound: false, category: 'Cardio' },
  { id: 'rower', name: 'Rowing Machine', muscle: 'Cardio', equipment: 'Rower', compound: false, category: 'Cardio' },
  { id: 'elliptical', name: 'Elliptical', muscle: 'Cardio', equipment: 'Elliptical', compound: false, category: 'Cardio' },
  { id: 'stairs', name: 'Stair Climber', muscle: 'Cardio', equipment: 'Machine', compound: false, category: 'Cardio' },
  { id: 'jumprope', name: 'Jump Rope', muscle: 'Cardio', equipment: 'Bodyweight', compound: false, category: 'Cardio' },
]

const DEFAULT_EXERCISES: Exercise[] = [...DEFAULT_STRENGTH, ...DEFAULT_CARDIO]

/* ----------------- custom pickers ----------------- */

const MUSCLE_OPTIONS = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Full Body', 'Cardio', 'Other'
] as const

const EQUIPMENT_OPTIONS = [
  'Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Kettlebell', 'Band',
  'Treadmill', 'Bike', 'Rower', 'Elliptical', 'Other'
] as const

/* ----------------- utils ----------------- */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const sortByNewest = (arr: WorkoutSession[]) =>
  [...arr].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function loadSessions(): WorkoutSession[] {
  const parsed = safeParse<any[]>(localStorage.getItem(SESSIONS_KEY), [])
  if (!Array.isArray(parsed)) return []
  return parsed.filter(Boolean)
}

function saveSessions(sessions: WorkoutSession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)) } catch {}
}

function loadOverrides(): ExerciseOverride[] {
  const parsed = safeParse<ExerciseOverride[]>(localStorage.getItem(OVERRIDES_KEY), [])
  if (!Array.isArray(parsed)) return []
  return parsed.filter(o => o && typeof o.id === 'string')
}

function saveOverrides(overrides: ExerciseOverride[]) {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)) } catch {}
}

function loadExercises(): Exercise[] {
  const stored = safeParse<Exercise[]>(localStorage.getItem(EXERCISES_KEY), [])
  const overrides = loadOverrides()

  const merged = [...DEFAULT_EXERCISES, ...stored]

  const map = new Map<string, Exercise>()
  for (const ex of merged) map.set(ex.id, ex)

  for (const o of overrides) {
    if (!o?.id) continue
    if (o.deleted) {
      map.delete(o.id)
      continue
    }

    const existing = map.get(o.id)
    if (existing) {
      map.set(o.id, { ...existing, ...o })
    }
  }

  return Array.from(map.values())
}

function saveExercises(exercises: Exercise[]) {
  const custom = exercises.filter(e => e.createdByUser)
  try { localStorage.setItem(EXERCISES_KEY, JSON.stringify(custom)) } catch {}
}

function loadActive(): WorkoutSession | null {
  const a = safeParse<WorkoutSession | null>(localStorage.getItem(ACTIVE_KEY), null)
  return a && a.id ? a : null
}

function saveActive(active: WorkoutSession | null) {
  try {
    if (!active) {
      localStorage.removeItem(ACTIVE_KEY)
      return
    }
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
  } catch {}
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isCardio(ex: Exercise) {
  return ex.category === 'Cardio'
}

function isBodyweightStrength(ex: Exercise) {
  return ex.category === 'Strength' && ex.equipment === 'Bodyweight'
}

function todayInputStr() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Convert <input type="date"> value to a safe ISO.
 * Using midday local time reduces timezone edge-cases.
 */
function dateInputToISO(dateStr: string) {
  if (!dateStr) return new Date().toISOString()
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

/* ----------------- recommendation logic ----------------- */

function getSuggestion(exercise: Exercise, historySets: WorkoutSet[]) {
  if (isCardio(exercise)) {
    if (!historySets.length) return 'No history yet — start easy and build consistency.'
    return 'Next time: +2–5 minutes or a slight pace/incline increase.'
  }

  const bodyweight = isBodyweightStrength(exercise)

  const work = historySets.filter(s => {
    if (s.isWarmup) return false

    const reps = s.reps ?? 0
    const weight = s.weight ?? 0

    if (bodyweight) return reps > 0
    return weight > 0 && reps > 0
  })

  if (work.length === 0) {
    return 'No history yet — start comfortable and focus on clean form.'
  }

  const last = work[work.length - 1]
  const reps = last.reps ?? 0
  const load = last.weight ?? 0

  if (bodyweight) {
    if (load > 0) {
      if (reps >= 8 && reps <= 12) return 'Nice weighted set — consider +2.5–5 lbs next time.'
      if (reps > 12) return 'You may be ready to add a bit more weight.'
      if (reps >= 5) return 'Try adding 1–2 reps before increasing weight again.'
      return 'Hold this load and tighten technique.'
    }

    if (load < 0) {
      if (reps >= 8 && reps <= 12) return 'Good assisted range — try reducing assistance by 5–10 lbs next time.'
      if (reps > 12) return 'You can likely reduce assistance a bit.'
      if (reps >= 5) return 'Stay here and aim for cleaner reps before reducing assistance.'
      return 'Keep assistance for now and focus on controlled tempo.'
    }

    if (reps >= 12) return 'Great control — consider a harder variation or add light weight if available.'
    if (reps >= 8) return 'Try adding 1–2 reps next time if form stays clean.'
    if (reps >= 5) return 'Stick here and aim for smoother reps and full range of motion.'
    return 'Repeat this and focus on strict form and controlled tempo.'
  }

  const isUpper = ['Chest', 'Shoulders', 'Arms'].includes(exercise.muscle)
  const inc = exercise.equipment === 'Dumbbell' ? 2.5 : (isUpper ? 5 : 10)

  if (inc === 5 && reps >= 8 && reps <= 12) {
    return 'Try +5 lbs next time if form was solid.'
  }

  if (reps >= 8 && reps <= 12) {
    return 'Solid range — consider a small increase next time if form was clean.'
  }

  if (reps > 12) return 'You may be ready for a small weight increase next time.'
  if (reps >= 5) return 'Try adding 1 rep per set before increasing weight.'
  return 'Repeat this weight and aim for tighter technique.'
}

/* ----------------- component ----------------- */

export default function Workouts() {
  const [tab, setTab] = useState<'library' | 'active' | 'history'>('library')

  const [exercises, setExercises] = useState<Exercise[]>(() => loadExercises())
  const [overrides, setOverrides] = useState<ExerciseOverride[]>(() => loadOverrides())

  const [search, setSearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'strength' | 'cardio'>('all')

  const [sessions, setSessions] = useState<WorkoutSession[]>(() => sortByNewest(loadSessions()))
  const [active, setActive] = useState<WorkoutSession | null>(() => loadActive())

  const [workoutName, setWorkoutName] = useState('')
  const [workoutDate, setWorkoutDate] = useState<string>(() => todayInputStr())

  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('Strength')
  const [customMuscle, setCustomMuscle] = useState<string>('Other')
  const [customEquipment, setCustomEquipment] = useState<string>('Other')
  const [customCompound, setCustomCompound] = useState<boolean>(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<ExerciseCategory>('Strength')
  const [editMuscle, setEditMuscle] = useState('Other')
  const [editEquipment, setEditEquipment] = useState('Other')
  const [editCompound, setEditCompound] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { saveSessions(sessions) }, [sessions])
  useEffect(() => { saveActive(active) }, [active])
  useEffect(() => { saveExercises(exercises) }, [exercises])
  useEffect(() => { saveOverrides(overrides) }, [overrides])

  useEffect(() => {
    setExercises(loadExercises())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides.length])

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase()
    let base = exercises

    if (libraryFilter === 'strength') base = base.filter(e => e.category === 'Strength')
    if (libraryFilter === 'cardio') base = base.filter(e => e.category === 'Cardio')

    if (!q) return base
    return base.filter(e => e.name.toLowerCase().includes(q))
  }, [search, exercises, libraryFilter])

  const historySetsByExercise = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>()
    for (const ses of sessions) {
      for (const item of ses.items || []) {
        for (const set of item.sets || []) {
          const arr = map.get(item.exerciseId) || []
          arr.push(set)
          map.set(item.exerciseId, arr)
        }
      }
    }
    return map
  }, [sessions])

  function getExerciseById(id: string): Exercise {
    return exercises.find(e => e.id === id) || {
      id,
      name: 'Unknown',
      muscle: 'Other',
      equipment: 'Other',
      compound: false,
      category: 'Strength'
    }
  }

  function makeStrengthSet(isWarmup = false): WorkoutSet {
    return { id: uid(), weight: 0, reps: 0, isWarmup }
  }

  function makeCardioSet(isWarmup = false): WorkoutSet {
    return { id: uid(), durationMin: 0, distanceMi: 0, calories: 0, rpe: 0, isWarmup }
  }

  function makeDefaultItem(ex: Exercise): WorkoutItem {
    const sets = isCardio(ex)
      ? [makeCardioSet(false)]
      : [makeStrengthSet(false), makeStrengthSet(false), makeStrengthSet(false)]

    return { exerciseId: ex.id, sets }
  }

  function startWorkout(copyLast = false) {
    const base: WorkoutSession = {
      id: uid(),
      dateISO: dateInputToISO(workoutDate),
      name: workoutName.trim(),
      items: []
    }

    if (copyLast && sessions.length > 0) {
      const last = sessions[0]
      base.name = last.name ? `${last.name} (Copy)` : 'Copied Workout'
      base.items = (last.items || []).map(item => {
        const ex = getExerciseById(item.exerciseId)
        const cardio = isCardio(ex)

        return {
          exerciseId: item.exerciseId,
          sets: (item.sets || [])
            .filter(s => !s.isWarmup)
            .map(s => cardio
              ? {
                  id: uid(),
                  durationMin: s.durationMin ?? 0,
                  distanceMi: s.distanceMi ?? 0,
                  calories: s.calories ?? 0,
                  rpe: s.rpe ?? 0,
                  isWarmup: false
                }
              : {
                  id: uid(),
                  weight: s.weight ?? 0,
                  reps: s.reps ?? 0,
                  isWarmup: false
                }
            )
        }
      })
    }

    setActive(base)
    setTab('active')
  }

  function hasLoggedSomething(session: WorkoutSession) {
    for (const item of session.items || []) {
      for (const s of item.sets || []) {
        const strengthFilled = (s.weight ?? 0) !== 0 || (s.reps ?? 0) > 0
        const cardioFilled =
          (s.durationMin ?? 0) > 0 ||
          (s.distanceMi ?? 0) > 0 ||
          (s.calories ?? 0) > 0 ||
          (s.rpe ?? 0) > 0
        if (strengthFilled || cardioFilled) return true
      }
    }
    return false
  }

  function discardWorkout() {
    if (active && hasLoggedSomething(active)) {
      const ok = window.confirm('Discard this workout? Your logged sets will be lost.')
      if (!ok) return
    }
    setActive(null)
    setTab('library')
  }

  function finishWorkout() {
    if (!active) return

    const cleanedItems = active.items
      .map(item => {
        const ex = getExerciseById(item.exerciseId)
        const cardio = isCardio(ex)

        const filteredSets = (item.sets || []).filter(s => {
          if (cardio) {
            return (s.durationMin ?? 0) > 0 || (s.distanceMi ?? 0) > 0 || (s.calories ?? 0) > 0 || (s.rpe ?? 0) > 0
          }
          return (s.reps ?? 0) > 0 || (s.weight ?? 0) !== 0
        })

        return { ...item, sets: filteredSets }
      })
      .filter(item => item.sets.length > 0)

    const finished: WorkoutSession = {
      ...active,
      name: active.name?.trim() || workoutName.trim() || 'Workout',
      items: cleanedItems
    }

    setSessions(prev => sortByNewest([finished, ...prev]))
    setActive(null)
    setTab('history')
  }

  function addExerciseToActive(ex: Exercise) {
    setActive(prev => {
      if (!prev) {
        return {
          id: uid(),
          dateISO: dateInputToISO(workoutDate),
          name: workoutName.trim(),
          items: [makeDefaultItem(ex)]
        }
      }

      const exists = prev.items.some(i => i.exerciseId === ex.id)
      if (exists) return prev

      return {
        ...prev,
        items: [...prev.items, makeDefaultItem(ex)]
      }
    })

    setTab('active')
  }

  function addSet(exerciseId: string, isWarmup = false) {
    setActive(prev => {
      if (!prev) return prev
      const ex = getExerciseById(exerciseId)
      const newSet = isCardio(ex) ? makeCardioSet(isWarmup) : makeStrengthSet(isWarmup)

      return {
        ...prev,
        items: prev.items.map(item => {
          if (item.exerciseId !== exerciseId) return item
          return { ...item, sets: [...item.sets, newSet] }
        })
      }
    })
  }

  function updateSet(exerciseId: string, setId: string, patch: Partial<WorkoutSet>) {
    setActive(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(item => {
          if (item.exerciseId !== exerciseId) return item
          return {
            ...item,
            sets: item.sets.map(s => s.id === setId ? { ...s, ...patch } : s)
          }
        })
      }
    })
  }

  function removeSet(exerciseId: string, setId: string) {
    setActive(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(item => {
          if (item.exerciseId !== exerciseId) return item
          return { ...item, sets: item.sets.filter(s => s.id !== setId) }
        })
      }
    })
  }

  function createCustomExercise() {
    const name = customName.trim()
    if (!name) return

    const ex: Exercise = {
      id: uid(),
      name,
      muscle: customMuscle || (customCategory === 'Cardio' ? 'Cardio' : 'Other'),
      equipment: customEquipment || 'Other',
      compound: customCategory === 'Strength' ? customCompound : false,
      category: customCategory,
      createdByUser: true
    }

    setExercises(prev => [ex, ...prev])

    setCustomName('')
    setCustomMuscle('Other')
    setCustomEquipment('Other')
    setCustomCompound(false)
  }

  /* ----------------- edit/delete exercises ----------------- */

  function beginEdit(ex: Exercise) {
    setEditingId(ex.id)
    setEditName(ex.name)
    setEditCategory(ex.category)
    setEditMuscle(ex.muscle)
    setEditEquipment(ex.equipment)
    setEditCompound(!!ex.compound)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  function upsertOverride(id: string, patch: Omit<ExerciseOverride, 'id'>) {
    setOverrides(prev => {
      const filtered = prev.filter(o => o.id !== id)
      return [...filtered, { id, ...patch }]
    })
  }

  function saveEdit() {
    if (!editingId) return
    const target = exercises.find(e => e.id === editingId)
    if (!target) return

    const patch = {
      name: editName.trim() || target.name,
      category: editCategory,
      muscle: editMuscle,
      equipment: editEquipment,
      compound: editCategory === 'Strength' ? editCompound : false
    }

    setExercises(prev =>
      prev.map(e => e.id === editingId ? { ...e, ...patch } : e)
    )

    if (!target.createdByUser) {
      upsertOverride(editingId, { ...patch, deleted: false })
    }

    cancelEdit()
  }

  function deleteExercise(id: string) {
    const target = exercises.find(e => e.id === id)
    if (!target) return

    const ok = window.confirm(`Delete "${target.name}" from your library?`)
    if (!ok) return

    setActive(prev => prev ? { ...prev, items: prev.items.filter(i => i.exerciseId !== id) } : prev)

    if (target.createdByUser) {
      setExercises(prev => prev.filter(e => e.id !== id))
    } else {
      setOverrides(prev => {
        const filtered = prev.filter(o => o.id !== id)
        return [...filtered, { id, deleted: true }]
      })
      setExercises(prev => prev.filter(e => e.id !== id))
    }

    if (editingId === id) cancelEdit()
  }

  /* ----------------- UI ----------------- */

  return (
    <div className="home-container home-root">
      <div className="home-card" style={{ maxWidth: 1100 }}>
        <h1 className="home-heading">Workouts</h1>

        {/* Top navigation bar */}
        <TopNav />

        {/* Tabs */}
        <div style={tabsRowStyle}>
          <button
            className="home-button"
            style={tab === 'library' ? activeTabStyle : tabStyle}
            onClick={() => setTab('library')}
            type="button"
          >
            Exercise Library
          </button>
          <button
            className="home-button"
            style={tab === 'active' ? activeTabStyle : tabStyle}
            onClick={() => setTab('active')}
            type="button"
          >
            Active Workout
          </button>
          <button
            className="home-button"
            style={tab === 'history' ? activeTabStyle : tabStyle}
            onClick={() => setTab('history')}
            type="button"
          >
            History
          </button>
        </div>

        {/* LIBRARY */}
        {tab === 'library' && (
          <div style={{ marginTop: '1.5rem' }}>
            <section style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>Start a session</h3>
                <div style={rowWrapStyle}>
                  <input
                    value={workoutName}
                    onChange={(e) => setWorkoutName(e.target.value)}
                    placeholder="Workout name"
                    style={inputStyle}
                  />

                  <input
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    style={dateInputStyle}
                  />

                  <button style={primaryStyle} onClick={() => startWorkout(false)} type="button">
                    Start Workout
                  </button>
                  <button style={secondaryStyle} onClick={() => startWorkout(true)} type="button">
                    Copy Last
                  </button>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={sectionTitleStyle}>Exercise library</h3>

                  {/* Category filter */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      style={libraryFilter === 'all' ? filterActiveStyle : filterStyle}
                      onClick={() => setLibraryFilter('all')}
                      type="button"
                    >
                      All
                    </button>
                    <button
                      style={libraryFilter === 'strength' ? filterActiveStyle : filterStyle}
                      onClick={() => setLibraryFilter('strength')}
                      type="button"
                    >
                      Strength
                    </button>
                    <button
                      style={libraryFilter === 'cardio' ? filterActiveStyle : filterStyle}
                      onClick={() => setLibraryFilter('cardio')}
                      type="button"
                    >
                      Cardio
                    </button>
                  </div>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises..."
                  style={inputStyle}
                />
              </div>

              <div style={gridStyle}>
                {filteredExercises.map(ex => {
                  const historySets = historySetsByExercise.get(ex.id) || []
                  const hint = getSuggestion(ex, historySets)

                  return (
                    <div key={ex.id} style={exerciseCardStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{ex.name}</div>
                        <div style={mutedStyle}>
                          {ex.category} • {ex.muscle} • {ex.equipment}{ex.compound ? ' • Compound' : ''}
                          {ex.createdByUser ? ' • Custom' : ''}
                        </div>
                        <div style={{ ...mutedStyle, marginTop: 6 }}>{hint}</div>

                        {/* Inline editor */}
                        {editingId === ex.id && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={inputStyle}
                              placeholder="Exercise name"
                            />

                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as ExerciseCategory)}
                              style={selectStyle}
                            >
                              <option value="Strength">Strength</option>
                              <option value="Cardio">Cardio</option>
                            </select>

                            <select
                              value={editMuscle}
                              onChange={(e) => setEditMuscle(e.target.value)}
                              style={selectStyle}
                            >
                              {MUSCLE_OPTIONS.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>

                            <select
                              value={editEquipment}
                              onChange={(e) => setEditEquipment(e.target.value)}
                              style={selectStyle}
                            >
                              {EQUIPMENT_OPTIONS.map(eq => (
                                <option key={eq} value={eq}>{eq}</option>
                              ))}
                            </select>

                            {editCategory === 'Strength' && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                                <input
                                  type="checkbox"
                                  checked={editCompound}
                                  onChange={(e) => setEditCompound(e.target.checked)}
                                />
                                Compound
                              </label>
                            )}

                            <button style={primaryStyle} onClick={saveEdit} type="button">
                              Save
                            </button>
                            <button style={secondaryStyle} onClick={cancelEdit} type="button">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                          style={smallPrimaryStyle}
                          onClick={() => addExerciseToActive(ex)}
                          title="Add to active workout"
                          type="button"
                        >
                          + Add
                        </button>

                        <button
                          style={secondaryOutlineStyle}
                          onClick={() => beginEdit(ex)}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          style={dangerOutlineStyle}
                          onClick={() => deleteExercise(ex.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Enhanced Custom exercise row */}
              <div style={rowWrapAlignStyle}>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Create custom exercise..."
                  style={inputStyle}
                />

                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as ExerciseCategory)}
                  style={selectStyle}
                >
                  <option value="Strength">Strength</option>
                  <option value="Cardio">Cardio</option>
                </select>

                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value)}
                  style={selectStyle}
                  title="Primary body part"
                >
                  {MUSCLE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  style={selectStyle}
                  title="Equipment"
                >
                  {EQUIPMENT_OPTIONS.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>

                {customCategory === 'Strength' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={customCompound}
                      onChange={(e) => setCustomCompound(e.target.checked)}
                    />
                    Compound
                  </label>
                )}

                <button style={secondaryStyle} onClick={createCustomExercise} type="button">
                  Add Custom
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ACTIVE */}
        {tab === 'active' && (
          <div style={{ marginTop: '1.5rem' }}>
            {!active ? (
              <section style={sectionStyle}>
                <div style={mutedStyle}>
                  No active workout. Start one from the Library tab.
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button style={primaryStyle} onClick={() => startWorkout(false)} type="button">Start Workout</button>
                  <button style={secondaryStyle} onClick={() => startWorkout(true)} type="button">Copy Last</button>
                </div>
              </section>
            ) : (
              <>
                <section style={sectionStyle}>
                  <div style={sectionHeaderStyle}>
                    <h3 style={sectionTitleStyle}>Active session</h3>
                    <div style={rowWrapStyle}>
                      <input
                        value={active.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setWorkoutName(val)
                          setActive(prev => prev ? { ...prev, name: val } : prev)
                        }}
                        placeholder="Workout name"
                        style={inputStyle}
                      />

                      {/* Editable active date */}
                      <input
                        type="date"
                        value={(active.dateISO || '').slice(0, 10) || workoutDate}
                        onChange={(e) => {
                          const val = e.target.value
                          setWorkoutDate(val)
                          setActive(prev => prev ? { ...prev, dateISO: dateInputToISO(val) } : prev)
                        }}
                        style={dateInputStyle}
                        title="Workout date"
                      />

                      <button style={secondaryStyle} onClick={discardWorkout} type="button">Discard</button>
                      <button style={primaryStyle} onClick={finishWorkout} type="button">Finish</button>
                    </div>
                  </div>
                </section>

                {active.items.length === 0 && (
                  <section style={sectionStyle}>
                    <div style={mutedStyle}>Add exercises from the Library to begin logging sets.</div>
                  </section>
                )}

                {active.items.map(item => {
                  const ex = getExerciseById(item.exerciseId)
                  const historySets = historySetsByExercise.get(ex.id) || []
                  const hint = getSuggestion(ex, historySets)
                  const cardio = isCardio(ex)
                  const bodyweightStrength = isBodyweightStrength(ex)

                  return (
                    <section key={item.exerciseId} style={sectionStyle}>
                      <div style={sectionHeaderStyle}>
                        <div>
                          <h3 style={sectionTitleStyle}>{ex.name}</h3>
                          <div style={mutedStyle}>
                            {ex.category} • {ex.muscle} • {ex.equipment}{ex.compound ? ' • Compound' : ''}
                          </div>

                          <div style={{ ...mutedStyle, marginTop: 6 }}>
                            <strong>Recommendation:</strong> {hint}
                          </div>

                          {bodyweightStrength && (
                            <div style={{ ...mutedStyle, marginTop: 4 }}>
                              Tip: Use positive weight for added load and negative for assistance.
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            style={secondaryStyle}
                            onClick={() => addSet(item.exerciseId, true)}
                            type="button"
                          >
                            {cardio ? '+ Easy' : '+ Warmup'}
                          </button>

                          <button
                            style={secondaryStyle}
                            onClick={() => addSet(item.exerciseId, false)}
                            type="button"
                          >
                            {cardio ? '+ Interval' : '+ Work set'}
                          </button>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        {cardio ? (
                          <table style={tableStyle}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Duration (min)</th>
                                <th style={thStyle}>Distance (mi)</th>
                                <th style={thStyle}>Calories</th>
                                <th style={thStyle}>RPE (1-10)</th>
                                <th style={thStyle}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.sets.map((s, idx) => (
                                <tr key={s.id}>
                                  <td style={tdStyle}>{s.isWarmup ? 'Easy' : `Interval ${idx + 1}`}</td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={s.durationMin ?? 0}
                                      onChange={(e) => updateSet(item.exerciseId, s.id, { durationMin: Number(e.target.value) })}
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={s.distanceMi ?? 0}
                                      onChange={(e) => updateSet(item.exerciseId, s.id, { distanceMi: Number(e.target.value) })}
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={10}
                                      value={s.calories ?? 0}
                                      onChange={(e) => updateSet(item.exerciseId, s.id, { calories: Number(e.target.value) })}
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={0}
                                      max={10}
                                      step={1}
                                      value={s.rpe ?? 0}
                                      onChange={(e) => updateSet(item.exerciseId, s.id, { rpe: Number(e.target.value) })}
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <button
                                      style={dangerStyle}
                                      onClick={() => removeSet(item.exerciseId, s.id)}
                                      type="button"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <table style={tableStyle}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>
                                  {bodyweightStrength ? 'Added / Assisted (lbs)' : 'Weight (lbs)'}
                                </th>
                                <th style={thStyle}>Reps</th>
                                <th style={thStyle}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.sets.map((s, idx) => (
                                <tr key={s.id}>
                                  <td style={tdStyle}>{s.isWarmup ? 'Warmup' : `Set ${idx + 1}`}</td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={bodyweightStrength ? -200 : 0}
                                      step={2.5}
                                      value={s.weight ?? 0}
                                      onChange={(e) =>
                                        updateSet(item.exerciseId, s.id, { weight: Number(e.target.value) })
                                      }
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={s.reps ?? 0}
                                      onChange={(e) =>
                                        updateSet(item.exerciseId, s.id, { reps: Number(e.target.value) })
                                      }
                                      style={miniInputStyle}
                                    />
                                  </td>
                                  <td style={tdStyle}>
                                    <button
                                      style={dangerStyle}
                                      onClick={() => removeSet(item.exerciseId, s.id)}
                                      type="button"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </section>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div style={{ marginTop: '1.5rem' }}>
            <section style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>Past sessions</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button style={secondaryStyle} onClick={() => startWorkout(true)} type="button">Copy Last</button>
                  <button style={primaryStyle} onClick={() => startWorkout(false)} type="button">Start New</button>
                </div>
              </div>

              {sessions.length === 0 && (
                <div style={mutedStyle}>No workouts saved yet.</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sessions.map(ses => {
                  const isOpen = expandedId === ses.id
                  const totalSets = (ses.items || []).reduce((acc, i) => acc + (i.sets?.length || 0), 0)

                  return (
                    <div key={ses.id} style={historyCardStyle}>
                      <div style={historyLeftStyle}>
                        <div style={historyTitleStyle}>{ses.name || 'Workout'}</div>
                        <div style={mutedStyle}>{formatDate(ses.dateISO)}</div>

                        <div style={{ ...mutedStyle, marginTop: 4 }}>
                          {(ses.items || []).length} exercises • {totalSets} sets
                        </div>

                        {isOpen && (
                          <div style={{ marginTop: 8 }}>
                            {(ses.items || []).map(it => {
                              const ex = getExerciseById(it.exerciseId)
                              return (
                                <div key={it.exerciseId} style={historyLineStyle}>
                                  {ex.name}
                                  <span style={historyMetaStyle}>({ex.category})</span>
                                  <span style={historyDashStyle}>—</span>
                                  {it.sets.length} sets
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div style={historyActionsStyle}>
                        <button
                          style={secondaryOutlineStyle}
                          onClick={() => setExpandedId(prev => prev === ses.id ? null : ses.id)}
                          type="button"
                        >
                          {isOpen ? 'Hide' : 'View'}
                        </button>
                        <button
                          style={dangerOutlineStyle}
                          onClick={() => setSessions(prev => prev.filter(p => p.id !== ses.id))}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------- top nav component ----------------- */

function TopNav() {
  const location = useLocation()

  const links = [
    { to: '/home', label: 'Home' },
    { to: '/assignments', label: 'Assignments' },
    { to: '/exams', label: 'Exams' },
    { to: '/water', label: 'Water Intake' },
  ]

  return (
    <div style={topNavContainerStyle}>
      <div style={topNavInnerStyle}>
        {links.map(link => {
          const isActive = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              style={isActive ? topNavLinkActiveStyle : topNavLinkStyle}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- styles ---------- */

const tabsRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginTop: '1rem',
  flexWrap: 'wrap'
}

const rowWrapStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap'
}

const rowWrapAlignStyle: CSSProperties = {
  marginTop: '1rem',
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap'
}

const tabStyle: CSSProperties = {
  border: '1px solid #E0E0E0',
  padding: '0.5rem 0.75rem',
  borderRadius: 10,
  background: '#F8F9FA',
  cursor: 'pointer'
}

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  background: '#E21833',
  color: 'white',
  borderColor: '#E21833'
}

const sectionStyle: CSSProperties = {
  border: '1px solid #E0E0E0',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '1rem',
  background: 'white'
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'center',
  flexWrap: 'wrap'
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.1rem'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '0.75rem',
  marginTop: '0.75rem'
}

const exerciseCardStyle: CSSProperties = {
  border: '1px solid #E0E0E0',
  borderRadius: 12,
  padding: '0.9rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  background: '#F8F9FA'
}

/* ✅ UPDATED history card base */
const historyCardStyle: CSSProperties = {
  border: '1px solid #E0E0E0',
  borderRadius: 12,
  padding: '0.9rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  background: '#F8F9FA',
  textAlign: 'left'
}

const mutedStyle: CSSProperties = {
  fontSize: '0.85rem',
  color: '#555'
}

const inputStyle: CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderRadius: 10,
  border: '1px solid #E0E0E0',
  minWidth: 220
}

const dateInputStyle: CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderRadius: 10,
  border: '1px solid #E0E0E0',
  background: 'white',
  minWidth: 160
}

const miniInputStyle: CSSProperties = {
  padding: '0.35rem 0.45rem',
  borderRadius: 8,
  border: '1px solid #E0E0E0',
  width: 90
}

const selectStyle: CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderRadius: 10,
  border: '1px solid #E0E0E0',
  background: 'white'
}

const primaryStyle: CSSProperties = {
  background: '#E21833',
  color: 'white',
  border: '1px solid #E21833',
  padding: '0.5rem 0.8rem',
  borderRadius: 10,
  cursor: 'pointer'
}

const smallPrimaryStyle: CSSProperties = {
  ...primaryStyle,
  padding: '0.35rem 0.6rem',
  fontSize: '0.85rem'
}

const secondaryStyle: CSSProperties = {
  background: '#FFD200',
  color: 'black',
  border: '1px solid #FFD200',
  padding: '0.5rem 0.8rem',
  borderRadius: 10,
  cursor: 'pointer'
}

const secondaryOutlineStyle: CSSProperties = {
  background: '#fff',
  color: '#111',
  border: '1px solid #DDD',
  padding: '0.45rem 0.7rem',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.85rem'
}

const dangerStyle: CSSProperties = {
  background: '#fff',
  color: '#b00020',
  border: '1px solid #b00020',
  padding: '0.3rem 0.5rem',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.8rem'
}

const dangerOutlineStyle: CSSProperties = {
  ...dangerStyle,
  padding: '0.45rem 0.7rem'
}

const filterStyle: CSSProperties = {
  border: '1px solid #E0E0E0',
  padding: '0.25rem 0.5rem',
  borderRadius: 999,
  background: '#F8F9FA',
  cursor: 'pointer',
  fontSize: '0.8rem'
}

const filterActiveStyle: CSSProperties = {
  ...filterStyle,
  background: '#111',
  color: 'white',
  borderColor: '#111'
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '0.75rem'
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  fontSize: '0.85rem',
  borderBottom: '1px solid #E0E0E0',
  padding: '0.5rem 0.4rem'
}

const tdStyle: CSSProperties = {
  padding: '0.5rem 0.4rem',
  borderBottom: '1px solid #EEE',
  fontSize: '0.9rem'
}

/* ---------- history detail layout styles (NEW) ---------- */

const historyLeftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  textAlign: 'left',
  minWidth: 0
}

const historyTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: '1.05rem'
}

const historyLineStyle: CSSProperties = {
  ...mutedStyle,
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap'
}

const historyMetaStyle: CSSProperties = {
  opacity: 0.85
}

const historyDashStyle: CSSProperties = {
  opacity: 0.6
}

const historyActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  flexShrink: 0
}

/* ---------- top nav styles ---------- */

const topNavContainerStyle: CSSProperties = {
  marginTop: '0.75rem',
  marginBottom: '1rem',
  padding: '0.6rem',
  borderRadius: 12,
  border: '1px solid #E0E0E0',
  background: '#FFFFFF',
}

const topNavInnerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
}

const topNavLinkStyle: CSSProperties = {
  textDecoration: 'none',
  padding: '0.35rem 0.7rem',
  borderRadius: 999,
  border: '1px solid #E0E0E0',
  background: '#F8F9FA',
  color: '#111',
  fontSize: '0.85rem',
  fontWeight: 500,
}

const topNavLinkActiveStyle: CSSProperties = {
  ...topNavLinkStyle,
  background: '#E21833',
  borderColor: '#E21833',
  color: 'white',
}
