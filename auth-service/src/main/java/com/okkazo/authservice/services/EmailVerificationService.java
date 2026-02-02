package com.okkazo.authservice.services;

import com.okkazo.authservice.dtos.ResendVerificationRequestDto;
import com.okkazo.authservice.dtos.ResendVerificationResponseDto;
import com.okkazo.authservice.dtos.VerifyEmailResponseDto;
import com.okkazo.authservice.exceptions.AccountBlockedException;
import com.okkazo.authservice.exceptions.InvalidTokenException;
import com.okkazo.authservice.exceptions.TokenExpiredException;
import com.okkazo.authservice.exceptions.UserNotFoundException;
import com.okkazo.authservice.kafka.AuthEventProducer;
import com.okkazo.authservice.models.Auth;
import com.okkazo.authservice.models.EmailVerificationToken;
import com.okkazo.authservice.models.Status;
import com.okkazo.authservice.repositories.AuthRepository;
import com.okkazo.authservice.repositories.EmailVerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthEventProducer authEventProducer;

    @Transactional
    public VerifyEmailResponseDto verifyEmail(String token) {
        // Find the token by matching the raw token with hashed tokens
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findAll().stream()
                .filter(t -> !t.isUsed() && passwordEncoder.matches(token, t.getHashedToken()))
                .findFirst()
                .orElseThrow(() -> new InvalidTokenException("Invalid or already used verification token"));

        // Check if token is expired
        if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new TokenExpiredException("Verification token has expired. Please request a new one.");
        }

        // Get user
        Auth user = verificationToken.getUser();

        // Check if account is blocked
        if (user.getStatus() == Status.BLOCKED) {
            throw new AccountBlockedException("Your account has been blocked. Please contact support.");
        }

        // Check if already verified
        if (user.getIsVerified()) {
            return new VerifyEmailResponseDto(
                    "Email is already verified. You can login now.",
                    true
            );
        }

        // Verify user
        user.setIsVerified(true);
        user.setStatus(Status.ACTIVE);
        authRepository.save(user);

        // Mark token as used
        verificationToken.setUsed(true);
        emailVerificationTokenRepository.save(verificationToken);

        log.info("Email verified successfully for user: {}", user.getEmail());

        return new VerifyEmailResponseDto(
                "Email verified successfully! You can now login.",
                true
        );
    }

    @Transactional
    public ResendVerificationResponseDto resendVerification(ResendVerificationRequestDto requestDto) {
        // Find user by email
        Auth user = authRepository.findByEmail(requestDto.email())
                .orElseThrow(() -> new UserNotFoundException("No account found with this email"));

        // Check if account is blocked
        if (user.getStatus() == Status.BLOCKED) {
            throw new AccountBlockedException("Your account has been blocked. Please contact support.");
        }

        // Check if already verified
        if (user.getIsVerified()) {
            throw new InvalidTokenException("Email is already verified. Please login.");
        }

        // Check for existing valid token
        EmailVerificationToken existingToken = emailVerificationTokenRepository
                .findTopByUserOrderByCreatedAtDesc(user)
                .orElse(null);

        if (existingToken != null &&
            !existingToken.isUsed() &&
            existingToken.getExpiresAt().isAfter(LocalDateTime.now())) {
            // Token still valid, inform user (but create new one for better UX)
            log.info("Valid verification token exists for user: {}", user.getEmail());
        }

        // Create new verification token
        String rawToken = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = new EmailVerificationToken();
        verificationToken.setUser(user);
        verificationToken.setHashedToken(passwordEncoder.encode(rawToken));
        verificationToken.setExpiresAt(LocalDateTime.now().plusMinutes(15)); // 15 minutes validity
        verificationToken.setUsed(false);

        emailVerificationTokenRepository.save(verificationToken);

        // Send event to Node.js service for email
        authEventProducer.emailVerificationResend(
                user.getAuthId(),
                user.getEmail(),
                rawToken
        );

        log.info("Verification email resent to: {}", user.getEmail());

        return new ResendVerificationResponseDto(
                "Verification email has been sent. Please check your inbox.",
                true
        );
    }
}
