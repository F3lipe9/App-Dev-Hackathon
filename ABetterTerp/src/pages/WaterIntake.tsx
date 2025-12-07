import { useState } from 'react';
import './WaterIntake.css';

interface HistoryEntry {
  date: string;
  percent: number;
}

export default function WaterIntake() {
  const [isSetup, setIsSetup] = useState(false);
  const [bottleName, setBottleName] = useState('');
  const [bottleOz, setBottleOz] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [currentOz, setCurrentOz] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  console.log('WaterIntake rendering', { isSetup, bottleName });
  // place holder backend for setup
  const handleSetup = () => {
    if (bottleName && bottleOz && dailyGoal) {
      setIsSetup(true);
      
    }
  };

  // place holder backend for adding oz
  const addOz = () => {
    const newOz = currentOz + 1;
    setCurrentOz(newOz);
    
  };

  // place holder backend for removing oz
  const removeOz = () => {
    if (currentOz > 0) {
      const newOz = currentOz - 1;
      setCurrentOz(newOz);
      
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

  const fillPercentage = Math.min((currentOz / parseInt(dailyGoal)) * 100, 100);
  const totalPercentage = Math.round((currentOz / parseInt(dailyGoal)) * 100);

  // place holder backend to get history HERE

  if (!isSetup) {
    return (
      <div className="water-intake-page">
        <div className="setup-card">
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
    <div className="water-intake-page">
      
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
  );
}

