# GhostAir — Auth Backend

<p align="left">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-bf2829?style=flat-square" alt="Node >= 18" />
  <img src="https://img.shields.io/badge/framework-Express-bf2829?style=flat-square" alt="Express" />
  <img src="https://img.shields.io/badge/database-MongoDB-bf2829?style=flat-square" alt="MongoDB" />
  <img src="https://img.shields.io/badge/email-Resend-bf2829?style=flat-square" alt="Resend" />
  <img src="https://img.shields.io/badge/auth-JWT-bf2829?style=flat-square" alt="JWT" />
  <img src="https://img.shields.io/badge/license-MIT-bf2829?style=flat-square" alt="MIT" />
</p>

A hardened Node.js + Express + MongoDB authentication backend. Bearer JWT with rotating refresh
tokens, hashed OTPs for email verification and password reset, per-account lockout, and rate
limits at every entry point.

> **Frontend integration reference:** the full consumer-facing API docs live at [`docs/index.html`](docs/index.html)
> and are ready to publish with GitHub Pages (`Settings → Pages → Source: main / /docs`).

---

## Table of contents

- [Features](#features)
- [Getting started](#getting-started)
- [Endpoints](#endpoints)
- [Response format](#response-format)
- [Password policy](#password-policy)
- [Transactional emails](#transactional-emails)
- [Security notes](#security-notes)

---

## Features

- **Registration** with `firstName`, `lastName`, optional `name`, `email`, `password`, `confirmPassword`.
- **Strong password policy** — min 8 chars, upper + lower + number + special, blocks common passwords, no whitespace, max 128.
- **Password strength meter** (`POST /password-strength`) — returns `weak | fair | medium | strong | very-strong` with specific improvement suggestions.
- **Email verification** via 6-digit OTP (SHA-256 hashed, 10-min expiry, max 5 attempts, 60-second resend cooldown).
- **Login** with account lockout after 5 failed attempts (15-minute lock) and per-email rate limiting.
- **JWT auth** — short-lived access token (15m) + rotating refresh token (7d), stored as `HttpOnly` cookies and returned in the response body.
- **Forgot / reset password** via OTP; new password must differ from current; all sessions revoked on reset.
- **Change password** for logged-in users, invalidating other sessions.
- **Security hardening** — `helmet`, CORS whitelist, `express-mongo-sanitize`, `xss-clean`, `hpp`, 10 KB JSON body cap, generic responses that don't leak account existence, timing-safe OTP comparison, bcrypt-hashed refresh tokens.
- **Rate limiting** — global + per-route (register / verify / login / reset / OTP-resend) with `express-rate-limit`.
- **Consistent envelope** — every endpoint returns `{ success, message, data | details }`.
- **Transactional email via Resend** with branded HTML templates.

---

## Getting started

```bash
cp .env.example .env      # fill MONGO_URI + three JWT secrets (32+ chars each)
npm install
npm run dev
```

Leaving `RESEND_API_KEY` empty in development logs outgoing emails — OTPs included — to the
process stdout, so you can run the full flow without a Resend account.

**Required env vars** (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Access-token signing secret (≥ 64 chars in production) |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_RESET_SECRET` | Reserved for signed reset artifacts |
| `RESEND_API_KEY` | Resend API key (optional in dev) |
| `EMAIL_FROM` | Verified sender on your Resend domain |
| `APP_URL` | Frontend origin — used to build links inside email templates |
| `CORS_ORIGIN` | Comma-separated frontend origins |

---

## Endpoints

Base URL: `/api/v1/auth`

| Method | Path                   | Auth   | Body                                                              | Purpose |
|--------|------------------------|--------|-------------------------------------------------------------------|---------|
| POST   | `/register`            | –      | `firstName, lastName, name?, email, password, confirmPassword`    | Create account and send verification OTP |
| POST   | `/verify-email`        | –      | `email, otp`                                                      | Verify email using OTP |
| POST   | `/resend-verification` | –      | `email`                                                           | Send a fresh verification OTP |
| POST   | `/login`               | –      | `email, password`                                                 | Log in (returns tokens + sets cookies) |
| POST   | `/refresh`             | –      | `refreshToken?` (or cookie)                                       | Rotate access + refresh tokens |
| POST   | `/logout`              | Bearer | –                                                                 | Revoke the current session |
| POST   | `/forgot-password`     | –      | `email`                                                           | Send password reset OTP (generic response) |
| POST   | `/reset-password`      | –      | `email, otp, password, confirmPassword`                           | Reset password using OTP |
| POST   | `/change-password`     | Bearer | `currentPassword, newPassword, confirmPassword`                   | Change password (revokes sessions) |
| GET    | `/me`                  | Bearer | –                                                                 | Current user profile |
| POST   | `/password-strength`   | –      | `password`                                                        | Live strength evaluation |

Utility:

| Method | Path              | Purpose |
|--------|-------------------|---------|
| GET    | `/api/v1/health`  | Service health / uptime |

---

## Response format

**Success**

```json
{ "success": true, "message": "Logged in successfully", "data": { "...": "endpoint-specific payload" } }
```

**Error**

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Please provide a valid email address" }]
}
```

---

## Password policy

- 8–128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (`!@#$%^&*(),.?":{}|<>_\-+=[]/\``~;'`)
- No whitespace
- Not present in the built-in weak-password list

Errors always name the specific rules that failed, e.g.

> Password is too weak. It must contain: at least one uppercase letter (A-Z), at least one number (0-9).

---

## Transactional emails

Sent via [Resend](https://resend.com) with branded HTML templates (accent `#bf2829`):

| Trigger | Subject |
|---------|---------|
| Register / resend verification | `Your GhostAir verification code` |
| Forgot password | `Reset your GhostAir password` |
| Reset / change password (confirmation) | `Your GhostAir password was changed` |

Live rendered previews are embedded in the [docs page](docs/index.html#emails).

---

## Security notes

- Access tokens live 15 minutes; refresh tokens 7 days, rotated on every `/refresh`.
- Refresh tokens are stored bcrypt-hashed on the user record — reuse of an invalidated token clears the session.
- 5 wrong passwords in a row locks the account for 15 minutes; the response tells the user how long to wait.
- Login rate limiter is keyed by `ip + email`, with per-account lockout as the backstop for distributed attacks.
- `/forgot-password` returns the same 200 response whether or not the email exists, preventing user enumeration.
- OTPs are SHA-256 hashed at rest and compared in constant time.
- Cookies are `HttpOnly` always, `Secure` and `SameSite=Strict` in production.
