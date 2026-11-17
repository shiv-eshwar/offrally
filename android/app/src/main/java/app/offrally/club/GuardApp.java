package app.offrally.club;

import java.util.Arrays;

enum GuardApp {
    INSTAGRAM("Instagram", "Reels", false, new String[]{"com.instagram.android"},
        new String[]{"clips_viewer_view_pager", "clips_viewer_container", "clips_viewer_video_layout"},
        "Home", "Search", "Profile"),
    YOUTUBE("YouTube", "Shorts", false, new String[]{"com.google.android.youtube"},
        new String[]{"reel_recycler", "reel_watch_player", "reel_player_page_container", "shorts_player_container"},
        "Home", "Subscriptions", "You"),
    SNAPCHAT("Snapchat", "Spotlight", false, new String[]{"com.snapchat.android"},
        new String[]{}, "Chat", "Camera", "Map", "Stories"),
    TIKTOK("TikTok", "For You", true, new String[]{"com.zhiliaoapp.musically", "com.ss.android.ugc.trill"},
        new String[]{}, "Following", "Friends", "Explore", "STEM");

    final String title, section;
    final boolean topBar;
    final String[] packages, players, neighbors;

    GuardApp(String title, String section, boolean topBar, String[] packages, String[] players, String... neighbors) {
        this.title = title;
        this.section = section;
        this.topBar = topBar;
        this.packages = packages;
        this.players = players;
        this.neighbors = neighbors;
    }

    String id() { return name().toLowerCase(java.util.Locale.ROOT); }

    static GuardApp forPackage(String pkg) {
        for (GuardApp app : values()) if (Arrays.asList(app.packages).contains(pkg)) return app;
        return null;
    }

    static GuardApp forId(String id) {
        for (GuardApp app : values()) if (app.id().equals(id)) return app;
        return null;
    }
}
