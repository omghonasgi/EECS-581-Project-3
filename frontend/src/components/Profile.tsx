import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabase";

type ProfileRow = {
  username: string;
  email: string;
  created_at: string;
};

type UpdateAction = "username" | "email" | "password";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [createdAt, setCreatedAt] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showUpdateOptions, setShowUpdateOptions] = useState(false);
  const [activeAction, setActiveAction] = useState<UpdateAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const currentUser = user;
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, email, created_at")
          .eq("id", currentUser.id)
          .single();

        if (cancelled) return;
        if (error) {
          console.error("Loading profile failed", error);
          setLoadError("Could not load your profile. Please try again.");
        } else {
          const profile = data as ProfileRow;
          setUsername(profile.username);
          setEmail(currentUser.email ?? profile.email);
          setCreatedAt(profile.created_at);
          setUsernameDraft(profile.username);
          setEmailDraft(currentUser.email ?? profile.email);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Loading profile failed", error);
        setLoadError("Could not load your profile. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, retryCount]);

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageIsError(false);

    const updatedUsername = usernameDraft.trim();
    if (!updatedUsername) {
      setMessage("Username is required.");
      setMessageIsError(true);
      return;
    }
    if (updatedUsername.length > 50) {
      setMessage("Username must be 50 characters or fewer.");
      setMessageIsError(true);
      return;
    }
    if (!user) {
      setMessage("Please log in again before updating your profile.");
      setMessageIsError(true);
      return;
    }
    const currentUser = user;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: updatedUsername })
        .eq("id", currentUser.id);

      if (error) {
        console.error("Updating profile username failed", error);
        setMessage(
          error.code === "23505"
            ? "That username is already taken."
            : "Could not update your username. Please try again."
        );
        setMessageIsError(true);
        return;
      }

      setUsername(updatedUsername);
      setActiveAction(null);
      setShowUpdateOptions(false);
      setMessage("Username updated.");
    } catch (error) {
      console.error("Updating profile username failed", error);
      setMessage(
        "Could not update your username. Please check your connection and try again."
      );
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageIsError(false);

    const updatedEmail = emailDraft.trim();
    if (!updatedEmail) {
      setMessage("Email address is required.");
      setMessageIsError(true);
      return;
    }
    if (!user) {
      setMessage("Please log in again before updating your email.");
      setMessageIsError(true);
      return;
    }
    if (updatedEmail.toLowerCase() === email.toLowerCase()) {
      setMessage("Enter a different email address.");
      setMessageIsError(true);
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ email: updatedEmail });
      if (error) {
        console.error("Updating account email failed", error);
        setMessage(
          error.message.toLowerCase().includes("already")
            ? "That email address is already in use."
            : "Could not update your email. Please try again."
        );
        setMessageIsError(true);
        return;
      }

      if (data.user.email?.toLowerCase() === updatedEmail.toLowerCase()) {
        setEmail(updatedEmail);
        setMessage("Email address updated.");
      } else {
        setMessage(
          "Check your inbox to confirm the new email address. Your profile will update after confirmation."
        );
      }
      setActiveAction(null);
      setShowUpdateOptions(false);
    } catch (error) {
      console.error("Updating account email failed", error);
      setMessage(
        "Could not update your email. Please check your connection and try again."
      );
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageIsError(false);

    if (!user) {
      setMessage("Please log in again before updating your password.");
      setMessageIsError(true);
      return;
    }
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setMessageIsError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageIsError(true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error("Updating account password failed", error);
        setMessage("Could not update your password. Please try again.");
        setMessageIsError(true);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setActiveAction(null);
      setShowUpdateOptions(false);
      setMessage("Password updated.");
    } catch (error) {
      console.error("Updating account password failed", error);
      setMessage("Could not update your password. Please check your connection and try again.");
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  function chooseAction(action: UpdateAction) {
    setActiveAction(action);
    setUsernameDraft(username);
    setEmailDraft(email);
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageIsError(false);
  }

  return (
    <main style={{ maxWidth: "600px", margin: "3rem auto", padding: "2rem", background: "#fff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
      <h1 style={{ color: "#123047", marginTop: 0 }}>Your Profile</h1>

      {loading ? (
        <p role="status">Loading your profile...</p>
      ) : loadError ? (
        <div>
          <p role="alert" style={{ color: "#991b1b" }}>{loadError}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="profile-details-heading" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "#f1f5f9", borderRadius: "8px" }}>
            <h2 id="profile-details-heading" style={{ marginTop: 0, color: "#123047" }}>Account details</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 2fr", gap: "0.75rem", margin: 0 }}>
              <dt style={{ fontWeight: "bold", color: "#334155" }}>Username</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{username}</dd>
              <dt style={{ fontWeight: "bold", color: "#334155" }}>Email address</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{email}</dd>
              <dt style={{ fontWeight: "bold", color: "#334155" }}>Member since</dt>
              <dd style={{ margin: 0 }}>
                <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString()}</time>
              </dd>
            </dl>
          </section>

          {message && (
            <p
              role={messageIsError ? "alert" : "status"}
              style={{ color: messageIsError ? "#991b1b" : "#166534", margin: "0 0 1rem" }}
            >
              {message}
            </p>
          )}

          {!showUpdateOptions ? (
            <button
              type="button"
              onClick={() => setShowUpdateOptions(true)}
              style={{ padding: "0.9rem 1.25rem", background: "#0f766e", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Update profile
            </button>
          ) : (
            <section aria-labelledby="update-options-heading" style={{ marginBottom: "1.5rem" }}>
              <h2 id="update-options-heading" style={{ color: "#123047" }}>What would you like to update?</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <button type="button" onClick={() => chooseAction("username")} style={{ padding: "0.75rem 1rem", border: "1px solid #0f766e", borderRadius: "6px", color: "#0f766e", background: "white", cursor: "pointer" }}>Update username</button>
                <button type="button" onClick={() => chooseAction("email")} style={{ padding: "0.75rem 1rem", border: "1px solid #0f766e", borderRadius: "6px", color: "#0f766e", background: "white", cursor: "pointer" }}>Update email</button>
                <button type="button" onClick={() => chooseAction("password")} style={{ padding: "0.75rem 1rem", border: "1px solid #0f766e", borderRadius: "6px", color: "#0f766e", background: "white", cursor: "pointer" }}>Change password</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateOptions(false);
                    setActiveAction(null);
                    setMessage("");
                  }}
                  style={{ padding: "0.75rem 1rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#334155", background: "white", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {activeAction && (
            <button
              type="button"
              onClick={() => {
                setActiveAction(null);
                setMessage("");
              }}
              style={{ marginBottom: "0.75rem", padding: 0, border: "none", background: "none", color: "#0f766e", textDecoration: "underline", cursor: "pointer" }}
            >
              Back to update choices
            </button>
          )}

          {activeAction === "username" && (
            <form onSubmit={handleUsernameSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label htmlFor="profile-username" style={{ fontWeight: "bold", color: "#334155" }}>New username</label>
              <input
                id="profile-username"
                type="text"
                value={usernameDraft}
                maxLength={50}
                required
                onChange={(event) => {
                  setUsernameDraft(event.target.value);
                  setMessage("");
                  setMessageIsError(false);
                }}
                style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "1rem" }}
              />
              <button type="submit" disabled={saving} style={{ padding: "0.9rem", background: "#0f766e", color: "white", border: "none", borderRadius: "6px", cursor: saving ? "wait" : "pointer", fontWeight: "bold" }}>
                {saving ? "Saving..." : "Save username"}
              </button>
            </form>
          )}

          {activeAction === "email" && (
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label htmlFor="profile-email" style={{ fontWeight: "bold", color: "#334155" }}>New email address</label>
              <input
                id="profile-email"
                type="email"
                value={emailDraft}
                required
                onChange={(event) => {
                  setEmailDraft(event.target.value);
                  setMessage("");
                  setMessageIsError(false);
                }}
                style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "1rem" }}
              />
              <button type="submit" disabled={saving} style={{ padding: "0.9rem", background: "#0f766e", color: "white", border: "none", borderRadius: "6px", cursor: saving ? "wait" : "pointer", fontWeight: "bold" }}>
                {saving ? "Saving..." : "Save email"}
              </button>
            </form>
          )}

          {activeAction === "password" && (
            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label htmlFor="profile-new-password" style={{ fontWeight: "bold", color: "#334155" }}>New password</label>
              <input
                id="profile-new-password"
                type="password"
                value={newPassword}
                minLength={8}
                autoComplete="new-password"
                required
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setMessage("");
                  setMessageIsError(false);
                }}
                style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "1rem" }}
              />
              <label htmlFor="profile-confirm-password" style={{ fontWeight: "bold", color: "#334155" }}>Confirm new password</label>
              <input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                minLength={8}
                autoComplete="new-password"
                required
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setMessage("");
                  setMessageIsError(false);
                }}
                style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "1rem" }}
              />
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Password must be at least 8 characters.</p>
              <button type="submit" disabled={saving} style={{ padding: "0.9rem", background: "#0f766e", color: "white", border: "none", borderRadius: "6px", cursor: saving ? "wait" : "pointer", fontWeight: "bold" }}>
                {saving ? "Saving..." : "Change password"}
              </button>
            </form>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => navigate("/map")}
        style={{ padding: "0.9rem", background: "transparent", color: "#0f766e", border: "2px solid #0f766e", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
      >
        Back to map
      </button>
    </main>
  );
}
