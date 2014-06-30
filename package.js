Package.describe({
  summary: "NTP-style time synchronization between server and client"
});

Package.on_use(function (api) {
  api.use(['deps', 'http'], 'client');
  api.use('webapp', 'server');

  // Our files
  api.add_files('timesync-server.js', 'server');
  api.add_files('timesync-client.js', 'client');

  api.export('TimeSync', 'client');
  api.export('SyncInternals', 'client', {testOnly: true} );
});

Package.on_test(function (api) {
  api.use([
    'tinytest',
    'test-helpers'
  ]);

  api.use('timesync');

  api.add_files('tests/client.js', 'client');
});
