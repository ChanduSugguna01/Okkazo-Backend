# Auth Service - JWT Authentication with Spring Boot

This is a complete authentication service implementation using Spring Boot with JWT token authentication, email verification, password reset functionality, and Kafka event integration with Node.js email service.

## Features

✅ **User Registration** with email verification
✅ **Login** with JWT access & refresh tokens
✅ **Email Verification** via token
✅ **Resend Verification Email**
✅ **Forgot Password** functionality
✅ **Reset Password** with token validation
✅ **Refresh Token** rotation
✅ **Comprehensive Edge Case Handling**
✅ **Kafka Event Integration** for email notifications
✅ **Global Exception Handling**
✅ **Account Status Management** (UNVERIFIED, ACTIVE, BLOCKED)

## Tech Stack

- **Spring Boot 4.0.2** (Java 21)
- **PostgreSQL** - Database
- **JWT (JJWT 0.13.0)** - Token authentication
- **Kafka** - Event streaming
- **BCrypt** - Password hashing
- **ModelMapper** - DTO mapping
- **Lombok** - Boilerplate reduction
- **Bean Validation** - Input validation

## Architecture

### Authentication Flow

```
1. Registration → Email Verification → Login → Access Token + Refresh Token
2. Access Token expires (15 min) → Use Refresh Token → Get new tokens
3. Forgot Password → Email with Reset Token → Reset Password → Login
```

### Security Features

- **Password Hashing**: BCrypt with strength 12
- **Token Hashing**: All tokens (verification, reset, refresh) are hashed before storage
- **Token Expiration**: 
  - Access Token: 15 minutes
  - Refresh Token: 30 days
  - Email Verification: 15 minutes
  - Password Reset: 30 minutes
- **Token Rotation**: Refresh tokens are single-use and revoked after use
- **Account Protection**: Blocked accounts cannot perform any operations

## API Endpoints

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}

Response 200:
{
  "message": "User registered successfully, Please verify your email.",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ Email already exists (verified user)
- ✅ Email exists but unverified (resends verification if expired)
- ✅ Email exists but unverified (informs if valid token exists)
- ✅ Blocked account (shows error)
- ✅ Username/email validation
- ✅ Password strength validation (min 8 chars)

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ Invalid credentials
- ✅ Email not verified
- ✅ Account blocked
- ✅ User not found
- ✅ Wrong password

### 3. Verify Email
```http
POST /auth/verify-email?token={verification_token}

Response 200:
{
  "message": "Email verified successfully! You can now login.",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ Invalid token
- ✅ Expired token
- ✅ Already used token
- ✅ Already verified email
- ✅ Blocked account

### 4. Resend Verification Email
```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}

