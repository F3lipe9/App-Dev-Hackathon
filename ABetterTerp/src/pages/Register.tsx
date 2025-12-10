import { useState } from 'react'
import { Link } from 'react-router'
import { useNavigate } from "react-router";
import './Register.css'
import testudo from '../assets/testudo.jpg'

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Generate random testudo positions
  const testudoImages = [
    { top: '10%', left: '5%', width: '120px', opacity: 0.7 },
    { top: '15%', right: '8%', width: '100px', opacity: 0.6 },
    { bottom: '20%', left: '10%', width: '110px', opacity: 0.65 },
    { bottom: '15%', right: '5%', width: '130px', opacity: 0.75 },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful!");
        setUsername("");
        setEmail("");
        setPassword("");

        // Store user info in localStorage
        localStorage.setItem("username", username);
        localStorage.setItem("email", email);

    setMessage(`Logged in as ${username}`);

        setTimeout(() => navigate("/home"), 500);
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: Could not connect to server");
    }
  }

  return (
    <div className="form-container root">
      {testudoImages.map((img, idx) => (
        <img
          key={idx}
          src={testudo}
          alt="Testudo"
          style={{
            position: 'absolute',
            top: img.top,
            bottom: img.bottom,
            left: img.left,
            right: img.right,
            width: img.width,
            height: 'auto',
            opacity: img.opacity,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}
      <div className="auth-card" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="auth-heading">Register</h1>

        <form onSubmit={handleSubmit} className="auth-form">
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

          <button className="btn btn-primary" type="submit">Create Account</button>
        </form>

        <p className="auth-link">
          <Link to="/login">Already Have an Account?</Link>
        </p>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}