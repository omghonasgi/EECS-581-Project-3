// Login.tsx
//
// Owners:
//   Adam Darst  - Register page (username, email, password >= 8 chars,
//                 duplicate username/email error), Login page (success routes
//                 to /map, failure shows "Invalid username or password"),
//                 and route guards so /map and other logged-in pages cannot
//                 be opened while logged out.
//   Arin Shah   - Wire this page to the register API and login API, store the
//                 session token, and add the "logged in?" check that later
//                 requests use.
//
// Leave this component empty for now so both developers can fill it in.

import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

type User = {
  username: string;
  email: string;
  password: string;
};

const USERS_KEY = "triptrace_users";
const CURRENT_USER_KEY = "triptrace_current_user";

function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as User[];
}

export default function Login() {
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    const users = getUsers();

    if (isRegistering) {
      if (!username.trim() || !email.trim() || !password) {
        setMessage("Username, email, and password are required.");
        setIsError(true);
        return;
      }

      if (password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        setIsError(true);
        return;
      }

      const usernameTaken = users.some(
        (user) => user.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (usernameTaken) {
        setMessage("That username is already taken.");
        setIsError(true);
        return;
      }

      const emailTaken = users.some(
        (user) => user.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (emailTaken) {
        setMessage("That email is already registered.");
        setIsError(true); 
        return;
      }

      const newUser: User = {
        username: username.trim(),
        email: email.trim(),
        password,
      };

      localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));

      setUsername("");
      setEmail("");
      setPassword("");
      setIsRegistering(false);
      setMessage("Account created. You can now log in.");
      setIsError(false);
      return;
    }

    const matchingUser = users.find(
      (user) =>
        user.username.toLowerCase() === username.trim().toLowerCase() &&
        user.password === password
    );

    if (!matchingUser) {
      setMessage("Invalid username or password");
      setIsError(true);
      return;
    }

    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify({ username: matchingUser.username })
    );

    navigate("/map");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-icon">✈</div>
          <h1>TripTrace</h1>
          <p>Keep track of the places that matter.</p>
        </div>

        <div className="form-heading">
          <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
          <p>
            {isRegistering
              ? "Start saving your favorite travel experiences."
              : "Log in to continue your journey."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

        {isRegistering && (
            <>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </>
          )}

        <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder={
              isRegistering ? "At least 8 characters" : "Enter your password"
            }
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

        {message && (
            <p className={isError ? "message error" : "message success"}>
              {message}
            </p>
          )}

        <button type="submit" className="primary-button">
            {isRegistering ? "Create account" : "Log in"}
          </button>
      </form>

      <div className="form-divider">
          <span>or</span>
        </div>

        <p className="switch-text">
          {isRegistering
            ? "Already have an account?"
            : "Don't have an account?"}
        </p>

      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          setIsRegistering(!isRegistering);
          setMessage("");
          setUsername("");
          setEmail("");
          setPassword("");
        }}
        >
          {isRegistering ? "Log in instead" : "Create an account"}
        </button>
      </section>
    </main>
  );
}
