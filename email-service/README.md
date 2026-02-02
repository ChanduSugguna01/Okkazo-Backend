# Email Service

A professional Node.js microservice for handling transactional emails in the Okkazo platform. Consumes Kafka events from auth-service and sends emails for verification, password reset, and other notifications.

## 🚀 Features

- **Kafka Integration**: Consumes auth events from Kafka
- **Email Templates**: Beautiful HTML email templates with Handlebars
- **SMTP Support**: Works with any SMTP provider (Gmail, SendGrid, AWS SES, etc.)
- **Retry Logic**: Automatic retry on email send failures
- **Eureka Service Discovery**: Registers with Eureka server
- **Professional Logging**: Winston logger with file and console output
- **Template Caching**: Caches compiled templates for performance
- **Edge Case Handling**: Comprehensive validation and error handling

## 📧 Email Types Handled

### 1. Email Verification
- **Event**: `USER_REGISTERED`
- **Trigger**: User registration in auth-service
- **Content**: Verification link with token

### 2. Password Reset
- **Event**: `PASSWORD_RESET_REQUESTED`
- **Trigger**: User requests password reset
- **Content**: Password reset link with token

### 3. Email Verification Resend
- **Event**: `EMAIL_VERIFICATION_RESEND`
- **Trigger**: User requests resend of verification email
- **Content**: New verification link with token

### 4. Welcome Email (Future)
- Sent after successful email verification
- Welcome message and getting started guide

## 📋 Prerequisites

- Node.js >= 18.0.0
- Apache Kafka (running on localhost:9092)
- Eureka Server (running on localhost:8761)
- SMTP Server credentials (Gmail, SendGrid, etc.)

## 🛠️ Installation

1. **Navigate to email-service directory:**
   ```bash
   cd email-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your SMTP credentials and configuration.

4. **Configure SMTP (Gmail Example):**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

   **Note**: For Gmail, you need to generate an [App Password](https://support.google.com/accounts/answer/185833).

## 🚀 Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will start on port **8083** by default.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check and SMTP status |
| POST | `/api/email/test` | Send test email (development) |

### Test Email Example
```bash
curl -X POST http://localhost:8083/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com"}'
```

## 🎨 Email Templates

Templates are located in `src/templates/` and use Handlebars syntax:

### verification.html
- Welcome message
- Verification button with link
- Expiration notice
- Support information

### password-reset.html
- Password reset instructions
- Reset button with link
- Security tips
- Expiration notice

### welcome.html
- Welcome message
- Platform features
- Getting started guide
- Call-to-action button

## 🔄 Kafka Event Flow

```
Auth Service
     ↓
Kafka Topic: auth_events
     ↓
Email Service Consumer
     ↓
Email Service
     ↓
SMTP Server
     ↓
Recipient
```

## 📊 Event Examples

### USER_REGISTERED
```json
{
  "type": "USER_REGISTERED",
  "authId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "verificationToken": "abc123xyz"
}
```

### PASSWORD_RESET_REQUESTED
```json
{
  "type": "PASSWORD_RESET_REQUESTED",
  "authId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "resetToken": "reset123xyz"
}
```

### EMAIL_VERIFICATION_RESEND
```json
{
  "type": "EMAIL_VERIFICATION_RESEND",
  "authId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "verificationToken": "newtoken123"
}
```

## 🏗️ Project Structure

```
email-service/
├── src/
│   ├── config/
│   │   ├── email.js          # Nodemailer configuration
│   │   ├── eureka.js         # Eureka client setup
│   │   └── kafka.js          # Kafka configuration
│   ├── kafka/
│   │   └── emailEventConsumer.js  # Kafka consumer
│   ├── services/
│   │   └── emailService.js   # Email sending logic
│   ├── templates/
│   │   ├── verification.html # Email verification template
│   │   ├── password-reset.html # Password reset template
│   │   └── welcome.html      # Welcome email template
│   ├── utils/
│   │   └── logger.js         # Winston logger
│   └── app.js                # Application entry point
├── logs/                     # Log files
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 8083 |
| SMTP_HOST | SMTP server hostname | smtp.gmail.com |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_SECURE | Use TLS | false |
| SMTP_USER | SMTP username | Required |
| SMTP_PASSWORD | SMTP password | Required |
| FROM_EMAIL | Sender email address | noreply@okkazo.com |
| FROM_NAME | Sender name | Okkazo Platform |
| FRONTEND_URL | Frontend application URL | http://localhost:3000 |
| VERIFICATION_URL | Email verification page | http://localhost:3000/verify-email |
| RESET_PASSWORD_URL | Password reset page | http://localhost:3000/reset-password |
| KAFKA_BROKER | Kafka broker address | localhost:9092 |
| KAFKA_TOPIC | Kafka topic name | auth_events |
| EUREKA_HOST | Eureka server host | localhost |
| MAX_RETRY_ATTEMPTS | Email retry attempts | 3 |
| RETRY_DELAY | Retry delay (ms) | 5000 |

## 🔧 SMTP Provider Setup

### Gmail
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use App Password in `SMTP_PASSWORD`

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

## 📈 Features

### Retry Logic
- Automatically retries failed emails up to 3 times
- Configurable retry delay
- Exponential backoff (future enhancement)

### Template Caching
- Compiles and caches Handlebars templates
- Improves performance for frequent emails
- Reduces file system reads

### Validation
- Email format validation
- Required field checking
- Event data validation
- Edge case handling

### Logging
- Structured logging with Winston
- Separate error and combined logs
- Console and file output
- Log levels: error, warn, info, http, debug

## 🧪 Testing

### Test SMTP Connection
```bash
# Check health endpoint
curl http://localhost:8083/health
```

### Send Test Email
```bash
curl -X POST http://localhost:8083/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

### Test Kafka Integration
1. Start auth-service
2. Register a new user
3. Check email-service logs for event processing
4. Check your email inbox for verification email

## 🐛 Troubleshooting

### SMTP Connection Failed
```
Error: Invalid login
```
**Solution**: 
- For Gmail: Use App Password, not your regular password
- Enable "Less secure app access" or use OAuth2
- Check SMTP credentials in .env

### Kafka Connection Issues
```
Error: Kafka consumer connection failed
```
**Solution**:
1. Ensure Kafka is running
2. Check Kafka broker address in .env
3. Verify topic exists: `auth_events`

### Email Not Received
**Check**:
1. Spam/Junk folder
2. Email service logs for errors
3. SMTP credentials are correct
4. Recipient email is valid

### Template Not Found
```
Error: Failed to load email template
```
**Solution**:
- Ensure template files exist in `src/templates/`
- Check template name matches function call
- Verify file permissions

## 🔒 Security Best Practices

1. **Never commit SMTP credentials** to version control
2. Use **environment variables** for sensitive data
3. Enable **TLS/SSL** for SMTP connections
4. Use **App Passwords** instead of account passwords
5. Implement **rate limiting** for production (future)
6. Monitor for **suspicious activity**

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8083/health
```

### Logs
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Metrics (Future)
- Emails sent count
- Success/failure rate
- Average send time
- Retry attempts

## 🚀 Integration

### With Auth Service
- Consumes events via Kafka
- Receives user registration data
- Gets password reset requests

### With API Gateway
- Registered with Eureka
- Routes: `/email-service/**`

## 🤝 Contributing

1. Follow existing code structure
2. Add proper error handling
3. Update templates as needed
4. Test with real SMTP provider

## 📄 License

MIT

---

**Built with ❤️ for the Okkazo Platform**
