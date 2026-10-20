# Place4U

Place4U is a relocation assistance and tenant–property matching platform designed to simplify the process of finding accommodation.

## Documentation
- [Business Requirements Document](docs/BRD.md)
- [Implementation Steps](docs/IMPLEMENTATION_STEPS.md)

## Getting Started
```bash
npm install
npm run dev
```

## Auth redirect URLs (Supabase dashboard — required)

The SPA cannot configure these itself, and getting them wrong is silent: Supabase
**only** honours a `redirectTo` that is on the project's allowlist, and otherwise
falls back to the project's **Site URL** without raising an error. A Google
sign-in then returns to `https://place4u.xyz/#` instead of `/auth/callback`, so
the role lookup there never runs.

In **Authentication → URL Configuration**:

- **Site URL**: `https://place4u.xyz`
- **Redirect URLs** (add every environment you deploy or develop on):
  - `https://place4u.xyz/auth/callback`
  - `https://place4u.xyz/reset-password`
  - `http://localhost:1337/auth/callback`
  - `http://localhost:1337/reset-password`
  - plus the equivalent entries for any Vercel/Netlify preview or UAT origin

These same rules apply to the email **confirmation** and **password recovery**
links (`emailRedirectTo`), which break in the same silent way.

> The app also ships a client-side safety net (`src/utils/authReturn.js` +
> `RoleOnboardingGate` in `src/App.jsx`): if a provider still returns to a public
> page, the session is detected and the user is routed to the portal their role
> in `public.users` belongs to. That is a fallback — fix the allowlist as well.

