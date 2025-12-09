import { useEffect, useState } from "react";
import { Link } from 'react-router'
import "./home.css";

export default function Home() {
    const [username, setUsername] = useState<string | null>(null);
    const [habits, setHabits] = useState<Array<{id:string,title:string,description:string}>>([]);

    useEffect(() => {
        const name = localStorage.getItem("username");
        setUsername(name);
    }, []);

    const [affirmations, setAffirmations] = useState<Array<{id: string, text: string}>>([]);

    // fetch affirmations from backend once
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('http://localhost:8000/affirmations');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) setAffirmations(data);
                }
            } catch (err) {
                console.error('Failed to load affirmations', err);
            }
        })();
    }, []);

    // Use UTC days since epoch so affirmation changes once per day regardless of timezone.
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const todaysAffirmation = affirmations.length 
        ? affirmations[daysSinceEpoch % affirmations.length].text 
        : "Today is a great day to learn and build something new.";

    // --- Daily habits & streak (per-user) ---
    // Use local date key (YYYY-MM-DD) so habits reset at local midnight.
    const getLocalDateKey = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const todayKey = getLocalDateKey();

    const [streak, setStreak] = useState<number>(0);
    const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);
    const [completed, setCompleted] = useState<Record<string, boolean>>({});

    // Load user-specific data once username is known
    useEffect(() => {
        if (!username) return;

        // load habits from backend
        (async () => {
            try {
                const res = await fetch(`http://localhost:8000/habits?username=${encodeURIComponent(username)}`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('Loaded habits:', data);
                    setHabits(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch habits', err);
            }
        })();

        // load streak and last date for this user
        const s = localStorage.getItem(`streak-${username}`);
        setStreak(s ? Number(s) : 0);
        const lsd = localStorage.getItem(`streakDate-${username}`);
        setLastStreakDate(lsd);
    }, [username]); // Only depend on username, not todayKey

    // Load today's completed set separately based on todayKey
    useEffect(() => {
        if (!username) return;
        const raw = localStorage.getItem(`habits-${username}-${todayKey}`);
        if (raw) setCompleted(JSON.parse(raw));
        else setCompleted({});
    }, [username, todayKey]);

    // Persist streak and lastStreakDate when they change (per-user)
    useEffect(() => {
        if (!username) return;
        localStorage.setItem(`streak-${username}`, String(streak));
        if (lastStreakDate) localStorage.setItem(`streakDate-${username}`, lastStreakDate);
    }, [streak, lastStreakDate, username]);

    // Persist today's completed set when it changes (per-user)
    useEffect(() => {
        if (!username) return;
        localStorage.setItem(`habits-${username}-${todayKey}`, JSON.stringify(completed));
    }, [completed, todayKey, username]);

    const markHabit = (id: string, value: boolean) => {
        setCompleted(prev => {
            const next = { ...prev, [id]: value };

            const prevCount = Object.values(prev).filter(Boolean).length;
            const nextCount = Object.values(next).filter(Boolean).length;
            if (prevCount === 0 && nextCount > 0) {
                if (lastStreakDate !== todayKey) {
                    setStreak(s => s + 1);
                    setLastStreakDate(todayKey);
                }
            }

            return next;
        });
    };

    const addHabitToBackend = async (title: string, description: string) => {
        if (!username) return;
        try {
            const res = await fetch('http://localhost:8000/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, title, description })
            });
            if (res.ok) {
                const data = await res.json();
                // append to local state
                if (data.habit) setHabits(h => [...h, data.habit]);
            } else {
                console.error('Failed to create habit', await res.text());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const onAddHabitClicked = async () => {
        const title = window.prompt('Habit title');
        if (!title) return;
        const description = window.prompt('Description (optional)') || '';
        await addHabitToBackend(title, description);
    };

    return (

            <div className="home-container home-root">
                <div className="home-card">
                    <h1 className="home-heading">Hello{username ? `, ${username}` : ", Guest"}</h1>

                    <div className="section-block">
                        <h2 className="affirmation-heading">Daily Affirmation -</h2>
                        <p className="affirmation" aria-live="polite">{todaysAffirmation}</p>
                    </div>

                    <div className="section-block">
                        <div className="habits-header">
                            <div className="habits-title">Your Daily Habits</div>
                            <div>
                                <button className="btn btn-secondary" onClick={onAddHabitClicked}>Add Habit</button>
                            </div>
                        </div>

                        <div className="section-subblock">
                            <div className="streak">Streak: <strong>{streak}</strong></div>

                            <div className="habits-list">
                                {habits.length === 0 && (<div className="habit-empty">You have no habits yet. Add one to get started.</div>)}
                                {habits.map(h => (
                                    <label key={h.id} className="habit-item">
                                        <input type="checkbox" checked={!!completed[h.id]} onChange={(e) => markHabit(h.id, e.target.checked)} />
                                        <span className="habit-title">{h.title}</span>
                                        <div className="habit-description">{h.description}</div>
                                    </label>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div className="sections-grid">
                        <div className="section section-academic">
                            <h3>Academic</h3>
                            <p>A Smart Terp stays on top of their classes</p>
                            <div className="button-row">
                                <Link to="/assignments"><button className="btn btn-primary">Assignments</button></Link>
                                <Link to="/exams"><button className="btn btn-primary">Exams</button></Link>
                            </div>
                        </div>

                        <div className="section section-health">
                            <h3>Health</h3>
                            <p>A Healthy Terp can balance class with their body wellness</p>
                            <div className="button-row">
                                <Link to="/workouts"><button className="btn btn-primary">Workouts</button></Link>
                                <Link to="/water"><button className="btn btn-primary">Water Intake</button></Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
    );
}