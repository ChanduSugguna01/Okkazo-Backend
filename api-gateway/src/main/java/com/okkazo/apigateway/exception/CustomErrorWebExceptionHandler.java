package com.okkazo.apigateway.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
@Order(-2)
public class CustomErrorWebExceptionHandler implements WebExceptionHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());

        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = "An unexpected error occurred";

        // Handle specific exception types
        if (ex instanceof ResponseStatusException rse) {
            status = HttpStatus.valueOf(rse.getStatusCode().value());
            message = rse.getReason() != null ? rse.getReason() : message;
        } else if (ex instanceof IllegalArgumentException) {
            status = HttpStatus.BAD_REQUEST;
            message = ex.getMessage();
        } else if (ex.getCause() instanceof io.jsonwebtoken.ExpiredJwtException) {
            status = HttpStatus.UNAUTHORIZED;
            message = "JWT token has expired";
        } else if (ex.getCause() instanceof io.jsonwebtoken.JwtException) {
            status = HttpStatus.UNAUTHORIZED;
            message = "Invalid JWT token";
        } else if (ex instanceof io.jsonwebtoken.ExpiredJwtException) {
            status = HttpStatus.UNAUTHORIZED;
            message = "JWT token has expired";
        } else if (ex instanceof io.jsonwebtoken.JwtException) {
            status = HttpStatus.UNAUTHORIZED;
            message = "Invalid JWT token: " + ex.getMessage();
        }

        errorResponse.put("status", status.value());
        errorResponse.put("error", status.getReasonPhrase());
        errorResponse.put("message", message);

        // Set response status
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        // Write error response
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(errorResponse);
            DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
            return exchange.getResponse().writeWith(Mono.just(buffer));
        } catch (JsonProcessingException e) {
            // Fallback to simple error message
            String fallbackError = String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"message\":\"%s\"}",
                LocalDateTime.now(),
                status.value(),
                message
            );
            byte[] bytes = fallbackError.getBytes(StandardCharsets.UTF_8);
            DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
            return exchange.getResponse().writeWith(Mono.just(buffer));
        }
    }
}
