package com.okkazo.authservice.exceptions;

public class AccountBlockedException extends RuntimeException {
    public AccountBlockedException(String message) {
        super(message);
    }
}
