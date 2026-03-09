package com.okkazo.authservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserRoleChangedEvent {
    private String type;
    private UUID authId;
    private String email;
    private String previousRole;
    private String newRole;
    private LocalDateTime changedAt;
}