Response 200:
{
  "message": "Verification email has been sent. Please check your inbox.",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ User not found
- ✅ Email already verified
- ✅ Account blocked
- ✅ Valid token still exists (creates new one anyway for UX)

### 5. Refresh Access Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Tokens refreshed successfully",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ Invalid token format
- ✅ Expired refresh token
- ✅ Revoked refresh token
- ✅ Token not found in database
- ✅ User not found
- ✅ Token rotation (old token revoked)

### 6. Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}

Response 200:
{
  "message": "If an account exists with this email, you will receive password reset instructions.",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ User not found (generic message for security)
- ✅ Account blocked
- ✅ Valid token already exists (creates new one)
- ✅ Generic response (prevents email enumeration)

### 7. Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "uuid-token-from-email",
  "newPassword": "NewSecurePassword123"
}

Response 200:
{
  "message": "Password has been reset successfully. You can now login with your new password.",
  "success": true
}
```

**Edge Cases Handled:**
- ✅ Invalid token
- ✅ Expired token
- ✅ Already used token
- ✅ Account blocked
- ✅ Password validation (min 8 chars)
- ✅ Token marked as used after reset

## Database Schema

### Auth Table (users)
```sql
- auth_id (UUID, PK)
- username (VARCHAR, UNIQUE, NOT NULL)
- email (VARCHAR, UNIQUE, NOT NULL)
- password_hash (VARCHAR, NOT NULL)
- is_verified (BOOLEAN, DEFAULT false)
- status (ENUM: UNVERIFIED, ACTIVE, BLOCKED)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Email Verification Tokens
```sql
- id (UUID, PK)
- user_id (UUID, FK -> auth_id)
- token_hash (VARCHAR, NOT NULL)
- expires_at (TIMESTAMP)
- used (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
```

### Password Reset Tokens
```sql
- id (UUID, PK)
- user_id (UUID, FK -> auth_id)
- token_hash (VARCHAR, NOT NULL)
- expires_at (TIMESTAMP)
- used (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
```

### Refresh Tokens
```sql
- id (UUID, PK)
- user_id (UUID, FK -> auth_id)
- token_hash (VARCHAR, NOT NULL)
- expires_at (TIMESTAMP)
- revoked (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
```

## Kafka Events

The service publishes events to Kafka topic `auth_events` for email notifications:

### 1. USER_REGISTERED
```json
{
  "eventType": "USER_REGISTERED",
  "authId": "uuid",
  "email": "user@example.com",
  "verificationToken": "uuid-token"
}
```

### 2. PASSWORD_RESET_REQUESTED
```json
{
  "eventType": "PASSWORD_RESET_REQUESTED",
  "authId": "uuid",
  "email": "user@example.com",
  "resetToken": "uuid-token"
}
```

### 3. EMAIL_VERIFICATION_RESEND
```json
{
  "eventType": "EMAIL_VERIFICATION_RESEND",
  "authId": "uuid",
  "email": "user@example.com",
  "verificationToken": "uuid-token"
}
```

## Configuration

### application.yaml
```yaml
server:
  port: 8081

spring:
  datasource:
    url: jdbc:postgresql://localhost:5433/okkazo_auth_db
    username: postgres
    password: root
  kafka:
    bootstrap-servers: localhost:9092

kafka:
  topic:
    name: auth_events

jwt:
  secret: your-secret-key-min-256-bits
  access-token:
    expiration: 900000      # 15 minutes
  refresh-token:
    expiration: 2592000000  # 30 days
```

## Setup Instructions

### Prerequisites
- Java 21
- PostgreSQL 14+
- Apache Kafka
- Maven

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb okkazo_auth_db
```

### 2. Start Kafka
```bash
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka
bin/kafka-server-start.sh config/server.properties

# Create topic
bin/kafka-topics.sh --create --topic auth_events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### 3. Configure Application
Update `application.yaml` with your database credentials and JWT secret (minimum 256 bits for HS256).

### 4. Run Application
```bash
# Using Maven wrapper
./mvnw spring-boot:run

# Or build and run
./mvnw clean package
java -jar target/auth-service-0.0.1-SNAPSHOT.jar
```

## Error Handling

The service includes comprehensive error handling with appropriate HTTP status codes:

- **400 Bad Request**: Validation errors, invalid tokens
- **401 Unauthorized**: Invalid credentials, expired tokens
- **403 Forbidden**: Email not verified, account blocked
- **404 Not Found**: User not found
- **409 Conflict**: Email already exists
- **500 Internal Server Error**: Unexpected errors

### Sample Error Response
```json
{
  "timestamp": "2026-01-27T10:30:00",
  "status": 401,
  "message": "Invalid email or password"
}
```

## Security Best Practices Implemented

1. ✅ **Password Hashing**: BCrypt with high cost factor
2. ✅ **Token Hashing**: All database tokens are hashed
3. ✅ **Token Expiration**: Short-lived access tokens
4. ✅ **Token Rotation**: Refresh tokens are single-use
5. ✅ **Generic Error Messages**: Prevents user enumeration
6. ✅ **Email Verification**: Required before login
7. ✅ **Account Status**: Granular control over user access
8. ✅ **Input Validation**: Server-side validation for all inputs
9. ✅ **SQL Injection Protection**: JPA with parameterized queries
10. ✅ **CORS Configuration**: (Should be added for production)

## Testing

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

**Refresh Token:**
```bash
curl -X POST http://localhost:8081/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Node.js Email Service Integration

See `email-service/` directory for the Node.js Kafka consumer that handles email notifications.

## Production Considerations

1. **JWT Secret**: Use environment variable, minimum 256 bits
2. **HTTPS**: Enable SSL/TLS in production
3. **CORS**: Configure allowed origins
4. **Rate Limiting**: Add rate limiting for auth endpoints
5. **Logging**: Configure proper logging (ELK stack)
6. **Monitoring**: Add health checks and metrics
7. **Database**: Use connection pooling, optimize indexes
8. **Kafka**: Configure proper replication and partitioning
9. **Token Cleanup**: Add scheduled job to clean expired tokens
10. **Security Headers**: Add security headers (Helmet.js equivalent)

## License

MIT License - Feel free to use this in your projects!

## Author

Okkazo Team - Capstone Project 2026
