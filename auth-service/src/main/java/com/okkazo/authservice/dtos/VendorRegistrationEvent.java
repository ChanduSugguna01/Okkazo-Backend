package com.okkazo.authservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorRegistrationEvent {
    private String eventType; // "VENDOR_REGISTRATION_SUBMITTED"
    private String authId;
    private String applicationId;
    private String businessName;
    private String serviceCategory;
    private String customService;
    private String email;
    private String phone;
    private String location;
    private String place; // City or primary place
    private String country;
    private Double latitude;
    private Double longitude;
    private String description;
    private String businessLicenseUrl;
    private String ownerIdentityUrl;
    private List<String> otherProofsUrls;
    private Boolean agreedToTerms;
    private LocalDateTime submittedAt;
    private String status; // "PENDING_REVIEW"
}
