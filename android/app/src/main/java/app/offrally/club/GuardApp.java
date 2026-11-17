package app.offrally.club;

import java.util.Arrays;
import java.util.Locale;

enum GuardApp {
    INSTAGRAM("Instagram", new String[]{"com.instagram.android"}, "Reels", Bar.BOTTOM,
        new String[]{"clips_viewer_view_pager", "clips_viewer_container", "clips_viewer_video_layout"},
        new String[]{"clips_tab", "tab_clips"}, "Home", "Feed", "Search", "Profile"),
    YOUTUBE("YouTube", new String[]{"com.google.android.youtube"}, "Shorts", Bar.BOTTOM,
        new String[]{"reel_recycler", "reel_watch_player", "reel_player_page_container", "shorts_player_container"},
        new String[]{"pivot_shorts"}, "Home", "Subscriptions", "You", "Library"),
    FACEBOOK("Facebook", new String[]{"com.facebook.katana", "com.facebook.lite"}, "Reels", Bar.EITHER,
        new String[]{}, new String[]{}, "Home", "Feed", "Friends", "Marketplace", "Notifications", "Menu"),
    SNAPCHAT("Snapchat", new String[]{"com.snapchat.android"}, "Spotlight", Bar.BOTTOM,
        new String[]{"spotlight_container"}, new String[]{}, "Chat", "Camera", "Map", "Stories"),
    TIKTOK("TikTok", new String[]{"com.zhiliaoapp.musically", "com.ss.android.ugc.trill"}, "For You", Bar.TOP,
        new String[]{}, new String[]{}, "Following", "Friends", "Explore", "STEM"),
    REDDIT("Reddit", "com.reddit.frontpage"),
    X("X", "com.twitter.android"),
    THREADS("Threads", "com.instagram.barcelona"),
    TWITCH("Twitch", "tv.twitch.android.app"),
    PINTEREST("Pinterest", "com.pinterest"),
    DISCORD("Discord", "com.discord");

    enum Bar { TOP, BOTTOM, EITHER }
    final String title, section;
    final Bar bar;
    final String[] packages, players, tabIds, neighbors;

    GuardApp(String title, String pkg) {
        this(title, new String[]{pkg}, null, null, new String[]{}, new String[]{});
    }

    GuardApp(String title, String[] packages, String section, Bar bar, String[] players, String[] tabIds, String... neighbors) {
        this.title = title;
        this.packages = packages;
        this.section = section;
        this.bar = bar;
        this.players = players;
        this.tabIds = tabIds;
        this.neighbors = neighbors;
    }

    String id() { return name().toLowerCase(Locale.ROOT); }

    static GuardApp forPackage(String pkg) {
        for (GuardApp app : values()) if (Arrays.asList(app.packages).contains(pkg)) return app;
        return null;
    }

    static GuardApp forId(String id) {
        for (GuardApp app : values()) if (app.id().equals(id)) return app;
        return null;
    }
}
