import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("shows email and password errors before calling the API", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/valid email/i)).toBeTruthy();
    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy();
  });
});
