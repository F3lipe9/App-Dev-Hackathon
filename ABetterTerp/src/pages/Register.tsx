import { useState } from 'react'
import { Link } from 'react-router'
import './Register.css'



export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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
      <div className="auth-card">
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