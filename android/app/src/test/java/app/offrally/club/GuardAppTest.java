package app.offrally.club;

import static org.junit.Assert.*;
import org.junit.Test;

public class GuardAppTest {
    @Test public void variantsAndAllowedPackagesAreExact() {
        assertSame(GuardApp.TIKTOK, GuardApp.forPackage("com.ss.android.ugc.trill"));
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
        assertFalse(SectionScreen.tabLabel("Shorts from your subscriptions", "Shorts"));
        assertFalse(SectionScreen.tabLabel("Spotlighted", "Spotlight"));
        assertFalse(SectionScreen.tabLabel("Shorts, table of contents", "Shorts"));
        assertFalse(SectionScreen.tabLabel(null, "Reels"));
    }
}
