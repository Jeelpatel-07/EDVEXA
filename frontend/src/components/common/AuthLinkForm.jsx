import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import authApi from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";

export default function AuthLinkForm({ kind }) {
  const { isAuthenticated } = useAuth();
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ||
    new URLSearchParams(window.location.search).get("token") || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const needsPassword = kind === "reset" || (kind === "invite" && !isAuthenticated);
  const title = { verify: "Verify your email", reset: "Set a new password", invite: "Accept organization invitation" }[kind];
  useEffect(() => {
    // Remove secrets from the address bar without consuming the link on page load.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) { setError("Open the complete link you received."); return; }
    if (needsPassword && (password.length < 15 || password.length > 128 || password !== confirmation)) {
      setError("Use 15–128 characters and matching passwords."); return;
    }
    setBusy(true);
    try {
      const response = kind === "verify" ? await authApi.verifyEmail(token)
        : kind === "reset" ? await authApi.resetPassword({ token, new_password: password })
        : await authApi.acceptInvite(isAuthenticated ? { token } : { token, full_name: name, password });
      setMessage(response.message);
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError("");
    try { setMessage((await authApi.resendVerification(email)).message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="min-h-[70vh] flex items-center justify-center p-6">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 space-y-5 shadow-sm">
      <h1 className="text-xl font-bold">{title}</h1>
      {message && <p role="status" className="text-sm text-teal-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!done && <form onSubmit={submit} className="space-y-4">
        {!token && <p className="text-sm">This page needs the link from your email or organization administrator.</p>}
        {kind === "invite" && !isAuthenticated && <>
          <p className="text-sm">Already have an account? Sign in with the invited email, then open your original invitation link again.</p>
          <input aria-label="Full name" placeholder="Full name" required minLength={2} maxLength={120}
            value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl p-3" />
        </>}
        {needsPassword && <>
          <input aria-label="New password" autoComplete="new-password" placeholder="New password (15–128 characters)"
            type="password" required minLength={15} maxLength={128} value={password}
            onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-xl p-3" />
          <input aria-label="Confirm password" autoComplete="new-password" placeholder="Confirm password"
            type="password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
            className="w-full border rounded-xl p-3" />
        </>}
        <button disabled={busy || !token} className="w-full bg-teal-600 text-white rounded-xl p-3 disabled:opacity-50">
          {busy ? "Please wait…" : title}
        </button>
      </form>}
      {kind === "verify" && !done && <div className="space-y-2">
        <input aria-label="Email for another verification link" type="email" placeholder="Your email"
          value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-xl p-3" />
        <button onClick={resend} disabled={busy || !email} className="text-sm text-teal-700">Send a new verification link</button>
      </div>}
      <Link to="/login" className="inline-block text-sm text-teal-700">Go to sign in</Link>
    </div>
  </div>;
}
