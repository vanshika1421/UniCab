# UniCab

This project is a Node.js + Express backend for a campus carpooling/ride-sharing system. It features MongoDB for data storage, JWT authentication, WebSocket for live ride updates, and role-based access (driver, rider).

## Features
- Students create ride offers (from → to, time, seats, cost)
- Search and join rides
- Prevent overbooking (middleware validation)
- Live ride status updates (WebSocket)
- Analytics: most used routes, busy times

## Tech Stack
- Backend: Node.js + Express
- Database: MongoDB
- Auth: JWT + role-based
- Real-time: WebSocket

## Folder Structure
- `models/` - Mongoose models
- `routes/` - Express route handlers
- `controllers/` - Business logic
- `middleware/` - Auth, validation, etc.
- `utils/` - Utility functions
- `config/` - Configuration files

## Getting Started
1. Install dependencies: `npm install`
2. Set up `.env` with MongoDB and JWT secrets
3. Start server: `npm run dev`

## Running background services

- Start Redis (required for pub/sub and the queue). Example (Docker):

```powershell
docker run -p 6379:6379 redis:latest
```

- Start the WebSocket service (optional for real-time client updates):

```powershell
npm run start:ws
```

- Start the notification worker (processes background jobs and sends emails):

```powershell
npm run start:worker
```

## Email notifications (drivers)

The notification worker can send emails when a rider books a ride. Configure SMTP settings in your environment (or in a `.env` file):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FROM_EMAIL=unicab@example.com   # optional
```

Install the email dependency (already added to `package.json`):

```powershell
npm install
```

To test a booking notification job without interacting with the UI, run:

```powershell
npm run test:notify          # optional args: bookingId rideId riderId
npm run test:notify myB myR myU
```

The worker will attempt to send an email to the ride's driver email (falls back to the ride `contact` field if no user email). If SMTP is not configured the worker will log a warning and skip sending email.

---

This README will be updated as features are implemented.
