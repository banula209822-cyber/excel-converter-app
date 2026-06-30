import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.billconverter.app',
  appName: 'Bill Converter',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.222:3000', // <-- ඔන්න උඹේ IP එක ලස්සනට සෙට් කරා
    cleartext: true
  }
};

export default config;