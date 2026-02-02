package com.okkazo.authservice.dtos;

public record VerifyEmailResponseDto(
        String message,
        boolean success
) {}
