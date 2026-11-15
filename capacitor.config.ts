import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * White-label: `scripts/build-client.js` writes the active client's resolved
 * config to `.client/active.json` (gitignored), and this file picks the app
 * identity up from there - so it never has to be edited per client.
 *
 * The literals below are the base identity. They apply only while no client
 * has been applied (a fresh clone), which keeps `cap` commands working.
 */
interface ActiveClient {
  appId: string;
  appName: string;
  notification: { accentColor: string };
}

function readActiveClient(): ActiveClient | null {
  const file = join(__dirname, '.client', 'active.json');
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as ActiveClient)
    : null;
}

const client = readActiveClient();

const config: CapacitorConfig = {
  appId: 'gr.weallrun.runningapp',
  appName: 'Running App',
  webDir: 'www',
  ios: {
    handleApplicationNotifications: false,
  },
  plugins: {
    // Read by @capacitor/local-notifications on Android. The drawable is the
    // same white silhouette OneSignal uses for push, generated per client.
    LocalNotifications: {
      smallIcon: 'ic_stat_onesignal_default',
      iconColor: client?.notification.accentColor ?? '#C2410C',
    },
  },
};

if (client) {
  config.appId = client.appId;
  config.appName = client.appName;
}

export default config;
