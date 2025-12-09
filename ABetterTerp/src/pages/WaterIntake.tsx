import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import './WaterIntake.css';

const TopNav = () => {
  const location = useLocation();
  const links = [
    { to: '/home', label: 'Home' },
    { to: '/assignments', label: 'Assignments' },
    { to: '/exams', label: 'Exams' },
    { to: '/water', label: 'Water Intake' },
  ];
  return (
    <div style={topNavContainerStyle}>
      <div style={topNavInnerStyle}>
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <a
              key={link.to}
              href={link.to}
              style={isActive ? topNavLinkActiveStyle : topNavLinkStyle}
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </div>
  );
};

const topNavContainerStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  marginBottom: '1rem',
  padding: '0.6rem',
  borderRadius: 12,
  border: '1px solid #E0E0E0',
  background: '#FFFFFF',
};

const topNavInnerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const topNavLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  padding: '0.35rem 0.7rem',
  borderRadius: 999,
  border: '1px solid #E0E0E0',
  background: '#F8F9FA',
  color: '#111',
  fontSize: '0.85rem',
  fontWeight: 500,
  display: 'inline-block',
  cursor: 'pointer',
};

const topNavLinkActiveStyle: React.CSSProperties = {
  ...topNavLinkStyle,
  background: '#E21833',
  borderColor: '#E21833',
  color: 'white',
};

interface HistoryEntry {
  date: string;
  percent: number;
}

export default function WaterIntake() {
  const [username, setUsername] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [bottleName, setBottleName] = useState('');
  const [bottleOz, setBottleOz] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [currentOz, setCurrentOz] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasReachedGoal, setHasReachedGoal] = useState(false);
  console.log('WaterIntake rendering', { isSetup, bottleName });

  useEffect(() => {
    const u = localStorage.getItem('username');
    setUsername(u);
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const res = await fetch(`http://localhost:8000/water?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          setBottleName(data.bottleName || '');
          setBottleOz(data.bottleOz ? String(data.bottleOz) : '');
          setDailyGoal(data.dailyGoal ? String(data.dailyGoal) : '');
          setCurrentOz(data.currentOz || 0);
          setIsSetup(!!data.dailyGoal && !!data.bottleName);
        }
      } catch (err) {
        console.error('Failed to load water intake', err);
      }
    })();
  }, [username]);

  const saveWater = async (payload: { bottleName: string; bottleOz: number; dailyGoal: number; currentOz: number }) => {
    if (!username) return;
    await fetch('http://localhost:8000/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ...payload })
    });
  };

  // Then update handleSetup to be async:
  const handleSetup = async () => {  // <-- Add 'async' here
    if (!username) {
      alert('Please log in first.');
      return;
    }
    if (bottleName && bottleOz && dailyGoal) {
      const size = parseInt(bottleOz, 10);
      const goal = parseInt(dailyGoal, 10);
      if (Number.isNaN(size) || Number.isNaN(goal) || size <= 0 || goal <= 0) return;
      setIsSetup(true);
      await saveWater({ bottleName, bottleOz: size, dailyGoal: goal, currentOz });
    }
  };

  const addOz = async () => {
    if (!isSetup || !username) return;
    const newOz = currentOz + 1;
    setCurrentOz(newOz);

    const size = parseInt(bottleOz, 10) || 0;
    const goal = parseInt(dailyGoal, 10) || 0;

    if (newOz >= goal && !hasReachedGoal) {
    setShowConfetti(true);
    setHasReachedGoal(true);
    setTimeout(() => setShowConfetti(false), 3000);
    }
    
    await saveWater({ bottleName, bottleOz: size, dailyGoal: goal, currentOz: newOz });
  };

  const removeOz = async () => {
    if (!isSetup || !username) return;
    if (currentOz > 0) {
      const newOz = currentOz - 1;
      setCurrentOz(newOz);
      const size = parseInt(bottleOz, 10) || 0;
      const goal = parseInt(dailyGoal, 10) || 0;

      if (newOz < goal) {
      setHasReachedGoal(false);
     }
      await saveWater({ bottleName, bottleOz: size, dailyGoal: goal, currentOz: newOz });
    }
  };

  const resetSetup = () => {
    setIsSetup(false);
  };

  const getMarkings = (): number[] => {
    const goal = parseInt(dailyGoal);
    const marks: number[] = [];
    const interval = goal > 100 ? 20 : goal > 50 ? 10 : 5;
    
    for (let i = interval; i <= goal; i += interval) {
      marks.push(i);
    }
    if(marks[marks.length - 1] !== goal){
      marks.push(goal);
    }
    return marks;
  };

  const goalNumber = Math.max(parseInt(dailyGoal, 10) || 1, 1);
  const fillPercentage = Math.min((currentOz / goalNumber) * 100, 100);
  const totalPercentage = Math.round((currentOz / goalNumber) * 100);

  // place holder backend to get history HERE

  if (!isSetup) {
    return (
      <div className="water-intake-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <TopNav />
        <div style={{ flex: 1 }}>
          <h1 className="setup-title">
            <span className="title-icon">💧</span>
            Water Intake Setup
          </h1>
          
          <div className="input-group">
            <label className="input-label">Water Bottle Name</label>
            <input
              type="text"
              value={bottleName}
              onChange={(e) => setBottleName(e.target.value)}
              placeholder="e.g., My Hydro Flask"
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Bottle Size (oz)</label>
            <input
              type="number"
              value={bottleOz}
              onChange={(e) => setBottleOz(e.target.value)}
              placeholder="e.g., 32"
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Daily Goal (oz)</label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              placeholder="e.g., 64"
              className="input-field"
            />
          </div>

          <button onClick={handleSetup} className="setup-button">
            Start Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="water-intake-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <TopNav />
      <div style={{ flex: 1 }}>
        {showConfetti && <Confetti />}
        <div className="tracker-container">
        <div className="tracker-card">
          <div className="tracker-header">
            <h1 className="tracker-title">{bottleName}</h1>
            <button onClick={resetSetup} className="settings-button">
              ⚙️
            </button>
          </div>

          <div className="stats-display">
            <div className="current-oz">{currentOz} oz</div>
            <div className="goal-text">
              {totalPercentage}% of {dailyGoal} oz goal
            </div>
          </div>

          <div className="bottle-container">
            <div className="markings">
              <div className="marking">0</div>
              {getMarkings().map(mark => (
                <div 
                  key={mark} 
                  className={mark === parseInt(dailyGoal) ? 'marking goal-marking' : 'marking'}
                >
                  {mark}
                </div>
              ))}
            </div>

            <div className="bottle">
              <div className="goal-line" />
              <div className="bottle-fill" style={{ height: `${fillPercentage}%` }} />
            </div>
          </div>

          <div className="controls">
            <button
              onClick={removeOz}
              disabled={currentOz === 0}
              className="control-button back-button"
            >
              ➖ Undo
            </button>
            <button onClick={addOz} className="control-button add-button">
              ➕ Add 1 oz
            </button>
          </div>
        </div>

        <div className="history-panel">
          <h2 className="history-title">History</h2>
          
          {history.length === 0 ? (
            <p className="history-empty">
              Your intake history will appear here after the first day.
            </p>
          ) : (
            <div className="history-list">
              {history.map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">{entry.date}</div>
                  <div className={entry.percent >= 100 ? 'history-percent goal-reached' : 'history-percent'}>
                    {entry.percent}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 50 });
  
  return (
    <div className="confetti-container">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#E21833', '#FFD200', '#FFFFFF'][Math.floor(Math.random() * 3)],
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
}
