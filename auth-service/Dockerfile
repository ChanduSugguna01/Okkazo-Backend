# Use official OpenJDK 21 image
FROM eclipse-temurin:21-jdk-alpine AS build

# Set working directory
WORKDIR /app

# Install required tools
RUN apk add --no-cache wget

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY mvnw.cmd .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x mvnw

# Download dependencies (cached layer) with retry logic
RUN ./mvnw dependency:go-offline -B || \
    ./mvnw dependency:go-offline -B || \
    ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the application
RUN ./mvnw clean package -DskipTests

# Production stage
FROM eclipse-temurin:21-jre-alpine

# Set working directory
WORKDIR /app

# Copy the jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8081

# Set JVM options for containerized environment
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
