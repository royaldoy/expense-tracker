import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.yorlian.moneytracker',
	appName: 'Money Tracker',
	webDir: 'build',
	server: {
		androidScheme: 'https'
	},
	android: {
		adjustMarginsForEdgeToEdge: 'auto'
	},
	plugins: {
		CapacitorSQLite: {
			androidIsEncryption: false,
			androidBiometric: {
				biometricAuth: false,
				biometricTitle: 'Biometric Authentication',
				biometricSubTitle: 'Log in using your biometric credential'
			}
		},
		LocalNotifications: {
			smallIcon: 'ic_stat_icon_config_sample',
			iconColor: '#0058BC'
		}
	}
};

export default config;
