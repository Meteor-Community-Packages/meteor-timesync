Package.describe({
  name: 'mizzao:timesync',
  summary: 'NTP-style time synchronization between server and client',
  version: '1.0.0-beta.2',
  git: "https://github.com/Meteor-Community-Packages/meteor-timesync"
});

Package.onUse(function (api) {
  api.versionsFrom(["3.0.1", '3.4']);

  api.use([
    'check',
    'tracker',
    'fetch',
  ], 'client');

  api.use(['webapp', 'url'], 'server');

  api.use(['ecmascript']);

  // Our files
  api.mainModule('server/index.js', 'server');
  api.mainModule('client/index.js', 'client');
});

Package.onTest(function (api) {
  api.use([
    'ecmascript',
    'meteortesting:mocha',
    'test-helpers'
  ]);

  api.use(['tracker', 'jquery'], 'client');

  api.use('mizzao:timesync');


  api.addFiles('tests/client.js', 'client');
});
