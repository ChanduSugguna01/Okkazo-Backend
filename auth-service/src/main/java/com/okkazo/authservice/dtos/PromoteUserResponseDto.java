package com.okkazo.authservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PromoteUserResponseDto {
    private boolean success;
    private String message;
    private String email;
    private String previousRole;
    private String newRole;
}
