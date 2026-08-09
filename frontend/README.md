# Restaurant Scraping Platform — Frontend

Web interface for the Restaurant Scraping Platform.

The frontend allows users to submit public restaurant URLs for scraping and interact with the asynchronous scraping backend.

The application communicates with the NestJS backend API.

## Tech Stack

- Next.js
- React
- TypeScript

---

## Application Flow

```text
User
 |
 v
Next.js Frontend
 |
 | Submit restaurant URLs
 v
NestJS Backend
 |
 v
Scraping Operation Created
 |
 v
Background Worker
 |
 v
Restaurant Data
 |
 v
Frontend displays the result
```

The frontend does not perform web scraping itself.

All scraping, queue processing, normalization, and database work are handled by the backend.

---

## Supported Restaurant Sources

The backend currently supports restaurant URLs from:

```text
TripAdvisor
OpenTable
```

---

## Requirements

Install:

```text
Node.js
npm
```

The backend must also be running for API functionality.

By default:

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:3001
```

---

## Installation

Enter the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create:

```text
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Do not store sensitive server credentials in frontend environment variables.

Variables beginning with:

```text
NEXT_PUBLIC_
```

are accessible in the browser.

---

## Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Production Build

Create the production build:

```bash
npm run build
```

Run it:

```bash
npm start
```

---

## Backend API

The frontend communicates with the following backend endpoints.

### Submit URLs

```http
POST /v1/scraping-operations
```

Example:

```json
{
  "urls": [
    "https://www.opentable.com/r/rooh-palo-alto"
  ]
}
```

The backend returns an operation ID.

The frontend can use this ID to track the asynchronous scraping process.

---

### Operation Status

```http
GET /v1/scraping-operations/:operationId
```

Used to retrieve:

```text
Operation status
Tasks
Successful tasks
Failed tasks
Processing state
```

---

### Operation Results

```http
GET /v1/scraping-operations/:operationId/results
```

Returns successfully scraped restaurant data.

---

### Restaurant Details

```http
GET /v1/restaurants/:restaurantId
```

Returns one stored restaurant.

---

## Expected User Flow

```text
1. User opens the frontend
        |
        v
2. User enters one or more restaurant URLs
        |
        v
3. Frontend submits URLs to backend
        |
        v
4. Backend returns operation ID
        |
        v
5. Frontend checks operation status
        |
        v
6. Background scraping completes
        |
        v
7. Frontend requests results
        |
        v
8. Restaurant information is displayed
```

---

## Restaurant Data

Depending on what the source platform provides, restaurant results may contain:

```text
Name
Address
Coordinates
Cuisine
Rating
Review count
Price range
Opening hours
Phone number
Website
Images
Menu
Description
Features
Source platform
Last scraped date
```

---

## Error Handling

The backend returns structured API errors.

Example:

```json
{
  "statusCode": 422,
  "code": "UNSUPPORTED_PLATFORM",
  "message": "The URL does not belong to a supported restaurant platform.",
  "requestId": "REQUEST_ID"
}
```

The frontend should display an appropriate message instead of exposing raw server errors.

---

## Development

Run the frontend:

```bash
npm run dev
```

Run checks before committing:

```bash
npm run lint
npm run build
```

---

## Backend Connection

Make sure the NestJS backend is running before testing scraping functionality.

Example:

```text
Frontend
localhost:3000

        ↓ HTTP

Backend
localhost:3001
```

The backend CORS configuration must allow the frontend origin.

For local development this is normally:

```env
FRONTEND_ORIGIN=http://localhost:3000
```

---

## Security

The frontend must never contain:

```text
MongoDB credentials
Redis credentials
Private API keys
Backend secrets
```

Only public frontend configuration should use `NEXT_PUBLIC_*` environment variables.

---

## License

This frontend is part of the Restaurant Scraping Platform project.