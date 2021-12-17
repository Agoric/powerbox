import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
  defaults: {
    powerboxUrls: [
      'http://localhost:8000/wallet/',
      'https://wallet.agoric.app/',
    ],
    defaultUrl: 'http://localhost:8000/wallet/',
    petdata: {},
  },
  migrations: [OptionsSync.migrations.removeUnused],
  logging: true,
});
