package com.okkazo.authservice.dtos;

public record ResendVerificationResponseDto(
        String message,
        boolean success
) {
}
