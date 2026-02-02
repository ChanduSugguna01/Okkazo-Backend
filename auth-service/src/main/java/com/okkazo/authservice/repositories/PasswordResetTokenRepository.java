package com.okkazo.authservice.repositories;

import com.okkazo.authservice.models.Auth;
import com.okkazo.authservice.models.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(Auth user);
}
