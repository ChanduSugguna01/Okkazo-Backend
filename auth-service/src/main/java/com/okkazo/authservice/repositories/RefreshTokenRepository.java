package com.okkazo.authservice.repositories;

import com.okkazo.authservice.models.Auth;
import com.okkazo.authservice.models.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    List<RefreshToken> findByUserAndRevokedFalseAndExpiresAtAfter(Auth user, LocalDateTime now);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user = :user")
    void revokeAllUserTokens(Auth user);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user = :user AND rt.revoked = false")
    void revokeAllActiveUserTokens(Auth user);

    Optional<RefreshToken> findByIdAndRevokedFalse(UUID id);
}
