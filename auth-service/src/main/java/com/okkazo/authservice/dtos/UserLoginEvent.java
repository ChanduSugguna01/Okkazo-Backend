package com.okkazo.authservice.dtos;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserLoginEvent(
        String type,
        UUID authId,
        String email,
        LocalDateTime date
) {
}
