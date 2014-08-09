Package.describe({
  summary: "NTP-style time synchronization between server and client",
  version: "0.2.2",
  git: "https://github.com/mizzao/meteor-timesync.git"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR-CORE@0.9.0-atm");

  api.use(['deps', 'http'], 'client');
  api.use('webapp', 'server');

  // Our files
  api.add_files('timesync-server.js', 'server');
  api.add_files('timesync-client.js', 'client');

  api.export('TimeSync', 'client');
  api.export('SyncInternals', 'client', {testOnly: true} );
});

Package.onTest(function (api) {
  api.use([
    'tinytest',
    'test-helpers'
  ]);

  api.use("mizzao:timesync");

  api.add_files('tests/client.js', 'client');
});
