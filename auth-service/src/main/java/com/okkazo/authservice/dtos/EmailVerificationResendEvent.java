package com.okkazo.authservice.dtos;

import java.util.UUID;

public record EmailVerificationResendEvent(
        String type,
        UUID authId,
        String email,
        String verificationToken
) {
}
