package com.okkazo.authservice.repositories;

import com.okkazo.authservice.models.Auth;
import com.okkazo.authservice.models.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findTopByUserOrderByCreatedAtDesc(Auth existingUser);
}
