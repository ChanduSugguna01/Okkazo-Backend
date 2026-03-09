package com.okkazo.authservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorRegisterResponseDto {
    private boolean success;
    private String message;
    private VendorApplicationData data;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VendorApplicationData {
        private String applicationId;
        private String status;
        private String businessName;
        private String email;
        private LocalDateTime submittedAt;
        private String estimatedReviewTime;
    }
}
