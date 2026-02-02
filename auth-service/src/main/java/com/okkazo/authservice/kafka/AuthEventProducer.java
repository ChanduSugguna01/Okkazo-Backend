package com.okkazo.authservice.kafka;

import com.okkazo.authservice.dtos.EmailVerificationResendEvent;
import com.okkazo.authservice.dtos.PasswordResetEvent;
import com.okkazo.authservice.dtos.UserLoginEvent;
import com.okkazo.authservice.dtos.UserRegistrationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthEventProducer {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topic.name}")
    private String topicName;

    public void userRegistered(UUID authId, String email, String verificationToken){
        UserRegistrationEvent event = new UserRegistrationEvent(
                "USER_REGISTERED",
                authId,
                email,
                verificationToken
        );
        kafkaTemplate.send(topicName, authId.toString(), event);
    }

    public void passwordResetRequested(UUID authId, String email, String resetToken){
        PasswordResetEvent event = new PasswordResetEvent(
                "PASSWORD_RESET_REQUESTED",
                authId,
                email,
                resetToken
        );
        kafkaTemplate.send(topicName, authId.toString(), event);
    }

    public void emailVerificationResend(UUID authId, String email, String verificationToken){
        EmailVerificationResendEvent event = new EmailVerificationResendEvent(
                "EMAIL_VERIFICATION_RESEND",
                authId,
                email,
                verificationToken
        );
        kafkaTemplate.send(topicName, authId.toString(), event);
    }

    public void userLoginEvent(UUID authId, String email){
        UserLoginEvent event = new UserLoginEvent(
                "USER_LOGIN",
                authId,
                email,
                LocalDateTime.now()
        );
        kafkaTemplate.send(topicName, authId.toString(), event);
    }
}
