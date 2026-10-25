import type { ReactNode } from "react";
import { Link } from "react-router";

import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

/** Shared frame for the sign-in and register pages: dark header, light page, one card. */
export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-page dark:bg-stone-950">
      <header className="on-dark bg-showroom text-white dark:border-b dark:border-stone-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="rounded-lg">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-3xl font-bold text-stone-950 dark:text-stone-50">{title}</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">{footer}</p>
        </div>
      </main>
    </div>
  );
}
