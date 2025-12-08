import { Link } from 'react-router'
import './home.css'

export default function Assignments() {
  return (
    <div className="home-container home-root">
      <div className="home-card">
        <h1 className="home-heading">Assignments</h1>
        <p style={{ marginTop: '1rem' }}>Manage assignments, due dates, and progress here. (Placeholder page)</p>
        <p style={{ marginTop: '1rem' }}><Link to="/home">Back</Link></p>
      </div>
    </div>
  )
}
