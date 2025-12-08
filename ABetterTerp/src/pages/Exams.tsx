import { Link } from 'react-router'
import './home.css'

export default function Exams() {
  return (
    <div className="home-container home-root">
      <div className="home-card">
        <h1 className="home-heading">Exams</h1>
        <p style={{ marginTop: '1rem' }}>Track upcoming exams, study plans, and scores. (Placeholder page)</p>
        <p style={{ marginTop: '1rem' }}><Link to="/home">Back</Link></p>
      </div>
    </div>
  )
}
