# Vendor Service

Vendor service for the Okkazo platform - Manages vendor registrations, applications, and profiles.

## Features

- Vendor registration application processing via Kafka
- Document management and verification
- Application status tracking
- Integration with Eureka service discovery
- MongoDB for data persistence

## Tech Stack

- Node.js & Express.js
- MongoDB & Mongoose
- Kafka (Event-driven architecture)
- Eureka (Service discovery)
- Cloudinary (Document storage)

## API Endpoints

### Public Endpoints

- `GET /health` - Health check

### Protected Endpoints (Require Authentication)

- `GET /api/vendor/registration/status/:applicationId` - Get application status
- `POST /api/vendor/registration/:applicationId/documents` - Upload additional documents

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the service:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for required configuration.

## Kafka Events

### Consumed Topics
- `vendor_events` - Vendor registration submissions from auth-service

### Event Types
- `VENDOR_REGISTRATION_SUBMITTED` - New vendor application submitted
