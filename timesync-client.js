//IE8 doesn't have Date.now()
Date.now = Date.now || function() { return +new Date; };

TimeSync = {};

var offset = undefined;
var roundTripTime = undefined;
var offsetDep = new Deps.Dependency;
var timeTick = new Deps.Dependency;

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
      Meteor._debug("Error syncing to server time: " + err);
      if (++attempts <= maxAttempts)
        Meteor.setTimeout(TimeSync.resync, 1000);
      else
        Meteor._debug("Max number of time sync attempts reached. Giving up.");
      return;
    }

    attempts = 0; // It worked

    var ts = parseInt(response.content);
    offset = Math.round(((ts - t0) + (ts - t3)) / 2);
    roundTripTime = t3 - t0; // - (ts - ts) which is 0
    offsetDep.changed();
  });
};

// Reactive variable for server time that updates every second.
TimeSync.serverTime = function(clientTime) {
  // If we don't know the offset, we can't provide the server time.
  if ( !TimeSync.isSynced() ) return undefined;
  // If a client time is provided, we don't need to depend on the tick.
  if ( !clientTime ) timeTick.depend();

  // offsetDep.depend(); implicit as we call isSynced()
  return (clientTime || Date.now()) + offset;
};

// Reactive variable for the difference between server and client time.
TimeSync.serverOffset = function() {
  offsetDep.depend();
  return offset;
};

TimeSync.roundTripTime = function() {
  offsetDep.depend();
  return roundTripTime;
};

TimeSync.isSynced = function() {
  offsetDep.depend();
  return offset !== undefined;
};

var resyncIntervalId = null;

TimeSync.resync = function() {
  if (resyncIntervalId !== null) Meteor.clearInterval(resyncIntervalId);
  updateOffset();
  resyncIntervalId = Meteor.setInterval(updateOffset, 600000);
};

// resync on major client clock changes
// based on http://stackoverflow.com/a/3367542/1656818
var timeCheckerInterval = 2000;
var timeCheckerTolerance = 1000; // Resync if unexpected change by more than one second
var prevClientTime;

function timeChecker() {
  var currentClientTime = Date.now();
  // Five second tolerance
  if (Math.abs(currentClientTime - prevClientTime - timeCheckerInterval) >= timeCheckerTolerance) {
    // We're no longer in sync. Refuse to compute server time.
    offset = undefined;
    offsetDep.changed();
    TimeSync.resync();
  }
  prevClientTime = currentClientTime;
}

var watcherIntervalId = null;

TimeSync.watchClockChanges = function (handleIt) {
  // Clear any existing timer
  if ( watcherIntervalId !== null ) {
    Meteor.clearInterval(watcherIntervalId);
    watcherIntervalId = null; // Because we may not set a new one
  }

  if( !handleIt ) return;

  //set the oldTime before we wait on the first interval to fire.
  prevClientTime = Date.now();
  //check for client time change
  watcherIntervalId = Meteor.setInterval(timeChecker, timeCheckerInterval);
};

// Run this as soon as we load, even before Meteor.startup()
TimeSync.resync();

Meteor.setInterval(function() {
  timeTick.changed();
}, 1000);
