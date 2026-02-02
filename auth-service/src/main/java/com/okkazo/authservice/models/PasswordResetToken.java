package com.okkazo.authservice.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens",
        indexes = {
                @Index(name = "idx_password_reset_token_hash", columnList = "token_hash"),
                @Index(name = "idx_password_reset_user", columnList = "user_id")
        })
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Auth user;
    @Column(name = "token_hash", nullable = false)
    private String hashedToken;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "used", nullable = false)
    private boolean used = false;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
