package com.okkazo.authservice.dtos;

public record ForgotPasswordResponseDto(
        String message,
        boolean success
) {
}
