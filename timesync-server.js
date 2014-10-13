// Use rawConnectHandlers so we get a response as quickly as possible
// https://github.com/meteor/meteor/blob/devel/packages/webapp/webapp_server.js

WebApp.rawConnectHandlers.use(TimeSyncConfig.baseUrl,
  function(req, res, next) {
    // Never ever cache this, otherwise weird times are shown on reload
    // http://stackoverflow.com/q/18811286/586086
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", 0);

    res.end(Date.now().toString());
  }
);
