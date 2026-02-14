import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Running App',
  webDir: 'www',
  ios: {
    handleApplicationNotifications: false,
  },
};

export default config;
