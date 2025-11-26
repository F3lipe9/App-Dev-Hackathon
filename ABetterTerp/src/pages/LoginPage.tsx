import { useState } from "react";
import { useNavigate } from "react-router";
import { Link } from 'react-router'
import "./Register.css"; // reuse your existing styling

export default function Login() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();



  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password) return;

    // Store user info in localStorage
    localStorage.setItem("username", username);
    localStorage.setItem("email", email);

    setMessage(`Logged in as ${username}`);

    // clear password field for security/UX
    setPassword("");

    // Optionally navigate to feed/page
    setTimeout(() => navigate("/home"), 500);
  };

  return (
    <div className="form-container root">
      <div className="auth-card">
        <h1 className="auth-heading">Login</h1>
        <form onSubmit={handleLogin} className="auth-form">
          <input
            className="auth-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn btn-primary" type="submit">Login</button>
        </form>

        <p className="auth-link">
          <Link to="/">Need an Account?</Link>
        </p>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}