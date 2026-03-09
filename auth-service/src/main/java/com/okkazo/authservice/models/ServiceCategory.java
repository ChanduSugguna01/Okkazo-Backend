package com.okkazo.authservice.models;

public enum ServiceCategory {
    VENUE("Venue"),
    CATERING_AND_DRINKS("Catering & Drinks"),
    PHOTOGRAPHY("Photography"),
    VIDEOGRAPHY("Videography"),
    DECOR_AND_STYLING("Decor & Styling"),
    ENTERTAINMENT_AND_ARTISTS("Entertainment & Artists"),
    MAKEUP_AND_GROOMING("Makeup & Grooming"),
    INVITATIONS_AND_PRINTING("Invitations & Printing"),
    SOUND_AND_LIGHTING("Sound & Lighting"),
    EQUIPMENT_RENTAL("Equipment Rental"),
    SECURITY_AND_SAFETY("Security & Safety"),
    TRANSPORTATION("Transportation"),
    LIVE_STREAMING_AND_MEDIA("Live Streaming & Media"),
    CAKE_AND_DESSERTS("Cake & Desserts"),
    OTHER("Other");

    private final String displayName;

    ServiceCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static ServiceCategory fromDisplayName(String displayName) {
        for (ServiceCategory category : ServiceCategory.values()) {
            if (category.displayName.equalsIgnoreCase(displayName)) {
                return category;
            }
        }
        throw new IllegalArgumentException("Invalid service category: " + displayName);
    }
    
    public static boolean isValid(String displayName) {
        try {
            fromDisplayName(displayName);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
