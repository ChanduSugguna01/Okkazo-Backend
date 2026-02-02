package com.okkazo.authservice.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestDto(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid Email Format")
        String email,
        @NotBlank(message = "Password is required")
        String password
) {
}
