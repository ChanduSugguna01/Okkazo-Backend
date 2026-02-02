package com.okkazo.apigateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/gateway")
public class GatewayInfoController {

    @Autowired
    private RouteDefinitionLocator routeDefinitionLocator;

    @GetMapping("/health")
    public Mono<ResponseEntity<Map<String, Object>>> health() {
        Map<String, Object> healthStatus = new HashMap<>();
        healthStatus.put("status", "UP");
        healthStatus.put("service", "api-gateway");
        healthStatus.put("timestamp", LocalDateTime.now().toString());
        healthStatus.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime());

        return Mono.just(ResponseEntity.ok(healthStatus));
    }

    @GetMapping("/info")
    public Mono<ResponseEntity<Map<String, Object>>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("name", "API Gateway");
        info.put("description", "Spring Cloud Gateway with JWT Authentication and Role-based Authorization");
        info.put("version", "1.0.0");
        info.put("timestamp", LocalDateTime.now().toString());

        Map<String, String> features = new HashMap<>();
        features.put("authentication", "JWT Token Validation");
        features.put("authorization", "Role-based Access Control");
        features.put("serviceDiscovery", "Eureka Client");
        features.put("cors", "Enabled");
        features.put("loadBalancing", "Client-side (Ribbon)");

        info.put("features", features);

        return Mono.just(ResponseEntity.ok(info));
    }

    @GetMapping("/routes")
    public Flux<Map<String, Object>> getRoutes() {
        return routeDefinitionLocator.getRouteDefinitions()
                .map(this::convertRouteToMap)
                .sort(Comparator.comparing(m -> (String) m.get("id")));
    }

    @GetMapping("/routes/summary")
    public Mono<ResponseEntity<Map<String, Object>>> getRoutesSummary() {
        return routeDefinitionLocator.getRouteDefinitions()
                .collectList()
                .map(routes -> {
                    Map<String, Object> summary = new HashMap<>();
                    summary.put("totalRoutes", routes.size());
                    summary.put("timestamp", LocalDateTime.now().toString());

                    List<Map<String, String>> routeList = routes.stream()
                            .map(route -> {
                                Map<String, String> routeInfo = new HashMap<>();
                                routeInfo.put("id", route.getId());
                                routeInfo.put("uri", route.getUri() != null ? route.getUri().toString() : "N/A");
                                routeInfo.put("predicates", route.getPredicates().toString());
                                return routeInfo;
                            })
                            .collect(Collectors.toList());

                    summary.put("routes", routeList);
                    return ResponseEntity.ok(summary);
                });
    }

    @GetMapping("/metrics")
    public Mono<ResponseEntity<Map<String, Object>>> metrics() {
        Runtime runtime = Runtime.getRuntime();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("timestamp", LocalDateTime.now().toString());

        // Memory metrics
        Map<String, Object> memory = new HashMap<>();
        memory.put("total", runtime.totalMemory() / (1024 * 1024) + " MB");
        memory.put("free", runtime.freeMemory() / (1024 * 1024) + " MB");
        memory.put("used", (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024) + " MB");
        memory.put("max", runtime.maxMemory() / (1024 * 1024) + " MB");
        metrics.put("memory", memory);

        // JVM metrics
        Map<String, Object> jvm = new HashMap<>();
        jvm.put("processors", runtime.availableProcessors());
        jvm.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime() + " ms");
        jvm.put("startTime", new Date(ManagementFactory.getRuntimeMXBean().getStartTime()).toString());
        metrics.put("jvm", jvm);

        // System metrics
        Map<String, String> system = new HashMap<>();
        system.put("javaVersion", System.getProperty("java.version"));
        system.put("osName", System.getProperty("os.name"));
        system.put("osVersion", System.getProperty("os.version"));
        system.put("osArch", System.getProperty("os.arch"));
        metrics.put("system", system);

        return Mono.just(ResponseEntity.ok(metrics));
    }

    @GetMapping("/apis")
    public Mono<ResponseEntity<Map<String, Object>>> getApis() {
        Map<String, Object> apis = new HashMap<>();
        apis.put("gateway", "http://localhost:8080");
        apis.put("timestamp", LocalDateTime.now().toString());

        // Public endpoints
        List<Map<String, String>> publicEndpoints = new ArrayList<>();
        publicEndpoints.add(createEndpoint("POST", "/auth/register", "User registration", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/login", "User login", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/verify-email", "Email verification", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/resend-verification", "Resend verification email", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/refresh-token", "Refresh access token", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/forgot-password", "Request password reset", "PUBLIC"));
        publicEndpoints.add(createEndpoint("POST", "/auth/reset-password", "Reset password", "PUBLIC"));
        apis.put("publicEndpoints", publicEndpoints);

        // Protected endpoints
        List<Map<String, String>> protectedEndpoints = new ArrayList<>();
        protectedEndpoints.add(createEndpoint("GET", "/api/users/**", "User service endpoints", "USER,VENDOR,ADMIN,MANAGER"));
        protectedEndpoints.add(createEndpoint("GET", "/api/admin/**", "Admin service endpoints", "ADMIN"));
        protectedEndpoints.add(createEndpoint("GET", "/api/vendor/**", "Vendor service endpoints", "VENDOR,ADMIN,MANAGER"));
        protectedEndpoints.add(createEndpoint("GET", "/api/manager/**", "Manager service endpoints", "MANAGER,ADMIN"));
        apis.put("protectedEndpoints", protectedEndpoints);

        // Gateway endpoints
        List<Map<String, String>> gatewayEndpoints = new ArrayList<>();
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/health", "Gateway health check", "PUBLIC"));
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/info", "Gateway information", "PUBLIC"));
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/routes", "List all routes", "PUBLIC"));
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/routes/summary", "Routes summary", "PUBLIC"));
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/metrics", "Gateway metrics", "PUBLIC"));
        gatewayEndpoints.add(createEndpoint("GET", "/gateway/apis", "Available APIs", "PUBLIC"));
        apis.put("gatewayEndpoints", gatewayEndpoints);

        return Mono.just(ResponseEntity.ok(apis));
    }

    private Map<String, String> createEndpoint(String method, String path, String description, String roles) {
        Map<String, String> endpoint = new HashMap<>();
        endpoint.put("method", method);
        endpoint.put("path", path);
        endpoint.put("description", description);
        endpoint.put("requiredRoles", roles);
        return endpoint;
    }

    private Map<String, Object> convertRouteToMap(RouteDefinition route) {
        Map<String, Object> routeMap = new HashMap<>();
        routeMap.put("id", route.getId());
        routeMap.put("uri", route.getUri() != null ? route.getUri().toString() : "N/A");
        routeMap.put("order", route.getOrder());
        routeMap.put("predicates", route.getPredicates().stream()
                .map(Object::toString)
                .collect(Collectors.toList()));
        routeMap.put("filters", route.getFilters().stream()
                .map(Object::toString)
                .collect(Collectors.toList()));
        return routeMap;
    }
}
