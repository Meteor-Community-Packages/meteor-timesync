Package.describe({
  name: "mizzao:timesync",
  summary: "NTP-style time synchronization between server and client",
  version: "0.2.3",
  git: "https://github.com/mizzao/meteor-timesync.git"
});

Package.onUse(function (api) {
  api.versionsFrom("1.0");

  api.use(['deps', 'http'], 'client');
  api.use('webapp', 'server');

  // Our files
  api.addFiles('timesync-server.js', 'server');
  api.addFiles('timesync-client.js', 'client');

  api.export('TimeSync', 'client');
  api.export('TimeSyncConfig');
  api.export('SyncInternals', 'client', {testOnly: true} );
});

Package.onTest(function (api) {
  api.use([
    'tinytest',
    'test-helpers'
  ]);

  api.use("mizzao:timesync");

  api.addFiles('tests/client.js', 'client');
});
