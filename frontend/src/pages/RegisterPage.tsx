import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, api } from "../api/client";
import { AuthLayout } from "../components/AuthLayout";
import { FormField } from "../components/FormField";
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
    const next = {
      email: emailError(email) ?? undefined,
      fullName: fullNameError(fullName) ?? undefined,
      password: passwordError(password) ?? undefined,
    };
    setErrors(next);
    if (next.email || next.fullName || next.password) return;
    setBusy(true);
    try {
      await api.register({ email: email.trim().toLowerCase(), password, full_name: fullName.trim() });
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      setErrors({
        server:
          error instanceof ApiError && error.status === 409
            ? "An account with this email already exists."
            : error instanceof ApiError
              ? error.message
              : "Could not create your account. Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your next set of wheels is waiting."
      footer={
        <>
          Already registered?{" "}
          <Link className="font-bold text-stone-950 underline dark:text-stone-50 underline-offset-4" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <FormField label="Full name" name="full_name" error={errors.fullName}>
          {(control) => (
            <input
              {...control}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              className="input"
            />
          )}
        </FormField>
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
        <FormField label="Password" name="password" error={errors.password} hint="At least 8 characters.">
          {(control) => (
            <input
              {...control}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              className="input"
            />
          )}
        </FormField>
        {errors.server && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errors.server}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
