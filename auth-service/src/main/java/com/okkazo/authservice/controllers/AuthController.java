package com.okkazo.authservice.controllers;

import com.okkazo.authservice.dtos.*;
import com.okkazo.authservice.services.AuthService;
import com.okkazo.authservice.services.EmailVerificationService;
import com.okkazo.authservice.services.PasswordResetService;
import com.okkazo.authservice.services.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponseDto> register(@Valid @RequestBody RegisterRequestDto registerDto){
        return ResponseEntity.ok(
                authService.register(registerDto)
        );
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto loginDto){
        return ResponseEntity.ok(
                authService.login(loginDto)
        );
    }

    @PostMapping("/verify-email")
    public ResponseEntity<VerifyEmailResponseDto> verifyEmail(@RequestParam("token") String token){
        return ResponseEntity.ok(emailVerificationService.verifyEmail(token));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ResendVerificationResponseDto> resendVerification(
            @Valid @RequestBody ResendVerificationRequestDto requestDto){
        return ResponseEntity.ok(emailVerificationService.resendVerification(requestDto));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<RefreshTokenResponseDto> refreshToken(
            @Valid @RequestBody RefreshTokenRequestDto requestDto){
        return ResponseEntity.ok(refreshTokenService.refreshAccessToken(requestDto));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ForgotPasswordResponseDto> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDto requestDto){
        return ResponseEntity.ok(passwordResetService.forgotPassword(requestDto));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ResetPasswordResponseDto> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDto requestDto){
        return ResponseEntity.ok(passwordResetService.resetPassword(requestDto));
    }

}
