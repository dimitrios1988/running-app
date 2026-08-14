import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gr.weallrun.runningapp',
  appName: 'Running App',
  webDir: 'www',
  ios: {
    handleApplicationNotifications: false,
  },
};

export default config;
