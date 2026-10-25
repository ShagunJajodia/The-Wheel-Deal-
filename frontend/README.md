# The Wheel Deal frontend

React, TypeScript, Vite, Tailwind CSS v4, React Router, and TanStack Query.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_URL` to the backend origin; it defaults to `http://localhost:8000`. The API must allow the frontend origin through CORS. Run `npm test` for the UI tests and `npm run build` for a production bundle.

Access tokens are stored in `localStorage` to send `Authorization: Bearer` across frontend and API domains. This keeps the cross-domain setup simple, but JavaScript can read the token if the page suffers an XSS issue. Serve both sites over HTTPS and avoid injecting untrusted HTML. An `httpOnly`, secure cookie would reduce token exposure if the API is later configured for cross-site credentials and CSRF protection.
