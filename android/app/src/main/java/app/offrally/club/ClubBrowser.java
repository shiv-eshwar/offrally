package app.offrally.club;
import android.content.Intent;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="ClubBrowser")
public class ClubBrowser extends Plugin {
    @PluginMethod public void open(PluginCall call) {
        String site=call.getString("site","");
        if (!site.equals("instagram") && !site.equals("youtube")) {call.reject("Unknown feed"); return;}
        Intent intent=new Intent(getActivity(), FeedActivity.class);
        intent.putExtra("site",site);
        intent.putExtra("flags",call.getObject("flags",new JSObject()).toString());
        getActivity().startActivity(intent);
        call.resolve();
    }
}
