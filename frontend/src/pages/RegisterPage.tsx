import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, api } from "../api/client";
import { emailError, fullNameError, passwordError } from "../lib/validation";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; password?: string; server?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { email: emailError(email) ?? undefined, fullName: fullNameError(fullName) ?? undefined, password: passwordError(password) ?? undefined };
    setErrors(next);
    if (next.email || next.fullName || next.password) return;
    setBusy(true);
    try { await api.register({ email: email.trim().toLowerCase(), password, full_name: fullName.trim() }); navigate("/login", { state: { registered: true } }); }
    catch (error) { setErrors({ server: error instanceof ApiError && error.status === 409 ? "An account with this email already exists." : error instanceof ApiError ? error.message : "Could not create your account. Try again." }); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
    <Link to="/" className="text-xl font-black tracking-tight text-indigo-600">The Wheel Deal</Link>
    <h1 className="mt-8 text-3xl font-bold text-slate-950">Create your account</h1>
    <p className="mt-2 text-slate-500">Your next set of wheels is waiting.</p>
    <form onSubmit={submit} noValidate className="mt-8 space-y-5">
      <label className="block text-sm font-semibold text-slate-700">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500" /></label>{errors.fullName && <p role="alert" className="text-sm text-red-600">{errors.fullName}</p>}
      <label className="block text-sm font-semibold text-slate-700">Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500" /></label>{errors.email && <p role="alert" className="text-sm text-red-600">{errors.email}</p>}
      <label className="block text-sm font-semibold text-slate-700">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500" /></label>{errors.password && <p role="alert" className="text-sm text-red-600">{errors.password}</p>}
      {errors.server && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.server}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link className="font-bold text-indigo-600" to="/login">Sign in</Link></p>
  </div></main>;
}
