package com.okkazo.authservice.dtos;

import java.util.UUID;

public record UserRegistrationEvent(
        String type,
        UUID authId,
        String email,
        String verificationToken
) {
}
