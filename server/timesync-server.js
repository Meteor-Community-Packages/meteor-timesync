import { Meteor } from "meteor/meteor";
import { URL } from 'meteor/url';

// Use rawConnectHandlers so we get a response as quickly as possible
// https://github.com/meteor/meteor/blob/devel/packages/webapp/webapp_server.js

const url = new URL(Meteor.absoluteUrl("/_timesync"));

WebApp.handlers.use(url.pathname,
  function (req, res, next) {
    // Never ever cache this, otherwise weird times are shown on reload
    // http://stackoverflow.com/q/18811286/586086
    res.append('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.append('Pragma', 'no-cache');
    res.append('Expires', 0);

    // Avoid MIME type warnings in browsers
    res.type('text/plain');

    // Cordova lives in a local webserver, so it does CORS
    // we need to bless it's requests in order for it to accept our results
    // Match http://localhost:<port> for Cordova clients in Meteor 1.3
    // and http://meteor.local for earlier versions
    const origin = req.headers.origin;

    if (origin && ( origin === 'http://meteor.local' ||
        origin === 'capacitor://meteor.local' ||
        origin === 'meteor://desktop' ||
        /^http:\/\/localhost:1[23]\d\d\d$/.test(origin) ) ) {
      res.append('Access-Control-Allow-Origin', origin);
    }

    res.end(Date.now().toString());
  }
);

Meteor.methods({
  _timeSync: function () {
    this.unblock();
    return Date.now();
  }
});
