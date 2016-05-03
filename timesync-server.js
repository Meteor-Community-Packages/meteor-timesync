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

    // Cordova lives in a local webserver, so it does CORS
    // we need to bless it's requests in order for it to accept our results
    // Match http://localhost:<port> for Cordova clients in Meteor 1.3
    // and http://meteor.local for earlier versions
    const origin = req.headers.origin;

    if (origin && ( origin === 'http://meteor.local' ||
        /^http:\/\/localhost:1[23]\d\d\d$/.test(origin) ) ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.end(Date.now().toString());
  }
);
