# Restaurant Scraping Platform — Backend

Backend service for an asynchronous restaurant scraping platform.

The service accepts public restaurant URLs, validates them, identifies the correct source platform, creates scraping tasks, processes them asynchronously using BullMQ workers, normalizes the extracted restaurant data, and stores the final result in MongoDB.

## Supported Platforms

Currently supported restaurant platforms:

- TripAdvisor
- OpenTable

The scraper architecture uses separate adapters for each platform, which makes it possible to add more restaurant sources later without changing the main application flow.

---

## Tech Stack

- NestJS
- TypeScript
- MongoDB
- Mongoose
- Redis
- BullMQ
- Cheerio
- Undici
- Joi
- Swagger
- Jest

---

## Architecture

The API does not perform scraping directly inside the HTTP request.

Scraping is handled asynchronously.

```text
Client
  |
  v
NestJS API
  |
  v
Scraping Operation
  |
  v
Scraping Tasks
  |
  v
BullMQ
  |
  v
Redis
  |
  v
Worker
  |
  v
Platform Adapter
  |
  +---- TripAdvisor Adapter
  |
  +---- OpenTable Adapter
  |
  v
Restaurant Normalizer
  |
  v
MongoDB
```

This architecture keeps API requests fast and allows scraping workers to run independently.

---

## Main Flow

When restaurant URLs are submitted:

1. The API receives one or more URLs.
2. Each URL is validated.
3. The scraper registry determines which platform owns the URL.
4. The URL is converted to a canonical URL.
5. Duplicate URLs inside the same request are detected.
6. A scraping operation is created.
7. A scraping task is created for every accepted URL.
8. Tasks are published to BullMQ.
9. Redis stores the queue jobs.
10. A worker receives each task.
11. The correct platform adapter is selected.
12. The platform policy is checked before fetching.
13. The restaurant page is downloaded.
14. Restaurant information is extracted.
15. The raw data is normalized.
16. The restaurant is inserted or updated in MongoDB.
17. The task status is updated.
18. The overall scraping operation status is updated.

---

## Project Structure

```text
src/
├── common/
│   ├── contracts
│   └── shared HTTP/error utilities
│
├── config/
│   └── environment validation
│
├── health/
│   ├── health.controller.ts
│   └── health.module.ts
│
├── operations/
│   ├── dto/
│   ├── operations.controller.ts
│   ├── operations.service.ts
│   ├── scraping-task-processor.service.ts
│   └── operations.module.ts
│
├── queue/
│   ├── queue.constants.ts
│   ├── queue-publisher.service.ts
│   └── queue.module.ts
│
├── restaurants/
│   ├── restaurants.controller.ts
│   ├── restaurants.service.ts
│   └── restaurants.module.ts
│
├── schema/
│   └── schemas.ts
│
├── scraping/
│   ├── scraping-core.service.ts
│   ├── tripadvisor.adapter.ts
│   └── opentable.adapter.ts
│
├── app.module.ts
├── main.ts
└── worker.ts
```

---

## Core Components

### Scraper Registry

The scraper registry receives a restaurant URL and determines which adapter supports it.

Example:

```text
TripAdvisor URL
      |
      v
TripAdvisorAdapter
```

or:

```text
OpenTable URL
      |
      v
OpenTableAdapter
```

It is also responsible for rejecting unsupported platforms and invalid URLs.

---

### Platform Adapters

Each supported platform has its own adapter.

An adapter is responsible for:

```text
Checking whether it supports a URL
        |
        v
Creating the canonical URL
        |
        v
Extracting the external restaurant ID
        |
        v
Downloading/parsing restaurant information
        |
        v
Returning RawRestaurant
```

The rest of the application does not need to know how each website structures its HTML.

---

### Restaurant Normalizer

Different restaurant websites return data in different formats.

The normalizer converts them into one common format.

For example:

```text
TripAdvisor data
        \
         \
          ---> NormalizedRestaurant
         /
OpenTable data
```

Normalized restaurant data can include:

