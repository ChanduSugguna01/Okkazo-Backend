package com.okkazo.authservice.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        String username,
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid Email Format")
        String email,
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must have at least 8 characters")
        String password
) {
}
