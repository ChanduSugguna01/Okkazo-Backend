package com.okkazo.apigateway.filter;

import com.okkazo.apigateway.util.JwtUtil;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

@Component
public class RoleAuthorizationFilter extends AbstractGatewayFilterFactory<RoleAuthorizationFilter.Config> {

    @Autowired
    private JwtUtil jwtUtil;

    public RoleAuthorizationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // Get user role from header (set by AuthenticationFilter)
            String userRole = request.getHeaders().getFirst("X-User-Role");

            // If no role found, try to extract from token
            if (userRole == null || userRole.isEmpty()) {
                String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    try {
                        userRole = jwtUtil.extractRole(token);
                    } catch (Exception e) {
                        return onError(exchange, "Unable to extract user role", HttpStatus.FORBIDDEN);
                    }
                }
            }

            // Check if user role is in allowed roles
            if (userRole == null || !config.getRoles().contains(userRole)) {
                return onError(
                    exchange,
                    String.format("Access denied. Required roles: %s. Your role: %s",
                        String.join(", ", config.getRoles()),
                        userRole != null ? userRole : "NONE"
                    ),
                    HttpStatus.FORBIDDEN
                );
            }

            return chain.filter(exchange);
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, "application/json");

        String errorResponse = String.format(
            "{\"timestamp\":\"%s\",\"status\":%d,\"message\":\"%s\"}",
            java.time.LocalDateTime.now(),
            httpStatus.value(),
            message
        );

        return response.writeWith(
            Mono.just(response.bufferFactory().wrap(errorResponse.getBytes()))
        );
    }

    @Getter
    @Setter
    public static class Config {
        private List<String> roles;

        public Config() {
        }

        public void setRoles(String roles) {
            this.roles = Arrays.asList(roles.split(","));
        }
    }
}
