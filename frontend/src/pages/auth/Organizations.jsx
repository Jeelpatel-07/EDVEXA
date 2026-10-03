import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/authApi";

export default function Organizations() {
  const { organizations, switchOrganization, refreshSession, isPlatformAdmin, logout } = useAuth();
  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const act = async (operation) => {
    setBusy(true); setError("");
    try { await operation(); navigate("/app/dashboard"); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="max-w-xl mx-auto p-8 space-y-5">
    <h1 className="text-2xl font-bold">Your organizations</h1>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {organizations.map((org) => <button key={org.id} disabled={busy || org.status !== "ACTIVE"}
      onClick={() => act(() => switchOrganization(org.id))}
      className="w-full text-left border rounded-xl p-4 disabled:opacity-50">{org.name} · {org.status}</button>)}
    {!organizations.length && <p>Ask your organization administrator for a join code or invitation.</p>}
    <form onSubmit={(e) => { e.preventDefault(); act(async () => {
      await authApi.joinOrg({ join_code: code, student_id: studentId || undefined });
      await refreshSession();
    }); }} className="space-y-3 border rounded-xl p-5">
      <h2 className="font-semibold">Join an organization</h2>
      <input aria-label="Join code" placeholder="Organization join code" required maxLength={32}
        value={code} onChange={(e) => setCode(e.target.value)} className="w-full border rounded-lg p-3" />
      <input aria-label="Student ID" placeholder="Student ID (optional)" maxLength={80}
        value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full border rounded-lg p-3" />
      <button disabled={busy} className="bg-teal-600 text-white rounded-xl px-5 py-3">Join</button>
    </form>
    {isPlatformAdmin() && <Link to="/platform" className="text-purple-700">Platform administration</Link>}
    <button onClick={async () => { try { await logout(); navigate("/login"); } catch (err) { setError(err.message); } }}
      className="block text-sm text-slate-600">Sign out</button>
  </div>;
}
