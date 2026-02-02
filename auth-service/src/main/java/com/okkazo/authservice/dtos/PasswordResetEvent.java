package com.okkazo.authservice.dtos;

import java.util.UUID;

public record PasswordResetEvent(
        String type,
        UUID authId,
        String email,
        String resetToken
) {
}
