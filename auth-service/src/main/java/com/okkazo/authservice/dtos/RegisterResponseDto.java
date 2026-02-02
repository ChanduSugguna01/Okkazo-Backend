package com.okkazo.authservice.dtos;

public record RegisterResponseDto(
        String message,
        boolean emailVerificationRequired
) {
}
