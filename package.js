Package.describe({
  name: 'mizzao:timesync',
  summary: 'NTP-style time synchronization between server and client',
  version: '1.0.0-beta.0',
  git: "https://github.com/Meteor-Community-Packages/meteor-timesync"
});

Package.onUse(function (api) {
  api.versionsFrom(["3.0"]);

  api.use([
    'check',
    'tracker',
    'fetch',
  ], 'client');

  api.use(['webapp', 'url'], 'server');

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

  api.use(['tracker', 'underscore'], 'client');

  api.use('mizzao:timesync');

  api.addFiles('tests/client.js', 'client');
});
