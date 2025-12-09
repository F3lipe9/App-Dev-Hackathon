import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import './Assignments.css';

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

interface Assignment {
  id: number;
  title: string;
  course: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'homework' | 'exam' | 'project' | 'lab';
  points: string;
}

interface Course {
  code: string;
  name: string;
  professor: string;
}

interface NewAssignment {
  title: string;
  course: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  type: 'homework' | 'exam' | 'project' | 'lab';
  points: string;
}

export default function Assignments() {
  const [username, setUsername] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [newAssignment, setNewAssignment] = useState<NewAssignment>({
    title: '',
    course: '',
    dueDate: '',
    priority: 'medium',
    type: 'homework',
    points: ''
  });

  // API base URL - adjust based on your backend
  const API_BASE_URL = 'http://localhost:8000';

  // Colors object
  const colors = {
    umdRed: 'rgb(226, 24, 51)',
    umdBlack: 'rgb(0, 0, 0)',
    white: 'rgb(255, 255, 255)',
    gray50: 'rgb(249, 250, 251)',
    gray100: 'rgb(243, 244, 246)',
    gray200: 'rgb(229, 231, 235)',
    gray300: 'rgb(209, 213, 219)',
    gray600: 'rgb(107, 114, 128)',
    gray700: 'rgb(75, 85, 99)',
    gray800: 'rgb(31, 41, 55)',
    gray900: 'rgb(17, 24, 39)',
    red50: 'rgb(254, 242, 242)',
    red100: 'rgb(254, 226, 226)',
    red200: 'rgb(254, 202, 202)',
    red500: 'rgb(239, 68, 68)',
    red600: 'rgb(220, 38, 38)',
    red700: 'rgb(185, 28, 28)',
    red800: 'rgb(153, 27, 27)',
    yellow50: 'rgb(254, 252, 232)',
    yellow100: 'rgb(254, 243, 199)',
    yellow200: 'rgb(253, 230, 138)',
    yellow400: 'rgb(251, 191, 36)',
    yellow800: 'rgb(146, 64, 14)',
    yellow900: 'rgb(120, 53, 15)',
    blue50: 'rgb(239, 246, 255)',
    blue100: 'rgb(219, 234, 254)',
    blue200: 'rgb(191, 219, 254)',
    blue500: 'rgb(59, 130, 246)',
    blue700: 'rgb(29, 78, 216)',
    blue800: 'rgb(30, 64, 175)',
    blue900: 'rgb(30, 58, 138)',
    green50: 'rgb(240, 253, 244)',
    green100: 'rgb(209, 250, 229)',
    green200: 'rgb(167, 243, 208)',
    green500: 'rgb(16, 185, 129)',
    green600: 'rgb(5, 150, 105)',
    green700: 'rgb(4, 120, 87)',
    green800: 'rgb(6, 95, 70)',
    orange500: 'rgb(245, 158, 11)'
  };

  // Real API Calls to Backend
  const API = {
    async fetchAssignments(): Promise<Assignment[]> {
      const response = await fetch(`${API_BASE_URL}/assignments`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return await response.json();
    },

    async fetchCourses(): Promise<Course[]> {
      const response = await fetch(`${API_BASE_URL}/courses`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return await response.json();
    },

    async addAssignment(assignment: NewAssignment): Promise<Assignment> {
      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignment)
      });
      if (!response.ok) throw new Error('Failed to add assignment');
      return await response.json();
    },

    async updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment> {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update assignment');
      return await response.json();
    },

    async deleteAssignment(id: number): Promise<{ success: boolean; id: number }> {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete assignment');
      return await response.json();
    }
  };

  useEffect(() => {
    const u = localStorage.getItem('username');
    setUsername(u);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsData, coursesData] = await Promise.all([
        API.fetchAssignments(),
        API.fetchCourses()
      ]);
      // Convert _id to id for each assignment
      const mappedAssignments = assignmentsData.map((a: any) => ({ ...a, id: a._id }));
      setAssignments(mappedAssignments);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to empty data if backend is down
      setAssignments([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async () => {
    if (!username) {
      alert('Please log in first.');
      return;
    }
    if (newAssignment.title && newAssignment.course && newAssignment.dueDate) {
      try {
        const payload = { ...newAssignment, username };
        const response = await fetch(`${API_BASE_URL}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to add assignment');
        const created = await response.json();
        // Convert _id to id for frontend
        const assignment = { ...created, id: created._id };
        setAssignments([...assignments, assignment]);
        setNewAssignment({ title: '', course: '', dueDate: '', priority: 'medium', type: 'homework', points: '' });
        setShowAddForm(false);
      } catch (error) {
        console.error('Error adding assignment:', error);
        alert('Failed to add assignment. Please try again.');
      }
    }
  };

  const updateStatus = async (id: number, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const updated = await API.updateAssignment(id, { status: newStatus });
      setAssignments(assignments.map(a =>
        a.id === id ? { ...a, status: newStatus } : a
      ));
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const deleteAssignment = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await API.deleteAssignment(id);
        setAssignments(assignments.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  const getDaysUntil = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return colors.green500;
      case 'in-progress': return colors.orange500;
      default: return colors.gray600;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return colors.red600;
      case 'medium': return colors.orange500;
      default: return colors.gray600;
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'exam': return '📝';
      case 'project': return '💻';
      case 'lab': return '🔬';
      case 'homework': return '📚';
      default: return '📄';
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return getDaysUntil(a.dueDate) < 0 && a.status !== 'completed';
    if (filter === 'upcoming') return getDaysUntil(a.dueDate) >= 0 && getDaysUntil(a.dueDate) <= 7;
    return a.status === filter;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    inProgress: assignments.filter(a => a.status === 'in-progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => getDaysUntil(a.dueDate) < 0 && a.status !== 'completed').length,
    totalPoints: assignments.reduce((sum, a) => sum + (parseInt(a.points) || 0), 0),
    completedPoints: assignments.filter(a => a.status === 'completed').reduce((sum, a) => sum + (parseInt(a.points) || 0), 0)
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🐢</div>
          <div className="loading-text">Loading Assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments-container">
      <div className="assignments-content">
        <TopNav />
        <div className="assignments-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="assignments-title">🐢 UMD Assignments</h1>
              <p className="assignments-subtitle">University of Maryland - Fall 2024</p>
            </div>
            <div className="assignments-points">
              {stats.completedPoints}/{stats.totalPoints} pts
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card" style={{ 
            background: `linear-gradient(135deg, ${colors.gray100} 0%, ${colors.gray200} 100%)`,
            borderColor: colors.gray300
          }}>
            <div className="stat-value" style={{ color: colors.gray800 }}>{stats.total}</div>
            <div className="stat-label" style={{ color: colors.gray600 }}>Total</div>
          </div>
          
          <div className="stat-card" style={{ 
            background: `linear-gradient(135deg, ${colors.yellow100} 0%, ${colors.yellow200} 100%)`,
            borderColor: colors.yellow400
          }}>
            <div className="stat-value" style={{ color: colors.yellow800 }}>{stats.pending}</div>
            <div className="stat-label" style={{ color: colors.yellow900 }}>Pending</div>
          </div>
          
          <div className="stat-card" style={{ 
            background: `linear-gradient(135deg, ${colors.blue100} 0%, ${colors.blue200} 100%)`,
            borderColor: colors.blue500
          }}>
            <div className="stat-value" style={{ color: colors.blue900 }}>{stats.inProgress}</div>
            <div className="stat-label" style={{ color: colors.blue800 }}>In Progress</div>
          </div>
          
          <div className="stat-card" style={{ 
            background: `linear-gradient(135deg, ${colors.green100} 0%, ${colors.green200} 100%)`,
            borderColor: colors.green500
          }}>
            <div className="stat-value" style={{ color: colors.green800 }}>{stats.completed}</div>
            <div className="stat-label" style={{ color: colors.green700 }}>Completed</div>
          </div>
          
          {stats.overdue > 0 && (
            <div className="stat-card" style={{ 
              background: `linear-gradient(135deg, ${colors.red100} 0%, ${colors.red200} 100%)`,
              borderColor: colors.red500
            }}>
              <div className="stat-value" style={{ color: colors.red800 }}>{stats.overdue}</div>
              <div className="stat-label" style={{ color: colors.red700 }}>Overdue ⚠️</div>
            </div>
          )}
        </div>

        {/* Filter and Add Button */}
        <div className="controls-container">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Assignments</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Due This Week</option>
          </select>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-button"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Assignment'}
          </button>
        </div>

        {/* Add Assignment Form */}
        {showAddForm && (
          <div className="form-container">
            <h3 className="form-title">New Assignment</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Assignment Title"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                className="form-input"
              />
              
              <input
                type="text"
                placeholder="Course Code (e.g., CMSC330)"
                value={newAssignment.course}
                onChange={(e) => setNewAssignment({...newAssignment, course: e.target.value})}
                className="form-input"
              />
              
              <div className="form-row">
                <select
                  value={newAssignment.type}
                  onChange={(e) => setNewAssignment({...newAssignment, type: e.target.value as NewAssignment['type']})}
                  className="form-select"
                >
                  <option value="homework">Homework</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                  <option value="lab">Lab</option>
                </select>
                
                <select
                  value={newAssignment.priority}
                  onChange={(e) => setNewAssignment({...newAssignment, priority: e.target.value as NewAssignment['priority']})}
                  className="form-select"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Points"
                  value={newAssignment.points}
                  onChange={(e) => setNewAssignment({...newAssignment, points: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <input
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                className="form-input"
              />
              
              <button onClick={addAssignment} className="submit-button">
                Add Assignment
              </button>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="assignments-list">
          {filteredAssignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐢</div>
              <div>No assignments found for this filter.</div>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const daysUntil = getDaysUntil(assignment.dueDate);
              const isOverdue = daysUntil < 0 && assignment.status !== 'completed';
              const courseInfo = courses.find(c => c.code === assignment.course);
              
              return (
                <div
                  key={assignment.id}
                  className="assignment-card"
                  style={{ borderLeftColor: isOverdue ? colors.red500 : getPriorityColor(assignment.priority) }}
                >
                  <div className="card-header">
                    <div className="card-content">
                      <div className="card-title">
                        <span className="type-icon">{getTypeIcon(assignment.type)}</span>
                        <h3 className="assignment-title">{assignment.title}</h3>
                      </div>
                      
                      <div className="course-info">
                        {assignment.course} {courseInfo && `- ${courseInfo.name}`}
                      </div>
                      
                      {courseInfo && (
                        <div className="professor">
                          Professor: {courseInfo.professor}
                        </div>
                      )}
                      
                      <div className="card-details">
                        <span className="due-date" style={{ color: isOverdue ? colors.red500 : colors.gray700 }}>
                          📅 Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isOverdue && <strong> (OVERDUE!)</strong>}
                          {!isOverdue && daysUntil === 0 && <strong> (TODAY)</strong>}
                          {!isOverdue && daysUntil === 1 && <strong> (Tomorrow)</strong>}
                          {!isOverdue && daysUntil > 1 && daysUntil <= 7 && ` (${daysUntil} days)`}
                        </span>
                        
                        <span
                          className="priority-badge"
                          style={{ background: getPriorityColor(assignment.priority) }}
                        >
                          {assignment.priority.toUpperCase()}
                        </span>
                        
                        {assignment.points && (
                          <span className="points">
                            {assignment.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-actions">
                      <select
                        value={assignment.status}
                        onChange={(e) => updateStatus(assignment.id, e.target.value as Assignment['status'])}
                        className="status-select"
                        style={{ background: getStatusColor(assignment.status) }}
                      >
                        <option value="pending">📋 Pending</option>
                        <option value="in-progress">⏳ In Progress</option>
                        <option value="completed">✅ Completed</option>
                      </select>
                      
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        className="delete-button"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="assignments-footer">
          <p>Fear the Turtle! 🐢 | University of Maryland</p>
        </div>
      </div>
    </div>
  );
}