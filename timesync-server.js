// Use rawConnectHandlers so we get a response as quickly as possible
// https://github.com/meteor/meteor/blob/devel/packages/webapp/webapp_server.js

WebApp.rawConnectHandlers.use("/_timesync",
  function(req, res, next) {
    // Never ever cache this, otherwise weird times are shown on reload
    // http://stackoverflow.com/q/18811286/586086
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", 0);

    // Avoid MIME type warnings in browsers
    res.setHeader("Content-Type", "text/plain");

    // Cordova lives in a local webserver, so it does CORS, we need to bless it's requests in order for it to accept
    // our results
    var cordovaClientOriginRegex = /^http:\/\/localhost:1[23]\d\d\d$/;
    if (req.headers && req.headers.origin && (cordovaClientOriginRegex.test(req.headers.origin) || req.headers.origin === 'http://meteor.local')) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }

    res.end(Date.now().toString());
  }
);