```text
name
address
location
cuisines
rating
review count
price range
opening hours
phone
website
images
menu sections
description
features
source platform
adapter version
last scraped date
content hash
```

---

## Scraping Operations

A scraping operation represents one request containing one or more restaurant URLs.

Example:

```text
Operation
│
├── Task 1 → TripAdvisor Restaurant
├── Task 2 → OpenTable Restaurant
└── Task 3 → OpenTable Restaurant
```

Possible operation statuses:

```text
QUEUING
PROCESSING
SUCCEEDED
PARTIALLY_SUCCEEDED
FAILED
```

---

## Scraping Tasks

Each accepted restaurant URL becomes one scraping task.

Possible statuses:

```text
PENDING
   |
   v
QUEUED
   |
   v
PROCESSING
   |
   +--------> SUCCEEDED
   |
   +--------> FAILED
```

A task may also become:

```text
DEDUPLICATED
```

when duplicate-task handling is used.

---

## Queue System

BullMQ and Redis are used for asynchronous processing.

The project uses separate queues for each platform:

```text
scrape:tripadvisor
scrape:opentable
```

This allows platform-specific concurrency and rate limiting.

A queue job contains the MongoDB scraping task ID:

```json
{
  "taskId": "TASK_OBJECT_ID"
}
```

The worker uses that ID to retrieve the task from MongoDB and process it.

---

## Retry Strategy

Temporary failures may be retried automatically.

Examples of retryable problems:

```text
Network timeout
HTTP 429 rate limiting
Temporary upstream server errors
```

Non-retryable errors include things such as:

```text
Invalid URL
Unsupported platform
Missing restaurant page
Policy restriction
Bot-protection page
Parsing failure that is not expected to recover automatically
```

Queue jobs can use exponential backoff between retry attempts.

---

## Scraping Policy

Before fetching supported pages, the scraper checks the target website's `robots.txt`.

The project does not attempt to bypass CAPTCHA or bot-protection systems.

If a platform returns a bot-protection page, the scraping task fails with a diagnosable error instead of attempting to circumvent the protection.

---

## Restaurant Storage

Restaurant documents are identified primarily using:

```text
platform + externalId
```

Example:

```text
OPENTABLE + rooh-palo-alto
```

When scraping the same restaurant again, the existing restaurant is updated instead of creating a duplicate record.

This is handled using an upsert operation.

---

## Environment Variables

Create:

```text
backend/.env
```

Example:

```env
NODE_ENV=development

PORT=3001

LOG_LEVEL=info

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@HOST/restaurant_scraping

REDIS_URL=redis://localhost:6379

SWAGGER_ENABLED=true

FRONTEND_ORIGIN=http://localhost:3000

SCRAPING_HTTP_TIMEOUT_MS=20000

SCRAPING_CONNECT_TIMEOUT_MS=5000

TRIPADVISOR_CONCURRENCY=2

TRIPADVISOR_REQUESTS_PER_MINUTE=20

OPENTABLE_CONCURRENCY=2

OPENTABLE_REQUESTS_PER_MINUTE=20
```

Never commit the real `.env` file.

The repository should contain an `.env.example` file instead.

---

## Installation

Enter the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

---

## Running the API

Development mode:

```bash
npm run start:dev
```

Normal mode:

```bash
npm run start
```

Production mode:

```bash
npm run start:prod
```

By default the backend runs on:

```text
http://localhost:3001
```

---

## Running the Worker

The worker processes scraping jobs separately from the HTTP API.

After building the application:

```bash
npm run build
```

run:

```bash
node dist/worker
```

The API and worker can therefore run as separate processes:

```text
Terminal 1
API

Terminal 2
Worker
```

---

## Health Endpoints

### Liveness

```http
GET /health/live
```

Checks whether the backend process itself is running.

Example response:

```json
{
  "status": "ok"
}
```

### Readiness

```http
GET /health/ready
```

Checks whether the application is ready to serve requests and verifies its infrastructure dependencies.

Example:

```json
{
  "status": "ok",
  "mongo": "ready",
  "redis": "ready"
}
```

---

