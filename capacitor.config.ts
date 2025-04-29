
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f941be39acf14e31b3c4dea80e13586e',
  appName: 'robo-med-pilot-droid',
  webDir: 'dist',
  server: {
    url: 'https://f941be39-acf1-4e31-b3c4-dea80e13586e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true, // Allow HTTP content in HTTPS app
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ]
  },
  ios: {
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    Camera: {
      cameraPermissionText: "The app needs access to your camera",
    },
  },
};

export default config;
