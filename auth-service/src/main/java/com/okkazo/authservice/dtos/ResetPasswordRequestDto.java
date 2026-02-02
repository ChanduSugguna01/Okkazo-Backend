package com.okkazo.authservice.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequestDto(
        @NotBlank(message = "Token is required")
        String token,
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must have at least 8 characters")
        String newPassword
) {
}
