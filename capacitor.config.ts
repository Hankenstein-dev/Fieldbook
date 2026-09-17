import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.fieldbook.app',
  appName: 'Fieldbook',
  loggingBehavior: 'none',
  webDir: 'dist-android',
  android: { allowMixedContent: false },
  // Native container owns safe-area/keyboard padding. LIGHT means dark system icons.
  plugins: { SystemBars: { insetsHandling: 'disable', style: 'LIGHT' } },
};
export default config;
