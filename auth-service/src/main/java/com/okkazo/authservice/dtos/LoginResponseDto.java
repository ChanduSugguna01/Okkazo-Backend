package com.okkazo.authservice.dtos;

public record LoginResponseDto(
        String accessToken,
        String refreshToken,
        String role,
        String message,
        boolean success
) {
}
