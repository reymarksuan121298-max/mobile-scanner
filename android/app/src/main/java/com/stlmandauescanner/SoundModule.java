package com.stlmandauescanner;

import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SoundModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public SoundModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SoundModule";
    }

    @ReactMethod
    public void playClaimedSound() {
        try {
            int resId = reactContext.getResources().getIdentifier("claimed_chime", "raw", reactContext.getPackageName());
            if (resId != 0) {
                MediaPlayer mp = MediaPlayer.create(reactContext, resId);
                if (mp != null) {
                    mp.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                        @Override
                        public void onCompletion(MediaPlayer mediaPlayer) {
                            try {
                                mediaPlayer.release();
                            } catch (Exception ignored) {}
                        }
                    });
                    mp.start();
                    return;
                }
            }

            // Fallback to default system notification chime
            Uri notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            Ringtone ringtone = RingtoneManager.getRingtone(reactContext, notificationUri);
            if (ringtone != null) {
                ringtone.play();
            }
        } catch (Exception e) {
            try {
                Uri notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                Ringtone ringtone = RingtoneManager.getRingtone(reactContext, notificationUri);
                if (ringtone != null) {
                    ringtone.play();
                }
            } catch (Exception ignored) {}
        }
    }
}

