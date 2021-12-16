import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		walletUrls: ['http://localhost:8000/wallet/', 'https://wallet.agoric.app/'],
	},
	migrations: [
		OptionsSync.migrations.removeUnused,
	],
	logging: true,
});
