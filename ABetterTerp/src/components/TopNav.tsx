import { Link, useLocation } from 'react-router-dom'
import '../pages/Workouts.css'

export default function TopNav() {
  const location = useLocation()

  const links = [
    { to: '/home', label: 'Home' },
    { to: '/assignments', label: 'Assignments' },
    { to: '/exams', label: 'Exams' },
    { to: '/water', label: 'Water Intake' },
  ]

  return (
    <div className="top-nav-container">
      <div className="top-nav-inner">
        {links.map(link => {
          const isActive = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`top-nav-link${isActive ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
