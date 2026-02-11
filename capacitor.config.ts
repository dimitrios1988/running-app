import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'running-app',
  webDir: 'www',
  ios: {
    handleApplicationNotifications: false,
  },
};

export default config;
