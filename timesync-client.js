//IE8 doesn't have Date.now()
Date.now = Date.now || function() { return +new Date; };

TimeSync = {
  loggingEnabled: true
};

function log(/* arguments */) {
  if (TimeSync.loggingEnabled) {
    Meteor._debug.apply(this, arguments);
  }
}

var defaultInterval = 1000;

// Internal values, exported for testing
SyncInternals = {
  offset: undefined,
  roundTripTime: undefined,
  offsetDep: new Deps.Dependency(),
  syncDep: new Deps.Dependency(),
  isSynced: false,
  timeTick: {},
  getDiscrepancy: function (lastTime, currentTime, interval) {
    return currentTime - (lastTime + interval)
  }
};

SyncInternals.timeTick[defaultInterval] = new Deps.Dependency();

var maxAttempts = 5;
var attempts = 0;

/*
  This is an approximation of
  http://en.wikipedia.org/wiki/Network_Time_Protocol

  If this turns out to be more accurate under the connect handlers,
  we should try taking multiple measurements.
 */

var syncUrl;
if (Meteor.isCordova) {
  // Only use Meteor.absoluteUrl for Cordova; see
  // https://github.com/meteor/meteor/issues/4696
  // https://github.com/mizzao/meteor-timesync/issues/30
  // Cordova should never be running out of a subdirectory...
  syncUrl = Meteor.absoluteUrl("_timesync");
}
else {
  // Support Meteor running in relative paths, based on computed root url prefix
  // https://github.com/mizzao/meteor-timesync/pull/40
  const basePath = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
  syncUrl = basePath + "/_timesync";
}

var updateOffset = function() {
  var t0 = Date.now();

  HTTP.get(syncUrl, function(err, response) {
    var t3 = Date.now(); // Grab this now
    if (err) {
      //  We'll still use our last computed offset if is defined
      log("Error syncing to server time: ", err);
      if (++attempts <= maxAttempts)
        Meteor.setTimeout(TimeSync.resync, 1000);
      else
        log("Max number of time sync attempts reached. Giving up.");
      return;
    }

    attempts = 0; // It worked

    var ts = parseInt(response.content);
    SyncInternals.isSynced = true;
    SyncInternals.offset = Math.round(((ts - t0) + (ts - t3)) / 2);
    SyncInternals.roundTripTime = t3 - t0; // - (ts - ts) which is 0
    SyncInternals.offsetDep.changed();
  });
};

// Reactive variable for server time that updates every second.
TimeSync.serverTime = function(clientTime, interval) {
  check(interval, Match.Optional(Match.Integer));
  // If a client time is provided, we don't need to depend on the tick.
  if ( !clientTime ) getTickDependency(interval || defaultInterval).depend();

  SyncInternals.offsetDep.depend(); // depend on offset to enable reactivity
  // Convert Date argument to epoch as necessary
  return (+clientTime || Date.now()) + SyncInternals.offset;
};

// Reactive variable for the difference between server and client time.
TimeSync.serverOffset = function() {
  SyncInternals.offsetDep.depend();
  return SyncInternals.offset;
};

TimeSync.roundTripTime = function() {
  SyncInternals.offsetDep.depend();
  return SyncInternals.roundTripTime;
};

TimeSync.isSynced = function() {
  SyncInternals.offsetDep.depend();
  return SyncInternals.isSynced;
};

var resyncIntervalId = null;

TimeSync.resync = function() {
  if (resyncIntervalId !== null) Meteor.clearInterval(resyncIntervalId);
  updateOffset();
  resyncIntervalId = Meteor.setInterval(updateOffset, 600000);
};

// Run this as soon as we load, even before Meteor.startup()
// Run again whenever we reconnect after losing connection
var wasConnected = false;

Deps.autorun(function() {
  var connected = Meteor.status().connected;
  if ( connected && !wasConnected ) TimeSync.resync();
  wasConnected = connected;
});

// Resync if unexpected change by more than a few seconds. This needs to be
// somewhat lenient, or a CPU-intensive operation can trigger a re-sync even
// when the offset is still accurate. In any case, we're not going to be able to
// catch very small system-initiated NTP adjustments with this, anyway.
var tickCheckTolerance = 5000;

var lastClientTime = Date.now();

// Set up a new interval for any amount of reactivity.
function getTickDependency(interval) {

  if ( !SyncInternals.timeTick[interval] ) {
    var dep  = new Deps.Dependency();

    Meteor.setInterval(function() {
      dep.changed();
    }, interval);

    SyncInternals.timeTick[interval] = dep;
  }

  return SyncInternals.timeTick[interval];
}

// Set up special interval for the default tick, which also watches for re-sync
Meteor.setInterval(function() {
  var currentClientTime = Date.now();

  var discrepancy = SyncInternals.getDiscrepancy(lastClientTime, currentClientTime, defaultInterval);
  if (Math.abs(discrepancy) < tickCheckTolerance) {
    // No problem here, just keep ticking along
    SyncInternals.timeTick[defaultInterval].changed();
  } else {
    // resync on major client clock changes
    // based on http://stackoverflow.com/a/3367542/1656818
    log("Clock discrepancy detected. Attempting re-sync.");
    // Refuse to compute server time and try to guess new server offset. Guessing only works if the server time hasn't changed.
    SyncInternals.offset = SyncInternals.offset - discrepancy;
    SyncInternals.isSynced = false;
    SyncInternals.offsetDep.changed();
    TimeSync.resync();
  }

  lastClientTime = currentClientTime;
}, defaultInterval);
