//IE8 doesn't have Date.now()
Date.now = Date.now || function() { return +new Date; };

TimeSync = {};

// Internal values, exported for testing
SyncInternals = {
  offset: undefined,
  roundTripTime: undefined,
  offsetDep: new Deps.Dependency(),
  timeTick: new Deps.Dependency(),

  timeCheck: function (lastTime, currentTime, interval, tolerance) {
    if (Math.abs(currentTime - lastTime - interval) < tolerance) {
      // Everything is A-OK
      return true;
    }
    // We're no longer in sync.
    return false;
  }
};

var maxAttempts = 5;
var attempts = 0;

/*
  This is an approximation of
  http://en.wikipedia.org/wiki/Network_Time_Protocol

  If this turns out to be more accurate under the connect handlers,
  we should try taking multiple measurements.
 */
var updateOffset = function() {
  var t0;
  t0 = Date.now();
  HTTP.get("/_timesync", function(err, response) {
    var t3 = Date.now(); // Grab this now
    if (err) {
      //  We'll still use our last computed offset if is defined
      Meteor._debug("Error syncing to server time: ", err);
      if (++attempts <= maxAttempts)
        Meteor.setTimeout(TimeSync.resync, 1000);
      else
        Meteor._debug("Max number of time sync attempts reached. Giving up.");
      return;
    }

    attempts = 0; // It worked

    var ts = parseInt(response.content);
    SyncInternals.offset = Math.round(((ts - t0) + (ts - t3)) / 2);
    SyncInternals.roundTripTime = t3 - t0; // - (ts - ts) which is 0
    SyncInternals.offsetDep.changed();
  });
};

// Reactive variable for server time that updates every second.
TimeSync.serverTime = function(clientTime) {
  // If we don't know the offset, we can't provide the server time.
  if ( !TimeSync.isSynced() ) return undefined;
  // If a client time is provided, we don't need to depend on the tick.
  if ( !clientTime ) SyncInternals.timeTick.depend();

  // SyncInternals.offsetDep.depend(); implicit as we call isSynced()
  return (clientTime || Date.now()) + SyncInternals.offset;
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
  return SyncInternals.offset !== undefined;
};

var resyncIntervalId = null;

TimeSync.resync = function() {
  if (resyncIntervalId !== null) Meteor.clearInterval(resyncIntervalId);
  updateOffset();
  resyncIntervalId = Meteor.setInterval(updateOffset, 600000);
};

TimeSync.watchClockChanges = function () {
  Meteor._debug("TimeSync.watchClockChanges() is deprecated; clock watching is now on by default.");
};

// Run this as soon as we load, even before Meteor.startup()
TimeSync.resync();

// resync on major client clock changes
// based on http://stackoverflow.com/a/3367542/1656818
var updateInterval = 1000;
// Resync if unexpected change by more than one second
var tickCheckTolerance = 1000;

var lastClientTime = Date.now();

Meteor.setInterval(function() {
  var currentClientTime = Date.now();

  if ( SyncInternals.timeCheck(
    lastClientTime, currentClientTime, updateInterval, tickCheckTolerance) ) {
    SyncInternals.timeTick.changed();
  }
  else {
    Meteor._debug("Clock discrepancy detected. Attempting re-sync.");
    // Refuse to compute server time.
    SyncInternals.offset = undefined;
    SyncInternals.offsetDep.changed();
    TimeSync.resync();
  }

  lastClientTime = currentClientTime;
}, updateInterval);

