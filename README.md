# GhostAir — Auth Backend

A hardened Node.js + Express + MongoDB authentication backend.

## Features

- **Registration** with `firstName`, `lastName`, optional `name`, `email`, `password`, `confirmPassword`.
- **Strong password policy**: min 8 chars, upper + lower + number + special, blocks common passwords, no whitespace, max 128.
- **Password strength meter** (`POST /password-strength`) — returns `weak | fair | medium | strong | very-strong` and specific improvement suggestions.
- **Email verification** via 6-digit OTP (hashed, 10-min expiry, max 5 attempts, resend cooldown).
- **Login** with account lockout after 5 failed attempts (15-minute lock) and per-email rate limiting.
- **JWT auth**: short-lived access token (15m) + rotating refresh token (7d), stored as HttpOnly cookies and returned in body.
- **Forgot password / reset password** via OTP; new password must differ from current.
- **Change password** for logged-in users (invalidates existing sessions).
- **Security hardening**: `helmet`, CORS whitelist, `express-mongo-sanitize`, `xss-clean`, `hpp`, JSON body size limits, generic error messages that don't leak user existence, timing-safe OTP comparison, bcrypt-hashed refresh tokens.
- **Rate limiting**: global + per-route (register/verify/login/reset/otp) with `express-rate-limit`.
- **Consistent responses**: every endpoint returns `{ success, message, data|details }`.

## Getting started

```bash
cp .env.example .env      # fill in MONGO_URI + JWT secrets (32+ chars each)
npm install
npm run dev
```

Leaving `SMTP_HOST` empty in dev prints emails (including OTPs) to the console — handy for local testing.

## Endpoints

Base: `/api/v1/auth`

| Method | Path                  | Auth | Body                                                        | Purpose |
|--------|-----------------------|------|-------------------------------------------------------------|---------|
| POST   | `/register`           | -    | `firstName, lastName, name?, email, password, confirmPassword` | Create account + send verification OTP |
| POST   | `/verify-email`       | -    | `email, otp`                                                | Verify email using OTP |
| POST   | `/resend-verification`| -    | `email`                                                     | Resend verification OTP |
| POST   | `/login`              | -    | `email, password`                                           | Login (returns tokens + sets cookies) |
| POST   | `/refresh`            | -    | `refreshToken?` (or cookie)                                 | Rotate access + refresh tokens |
| POST   | `/logout`             | Bearer | -                                                         | Revoke session |
| POST   | `/forgot-password`    | -    | `email`                                                     | Send password reset OTP (generic response) |
| POST   | `/reset-password`     | -    | `email, otp, password, confirmPassword`                     | Reset password using OTP |
| POST   | `/change-password`    | Bearer | `currentPassword, newPassword, confirmPassword`           | Change password (revokes sessions) |
| GET    | `/me`                 | Bearer | -                                                         | Current user profile |
| POST   | `/password-strength`  | -    | `password`                                                  | Live strength evaluation |

Utility:

| GET | `/api/v1/health` | Service health/uptime |

## Response format

**Success**
```json
{ "success": true, "message": "Logged in successfully", "data": { ... } }
```

**Error**
```json
{ "success": false, "message": "Validation failed", "details": [{ "field": "email", "message": "Please provide a valid email address" }] }
```

## Password policy

Requirements:
- At least 8 characters (up to 128)
- At least one uppercase (A-Z)
- At least one lowercase (a-z)
- At least one number (0-9)
- At least one special character (`!@#$%^&*(),.?":{}|<>_\-+=[]/\``~;'`)
- No whitespace
- Not a commonly used/breached password

Errors clearly list which requirements failed, e.g.:
> Password is too weak. It must contain: at least one uppercase letter (A-Z), at least one number (0-9).

## Security notes

- Access tokens = 15 min; refresh tokens = 7 days, rotated on each `/refresh`.
- Refresh tokens are stored bcrypt-hashed on the user record; reuse of an invalidated token clears the session.
- Login failures increment an attempt counter; 5 failures lock the account for 15 minutes.
- Login limiter is keyed by `ip + email` so one attacker can't burn a victim's quota by spraying different IPs from a botnet — though a real attacker will bypass IP limiting, so per-account lockout is the backstop.
- Forgot-password endpoint returns the same response whether or not the email exists, to prevent user enumeration.
- All OTPs are stored as SHA-256 hashes and compared in constant time.
- Cookies are `HttpOnly`, `Secure` in production, `SameSite=Strict` in production.

## Suggested production checklist

- Set `NODE_ENV=production` and generate long random JWT secrets (>= 64 chars).
- Put behind HTTPS with `trust proxy` matching your load balancer hop count.
- Use a managed Mongo (Atlas) with IP allowlist + strong password.
- Configure a real SMTP provider (Resend, SES, Postmark, Sendgrid).
- Tighten `CORS_ORIGIN` to your frontend origins only.
- Monitor 4xx/5xx rates and lockout events for abuse patterns.
