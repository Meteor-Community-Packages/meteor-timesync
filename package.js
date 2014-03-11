Package.describe({
  summary: "NTP-style time synchronization between server and client"
});

Package.on_use(function (api) {
  api.use('coffeescript');
  api.use('deps', 'client');

  // Our files
  api.add_files('timesync-server.coffee', 'server');
  api.add_files('timesync-client.coffee', 'client');

  api.export('TimeSync', 'client');
});
