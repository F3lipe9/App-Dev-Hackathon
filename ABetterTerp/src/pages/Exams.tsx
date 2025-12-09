import { useEffect, useState, type FormEvent, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Exams.css'

type Exam = {
  id: string
  username: string
  course: string
  date: string
  plannedHours: number
  score?: number
  done?: boolean
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [course, setCourse] = useState('')
  const [date, setDate] = useState('')
  const [plannedHours, setPlannedHours] = useState('')

  // from login; set these in your login component after /login succeeds
  const username = localStorage.getItem('username') ?? ''

  // Load exams for this user on mount / when username changes
  useEffect(() => {
    if (!username) return

    async function loadExams() {
      try {
        const res = await fetch(
          `http://localhost:8000/exams?username=${encodeURIComponent(username)}`
        )
        if (!res.ok) {
          console.error('Failed to fetch exams')
          return
        }

        const data = await res.json()
        const mapped: Exam[] = data.map((ex: any) => ({
          id: ex._id,            // use Mongo _id as client id
          username: ex.username,
          course: ex.course,
          date: ex.date,
          plannedHours: ex.planned_hours,
          score: ex.score,
          done: ex.done,
        }))

        setExams(mapped)
      } catch (err) {
        console.error('Error loading exams', err)
      }
    }

    loadExams()
  }, [username])

  async function handleAddExam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!username) {
      console.error('No logged-in user')
      return
    }

    const body = {
      username,
      course,
      date,
      planned_hours: Number(plannedHours) || 0,
    }

    const res = await fetch('http://localhost:8000/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Failed to save exam')
      return
    }

    const data = await res.json() // { id: "mongoId" }

    const newExam: Exam = {
      id: data.id,
      username,
      course,
      date,
      plannedHours: body.planned_hours,
      done: false,
    }

    setExams(prev => [...prev, newExam])
    setCourse('')
    setDate('')
    setPlannedHours('')
  }

  async function handleScoreChange(id: string, value: string) {
    const score = value === '' ? undefined : Number(value)

    // optimistic UI update
    setExams(prev =>
      prev.map(exam =>
        exam.id === id ? { ...exam, score } : exam
      )
    )

    // optional: persist to backend if PUT endpoint is enabled
    try {
      await fetch(`http://localhost:8000/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      })
    } catch (err) {
      console.error('Failed to update score', err)
    }
  }

  async function toggleDone(id: string) {
    let newDone = false

    setExams(prev =>
      prev.map(exam => {
        if (exam.id === id) {
          const updated = { ...exam, done: !exam.done }
          newDone = updated.done ?? false
          return updated
        }
        return exam
      })
    )

    // optional: persist to backend if PUT endpoint is enabled
    try {
      await fetch(`http://localhost:8000/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newDone }),
      })
    } catch (err) {
      console.error('Failed to update done flag', err)
    }
  }

  const scoredExams = exams.filter(e => typeof e.score === 'number')

  const averageScore =
    scoredExams.length === 0
      ? 0
      : scoredExams.reduce((sum, exam) => sum + (exam.score ?? 0), 0) /
        scoredExams.length

  function letterGradeFromScore(score: number) {
    if (score >= 93) return 'A+ Great Job!'
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  const letterGrade =
    scoredExams.length === 0 ? '-' : letterGradeFromScore(averageScore)

  return (
    <div className="home-container home-root" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <TopNav />
      <div className="home-card">
        <h1 className="home-heading">Exams</h1>

        <section style={{ marginTop: '1rem' }}>
          <h2>Track Your Exams</h2>
          <form
            onSubmit={handleAddExam}
            style={{
              display: 'grid',
              gap: '0.75rem',
              maxWidth: 450,
              margin: '0.75rem auto',
              textAlign: 'center',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
              Course
              <input
                type="text"
                value={course}
                onChange={e => setCourse(e.target.value)}
                required
                style={{ padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid #E0E0E0' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
              Date
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                style={{ padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid #E0E0E0' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
              Planned study hours
              <input
                type="number"
                min="0"
                value={plannedHours}
                onChange={e => setPlannedHours(e.target.value)}
                style={{ padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid #E0E0E0' }}
              />
            </label>

            <button type="submit">
              Add exam
            </button>
          </form>
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h2>Upcoming & Past Exams</h2>
          {exams.length === 0 ? (
            <p style={{ marginTop: '0.5rem' }}>No exams yet. Add one above.</p>
          ) : (
            <div
              style={{
                marginTop: '0.75rem',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {exams.map(exam => (
                <div
                  key={exam.id}
                  style={{
                    border: '1px solid #E0E0E0',
                    borderRadius: 12,
                    padding: '0.75rem 1rem',
                    background: exam.done ? '#E8E8E8' : '#F8F9FA',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <h3
                      style={{
                        textDecoration: exam.done ? 'line-through' : 'none',
                        margin: 0,
                      }}
                    >
                      {exam.course}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleDone(exam.id)}
                      style={{
                        backgroundColor: exam.done ? '#28A745' : '#E21833',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 999,
                        padding: '0.25rem 0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {exam.done ? 'Done!' : 'Mark done'}
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Date: {exam.date || 'TBD'}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    Planned study hours: {exam.plannedHours}
                  </p>

                  <label
                    style={{
                      marginTop: '0.25rem',
                      fontSize: '0.9rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    Score (%):
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={exam.score ?? ''}
                      onChange={e => handleScoreChange(exam.id, e.target.value)}
                      style={{
                        width: '80px',
                        padding: '0.25rem 0.4rem',
                        borderRadius: 6,
                        border: '1px solid #E0E0E0',
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h2>Overall Performance</h2>
          {scoredExams.length === 0 ? (
            <p style={{ marginTop: '0.5rem' }}>No scores entered yet.</p>
          ) : (
            <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
              Average score: <strong>{averageScore.toFixed(1)}%</strong> — Letter grade{' '}
              <strong>{letterGrade}</strong>
            </p>
          )}
        </section>

      </div>
    </div>
  )
}

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