package com.okkazo.authservice.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {
    
    private final Cloudinary cloudinary;
    
    @Value("${cloudinary.folder}")
    private String folder;
    
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    /**
     * Upload a single file to Cloudinary
     */
    public String uploadFile(MultipartFile file, String subfolder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 5MB");
        }
        
        // Validate file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !isValidFileExtension(originalFilename)) {
            throw new IllegalArgumentException("Invalid file type. Only PDF, JPEG, and PNG files are allowed");
        }
        
        try {
            // Determine resource type based on file extension
            String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
            String resourceType = extension.equals("pdf") ? "raw" : "image";
            
            // Upload to Cloudinary
            Map<String, Object> uploadParams = ObjectUtils.asMap(
                "folder", folder + "/" + subfolder,
                "resource_type", resourceType,
                "public_id", UUID.randomUUID().toString()
            );
            
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
            String secureUrl = (String) uploadResult.get("secure_url");
            
            log.info("File uploaded successfully to Cloudinary: {}", secureUrl);
            return secureUrl;
            
        } catch (IOException e) {
            log.error("Error uploading file to Cloudinary: {}", e.getMessage());
            throw new IOException("Failed to upload file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Upload multiple files to Cloudinary
     */
    public List<String> uploadFiles(MultipartFile[] files, String subfolder) throws IOException {
        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }
        
        // Validate number of files
        if (files.length > 3) {
            throw new IllegalArgumentException("Maximum 3 files allowed for otherProofs");
        }
        
        List<String> uploadedUrls = new ArrayList<>();
        
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                String url = uploadFile(file, subfolder);
                if (url != null) {
                    uploadedUrls.add(url);
                }
            }
        }
        
        return uploadedUrls;
    }
    
    /**
     * Validate file extension
     */
    private boolean isValidFileExtension(String filename) {
        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        return ALLOWED_EXTENSIONS.contains(extension);
    }
    
    /**
     * Delete a file from Cloudinary by public ID
     */
    public void deleteFile(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("File deleted successfully from Cloudinary: {}", publicId);
        } catch (IOException e) {
            log.error("Error deleting file from Cloudinary: {}", e.getMessage());
        }
    }
}
