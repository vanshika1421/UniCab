# Campus Carpooling / Ride-Sharing System Backend

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

---

This README will be updated as features are implemented.
