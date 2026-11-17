package app.offrally.club;

import static org.junit.Assert.*;
import org.junit.Test;

public class GuardAppTest {
    @Test public void variantsAndAllowedPackagesAreExact() {
        assertSame(GuardApp.TIKTOK, GuardApp.forPackage("com.ss.android.ugc.trill"));
        assertSame(GuardApp.FACEBOOK, GuardApp.forPackage("com.facebook.lite"));
        assertNull(GuardApp.forPackage("com.reddit.frontpage").section);
        assertNull(GuardApp.forPackage("com.instagram.android.other"));
        assertNull(GuardApp.forPackage(null));
        for (GuardApp app : GuardApp.values()) {
            assertSame(app, GuardApp.forId(app.id()));
            for (String pkg : app.packages) assertSame(app, GuardApp.forPackage(pkg));
        }
    }
    @Test public void ordinaryContentIsNotANavigationLabel() {
        assertTrue(SectionScreen.tabLabel("Shorts, tab, 2 of 5", "Shorts"));
        assertTrue(SectionScreen.tabLabel(" FOR YOU ", "For You"));
        assertTrue(SectionScreen.tabLabel("Reels, Tab 2 of 6, selected", "Reels"));
        assertTrue(SectionScreen.tabLabel("Shorts, 2 of 5", "Shorts"));
        assertTrue(SectionScreen.selectedLabel("Reels, selected, tab 2 of 6", "Reels"));
        assertFalse(SectionScreen.selectedLabel("Reels, unselected", "Reels"));
        assertFalse(SectionScreen.tabLabel("Shorts from your subscriptions", "Shorts"));
        assertFalse(SectionScreen.tabLabel("Spotlighted", "Spotlight"));
        assertFalse(SectionScreen.tabLabel("Shorts, table of contents", "Shorts"));
        assertFalse(SectionScreen.tabLabel(null, "Reels"));
    }
}
