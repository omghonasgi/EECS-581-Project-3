// Login.tsx
//
// Owners:
//   Adam Darst  - Register page (username, email, password >= 8 chars,
//                 duplicate username/email error), Login page (success routes
//                 to /map, failure shows "Invalid username or password"),
//                 and route guards so /map and other logged-in pages cannot
//                 be opened while logged out.
//   Arin Shah   - Sprint 2: register/login go through Supabase Auth
//                 (supabase.auth.signUp / signInWithPassword). Supabase hashes
//                 the password; the app never stores it. The session lives in
//                 Supabase (see src/lib/AuthProvider.tsx), not localStorage flags.

import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../index.css";

const INVALID_LOGIN = "Invalid username or password";

// The form asks for a username, but Supabase Auth signs in with an email.
// Look the email up from profiles (an email typed directly also works).
async function emailForLogin(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier;
  const { data, error } = await supabase.rpc("email_for_username", { p_username: identifier });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export default function Login() {
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    try {
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

        // Clear message for a taken username before creating the Auth user.
        const { data: available, error: checkError } = await supabase.rpc(
          "username_available",
          { p_username: username.trim() }
        );
        if (checkError) throw checkError;
        if (!available) {
          setMessage("That username is already taken.");
          setIsError(true);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already registered") || msg.includes("already exists")) {
            setMessage("That email is already registered.");
          } else if (msg.includes("database error")) {
            // The profiles unique index rejected it (username taken in a race).
            setMessage("That username is already taken.");
          } else {
            setMessage(error.message);
          }
          setIsError(true);
          return;
        }

        // With email confirmation on, Supabase returns a user with no
        // identities instead of an error when the email is already used.
        if (data.user && data.user.identities?.length === 0) {
          setMessage("That email is already registered.");
          setIsError(true);
          return;
        }

        const needsConfirmation = !data.session;
        // Keep the Sprint 1 flow: register, then log in on purpose.
        if (data.session) await supabase.auth.signOut();

        setUsername("");
        setEmail("");
        setPassword("");
        setIsRegistering(false);
        setMessage(
          needsConfirmation
            ? "Account created. Check your email to confirm it, then log in."
            : "Account created. You can now log in."
        );
        setIsError(false);
        return;
      }

      const loginEmail = await emailForLogin(username.trim());
      if (!loginEmail) {
        setMessage(INVALID_LOGIN);
        setIsError(true);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        setMessage(
          error.message.toLowerCase().includes("email not confirmed")
            ? "Please confirm your email before logging in."
            : INVALID_LOGIN
        );
        setIsError(true);
        return;
      }

      navigate("/map");
    } catch {
      setMessage("Can't reach Supabase. Check your connection and .env.local settings.");
      setIsError(true);
    }
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
            minLength={isRegistering ? 8 : undefined}
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
