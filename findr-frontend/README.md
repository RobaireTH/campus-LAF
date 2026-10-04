# Findr – Campus Lost & Found (frontend)

Plain HTML, CSS and vanilla JavaScript. No build step, no dependencies.

## Run it
- Open `index.html` in a browser, or
- In VS Code, right-click `index.html` → **Open with Live Server**.

Demo login (from the Figma): `tobi.a@student.oauife.edu.ng` with any password.
Reset mock data: run `Findr.api.reset()` in the browser console.

## Folder structure
```
index.html                  Temporary list of screens (delete when a real home page exists)
pages/                      One HTML file per screen
  register.html  login.html  verify-id.html        <- Mike
css/
  tokens.css                Colors, fonts, spacing (the design system, David)
  base.css                  Reset + typography
  components.css            SHARED: buttons, inputs, checkbox, chip, stepper, toast, app bar
  components-upload.css     SHARED: image upload box
  pages/auth.css  verify-id.css                    <- Mike
js/
  config.js                 Routes + settings (edit routes here)
  core/validators.js        SHARED: validation rules
  core/ui.js                SHARED: toast, button loading, form validation
  core/mock-api.js          FAKE backend (replace later)
  components/image-upload.js  SHARED: upload + preview
  pages/register.js  login.js  verify-id.js        <- Mike
```
Rule of thumb: anything in `components*.css`, `core/` or `components/` is shared, so reuse it
rather than copying it. Anything in `pages/` belongs to one screen.

## Frontend-only for now
All data is faked in `js/core/mock-api.js` (localStorage). Passwords are not stored or checked.
Photos are previewed in the browser and never uploaded.

## To connect to the backend
Replace each function in `mock-api.js` with a `fetch()` call, keeping the same inputs and outputs:

| Function | Suggested endpoint | Notes |
|---|---|---|
| `Findr.api.register` | `POST /auth/register` | Reject with code `EMAIL_TAKEN` for duplicates |
| `Findr.api.login` | `POST /auth/login` | `NO_ACCOUNT` / `INVALID_CREDENTIALS` errors; `remember` controls session length |
| `Findr.api.requestMagicLink` | `POST /auth/magic-link` | Send the email |
| `Findr.api.submitVerification` | `POST /verification` | multipart: `idFront`, `selfie`; returns `{ status }` |

Also still to do: the "Forgot password?" screen, a real redirect after login (`routes.home` in
`config.js`), email verification after register if wanted, and server-side validation.
