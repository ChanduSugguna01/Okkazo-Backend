package com.okkazo.authservice.exceptions;

public class AlreadyExistingException extends RuntimeException{
    public AlreadyExistingException(String message){
        super(message);
    }
    public AlreadyExistingException(){
        super("User already exists");
    }
}
