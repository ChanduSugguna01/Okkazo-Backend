# User Service

A professional Node.js microservice built with Express.js for managing user profiles in the Okkazo platform. This service integrates with the Spring Boot ecosystem through Kafka for event-driven architecture and Eureka for service discovery.

## 🚀 Features

- **User Profile Management**: Complete CRUD operations for user profiles
- **Kafka Integration**: Consumes auth events from auth-service
- **Eureka Service Discovery**: Registers with Eureka server for microservices communication
- **JWT Authentication**: Validates JWT tokens from auth-service
- **Role-Based Authorization**: Supports USER, VENDOR, ADMIN, and MANAGER roles
- **MongoDB Database**: Efficient NoSQL storage for user data
- **Professional Architecture**: Clean separation of concerns with controllers, services, and models
- **Comprehensive Validation**: Request validation using express-validator
- **Error Handling**: Global error handling with custom error classes
- **Logging**: Winston logger for structured logging
- **Security**: Helmet, CORS, and compression middleware

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Apache Kafka (running on localhost:9092)
- Eureka Server (running on localhost:8761)

## 🛠️ Installation

1. **Navigate to the user-service directory:**
   ```bash
   cd user-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration.

4. **Start MongoDB:**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or start your local MongoDB instance
   mongod
   ```

## 🚀 Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will start on port **8082** by default.

## 📡 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/users/health` | User service health check |

### Protected Endpoints (Require Authentication)

#### User Profile Management

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user profile | Authenticated User |
| PUT | `/api/users/me` | Update current user profile | Authenticated User |
| POST | `/api/users/login` | Update last login timestamp | Authenticated User |
| GET | `/api/users/auth/:authId` | Get user by authId | Authenticated User |
| GET | `/api/users/email/:email` | Get user by email | Authenticated User |

#### Admin Endpoints

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Get all users (paginated) | ADMIN, MANAGER |
| GET | `/api/users/stats` | Get user statistics | ADMIN, MANAGER |
| GET | `/api/users/:id` | Get user by ID | ADMIN, MANAGER |
| PUT | `/api/users/:id` | Update user by ID | ADMIN, MANAGER |
| DELETE | `/api/users/:id` | Delete user (soft delete) | ADMIN |

### Query Parameters

**Get All Users (`/api/users`)**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `role` - Filter by role (USER, VENDOR, ADMIN, MANAGER)
- `profileIsComplete` - Filter by profile completion (true/false)
- `search` - Search in name, fullName, and email

**Example:**
```
GET /api/users?page=1&limit=20&role=USER&search=john
```

## 📦 User Schema

```javascript
{
  "authId": "uuid",              // From auth-service
  "name": "string",              // Required, 2-50 chars
  "fullName": "string",          // Optional, max 100 chars
  "email": "string",             // Required, unique
  "phone": "string",             // Optional
  "location": "string",          // Optional, max 100 chars
  "avatar": "string (URL)",      // Optional, valid URL
  "bio": "string",               // Optional, max 500 chars
  "interests": ["string"],       // Optional, max 20 items
  "role": "string",              // USER, VENDOR, ADMIN, MANAGER (default: USER)
  "profileIsComplete": boolean,  // Auto-calculated (default: false)
  "memberSince": "date",         // Auto-generated
  "isActive": boolean,           // Default: true
  "lastLogin": "date",           // Updated on login
  "createdAt": "date",           // Auto-generated
  "updatedAt": "date"            // Auto-updated
}
```

## 🎯 Kafka Event Handling

The service listens to the `auth_events` topic and handles the following events:

### USER_REGISTERED Event
```javascript
{
  "type": "USER_REGISTERED",
  "authId": "uuid",
  "email": "user@example.com",
  "verificationToken": "token"
}
```

**Action:** Creates a new user profile with:
- `authId` from the event
- `email` from the event
- `name` extracted from email (before @)
- `role` set to "USER"
- `profileIsComplete` set to false

## 🔐 Authentication

Authentication is handled at the **API Gateway level**. The gateway validates JWT tokens and forwards user information to the user-service via headers:

**Headers set by API Gateway:**
- `x-user-id` or `x-auth-id` - Auth ID
- `x-user-email` - User email
- `x-user-username` - Username
- `x-user-role` - User role

**Note:** All requests to user-service should go through the API Gateway at `http://localhost:8080/user-service/**`

## 🏗️ Project Structure

```
user-service/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB configuration
│   │   ├── eureka.js         # Eureka client setup
│   │   └── kafka.js          # Kafka configuration
│   ├── controllers/
│   │   └── userController.js # Request handlers
│   ├── kafka/
│   │   └── authEventConsumer.js # Kafka consumer
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   ├── authorization.js  # Authorization middleware
│   │   ├── errorHandler.js   # Error handling
│   │   └── validation.js     # Request validation
│   ├── models/
│   │   └── User.js           # User schema
│   ├── routes/
│   │   └── userRoutes.js     # API routes
│   ├── services/
│   │   └── userService.js    # Business logic
│   ├── utils/
│   │   ├── ApiError.js       # Custom error class
│   │   └── logger.js         # Winston logger
│   └── app.js                # Application entry point
├── logs/                     # Log files
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 8082 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/okkazo_user_db |
| KAFKA_BROKER | Kafka broker address | localhost:9092 |
| KAFKA_TOPIC | Kafka topic name | auth_events |
| EUREKA_HOST | Eureka server host | localhost |
| EUREKA_PORT | Eureka server port | 8761 |
| JWT_SECRET | JWT secret key (must match auth-service) | Required |
| LOG_LEVEL | Logging level | info |

## 📊 Logging

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

Log levels: error, warn, info, http, debug

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test
```

## 🔍 Health Checks

- **Application Health**: `GET /health`
- **User Service Health**: `GET /api/users/health`

## 🚀 Integration with Microservices

### With Auth Service
- Receives user registration events via Kafka
- Validates JWT tokens using the same secret
- Maintains user profiles linked by authId

### With API Gateway
- Registers with Eureka for service discovery
- Routes: `/user-service/**`
- All requests proxied through gateway at port 8080

### With Eureka Server
- Auto-registers on startup
- Health checks every 30 seconds
- Deregisters on graceful shutdown

## 🛡️ Security Features

- JWT token validation
- Role-based access control (RBAC)
- Helmet for security headers
- CORS configuration
- Input validation and sanitization
- Secure password handling (in auth-service)

## 📈 Performance

- Connection pooling for MongoDB
- Kafka consumer group for scalability
- Compression middleware
- Efficient indexing on User model
- Pagination for large datasets

## 🐛 Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```

Status Codes:
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 409 - Conflict
- 500 - Internal Server Error

## 📝 API Examples

### Get Current User Profile
```bash
curl -X GET http://localhost:8082/api/users/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Update Profile
```bash
curl -X PUT http://localhost:8082/api/users/me \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "phone": "+1234567890",
    "location": "New York, USA",
    "bio": "Software Developer",
    "interests": ["coding", "reading", "travel"]
  }'
```

### Get All Users (Admin)
```bash
curl -X GET "http://localhost:8082/api/users?page=1&limit=10&role=USER" \
  -H "Authorization: Bearer <admin-jwt-token>"
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Write descriptive commit messages
4. Update documentation for API changes

## 📄 License

MIT

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for the Okkazo Platform**
