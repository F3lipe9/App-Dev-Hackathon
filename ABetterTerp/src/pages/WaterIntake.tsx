import { Link } from 'react-router'
import './home.css'

export default function WaterIntake() {
  return (
    <div className="home-container home-root">
      <div className="home-card">
        <h1 className="home-heading">Water Intake</h1>
        <p style={{ marginTop: '1rem' }}>Log and track your water intake here. (Placeholder page)</p>
        <p style={{ marginTop: '1rem' }}><Link to="/home">Back</Link></p>
      </div>
    </div>
  )
}
