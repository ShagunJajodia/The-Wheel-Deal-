import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { FormField } from "../components/FormField";
import { emailError, passwordError } from "../lib/validation";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; server?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { email: emailError(email) ?? undefined, password: passwordError(password) ?? undefined };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/");
    } catch (error) {
      setErrors({ server: error instanceof ApiError ? error.message : "Could not sign in. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to find your next ride."
      footer={
        <>
          New here?{" "}
          <Link className="font-bold text-stone-950 underline underline-offset-4" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <FormField label="Email" name="email" error={errors.email}>
          {(control) => (
            <input
              {...control}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="input"
            />
          )}
        </FormField>
        <FormField label="Password" name="password" error={errors.password}>
          {(control) => (
            <input
              {...control}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="input"
            />
          )}
        </FormField>
        {errors.server && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {errors.server}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
