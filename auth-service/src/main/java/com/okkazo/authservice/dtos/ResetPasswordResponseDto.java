package com.okkazo.authservice.dtos;

public record ResetPasswordResponseDto(
        String message,
        boolean success
) {
}