## API Endpoints

### Submit Scraping Operation

```http
POST /v1/scraping-operations
```

Example request:

```json
{
  "urls": [
    "https://www.opentable.com/r/rooh-palo-alto",
    "https://www.tripadvisor.com/Restaurant_Review-..."
  ]
}
```

The API validates the URLs, creates an operation and creates one task per accepted URL.

The request does not wait for scraping to finish.

---

### Get Scraping Operation

```http
GET /v1/scraping-operations/:operationId
```

Returns information about the operation and its tasks.

The operation can be used to monitor scraping progress.

---

### Get Operation Results

```http
GET /v1/scraping-operations/:operationId/results
```

Returns restaurants successfully produced by the scraping operation.

---

### Get Restaurant

```http
GET /v1/restaurants/:restaurantId
```

Returns a normalized restaurant stored in MongoDB.

---

## Swagger

When:

```env
SWAGGER_ENABLED=true
```

Swagger documentation is available at:

```text
http://localhost:3001/api/docs
```

---

## Error Format

API errors use a common response format.

Example:

```json
{
  "statusCode": 404,
  "code": "RESTAURANT_NOT_FOUND",
  "message": "Restaurant was not found.",
  "requestId": "REQUEST_ID"
}
```

The `requestId` helps identify and trace requests in logs.

---

## Main Error Codes

Examples include:

```text
INVALID_URL
UNSUPPORTED_PLATFORM
OPERATION_NOT_FOUND
RESTAURANT_NOT_FOUND

DISALLOWED_BY_POLICY
SOURCE_NOT_FOUND
RATE_LIMITED
BOT_PROTECTION
NETWORK_TIMEOUT
UPSTREAM_ERROR
PARSING_FAILED
DATABASE_ERROR
INTERNAL_ERROR
```

---

## Request IDs

Every API request receives an `x-request-id`.

If the client already provides one, the backend can reuse it.

Otherwise, the backend generates a UUID.

The same request ID is returned in the response and can be used for troubleshooting.

---

## Database

MongoDB stores three main types of documents:

### Restaurants

Contains normalized restaurant information.

### Scraping Operations

Represents a complete scraping request.

### Scraping Tasks

Represents individual restaurant URLs processed as part of an operation.

Relationship:

```text
ScrapingOperation
       |
       | one-to-many
       v
ScrapingTask
       |
       | successful task references
       v
Restaurant
```

---

## MongoDB Indexes

Indexes are used to improve common queries and prevent unwanted duplicates.

Examples include:

```text
operationId
status + createdAt
operationId + canonicalUrl
canonicalUrl + status
```

The task schema can also prevent duplicate canonical URLs inside the same operation.

---

## Testing

Run ESLint:

```bash
npm run lint
```

Build the project:

```bash
npm run build
```

Run unit tests:

```bash
npm test
```

Run E2E tests:

```bash
npm run test:e2e
```

Run coverage:

```bash
npm run test:cov
```

---

## Current Verification

The project has been verified using:

```text
npm run lint  ✅
npm run build ✅
npm test      ✅
```

---

## Security Notes

Sensitive credentials must never be committed to the repository.

Do not commit:

```text
.env
MongoDB passwords
Redis credentials
API secrets
```

Use environment variables for all sensitive configuration.

---

## Adding Another Restaurant Platform

The project is designed so another restaurant source can be added without rewriting the entire scraping system.

A new platform generally requires:

```text
1. Add the platform to Platform enum
2. Create a new ScraperAdapter
3. Implement supports()
4. Implement canonicalize()
5. Implement scrape()
6. Register the adapter
7. Add/configure its queue if separate processing is needed
```

The adapter should still return the common `RawRestaurant` structure.

---

## Design Goals

The backend is designed around:

```text
Asynchronous processing
Clear separation of responsibilities
Platform-specific adapters
Reusable normalized restaurant format
Durable tasks
Retryable background jobs
MongoDB persistence
Horizontal worker scaling
Safe failure handling
```

---

## License

This repository is intended for the Restaurant Scraping Platform project.