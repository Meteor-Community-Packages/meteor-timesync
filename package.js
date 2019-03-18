Package.describe({
  name: 'mizzao:timesync',
  summary: 'NTP-style time synchronization between server and client',
  version: '0.6.0',
  git: 'https://github.com/mizzao/meteor-timesync.git'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.3');

  api.use([
    'check',
    'tracker',
    'http'
  ], 'client');

  api.use(['webapp'], 'server');

  api.use(['ecmascript']);

  // Our files
  api.addFiles('server/index.js', 'server');
  api.addFiles('client/index.js', 'client');

  api.export('TimeSync', 'client');
  api.export('SyncInternals', 'client', {
    testOnly: true
  });
});

Package.onTest(function (api) {
  api.use([
    'ecmascript',
    'tinytest',
    'test-helpers'
  ]);

  api.use(['tracker'], 'client');

  api.use('mizzao:timesync');

  api.addFiles('tests/client.js', 'client');
});
