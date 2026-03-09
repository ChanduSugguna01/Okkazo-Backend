package com.okkazo.authservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorAccountCreatedEvent {
    private String eventType; // "VENDOR_ACCOUNT_CREATED"
    private UUID authId;
    private String email;
    private String passwordResetToken;
    private String businessName;
    private String applicationId;
}
