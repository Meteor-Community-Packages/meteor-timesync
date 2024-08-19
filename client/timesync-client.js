import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { fetch } from 'meteor/fetch';

TimeSync = {
  loggingEnabled: Meteor.isDevelopment,
  forceDDP: false
};

function log( /* arguments */ ) {
  if (TimeSync.loggingEnabled) {
    Meteor._debug.apply(this, arguments);
  }
}

const defaultInterval = 1000;

// Internal values, exported for testing
SyncInternals = {
  offset: undefined,
  roundTripTime: undefined,
  offsetTracker: new Tracker.Dependency(),
  syncTracker: new Tracker.Dependency(),
  isSynced: false,
  usingDDP: false,
  timeTick: {},
  getDiscrepancy: function (lastTime, currentTime, interval) {
    return currentTime - (lastTime + interval)
  }
};

SyncInternals.timeTick[defaultInterval] = new Tracker.Dependency();

const maxAttempts = 5;
let attempts = 0;

/*
  This is an approximation of
  http://en.wikipedia.org/wiki/Network_Time_Protocol

  If this turns out to be more accurate under the connect handlers,
  we should try taking multiple measurements.
 */

let syncUrl;

TimeSync.setSyncUrl = function (url) {
  if (url) {
    syncUrl = url;
  } else if (Meteor.isCordova || Meteor.isDesktop) {
    // Only use Meteor.absoluteUrl for Cordova and Desktop; see
    // https://github.com/meteor/meteor/issues/4696
    // https://github.com/mizzao/meteor-timesync/issues/30
    // Cordova should never be running out of a subdirectory...
    syncUrl = Meteor.absoluteUrl('_timesync');
  } else {
    // Support Meteor running in relative paths, based on computed root url prefix
    // https://github.com/mizzao/meteor-timesync/pull/40
    const basePath = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
    syncUrl = basePath + '/_timesync';
  }
};
TimeSync.getSyncUrl = function () {
  return syncUrl;
}
TimeSync.setSyncUrl();

const updateOffset = function () {
  const t0 = Date.now();
  if (TimeSync.forceDDP || SyncInternals.useDDP) {
    Meteor.call('_timeSync', function (err, res) {
      handleResponse(t0, err, res);
    });
  } else {
    fetch(syncUrl, { method: 'GET', cache: 'no-cache' })
      .then(res => res.json())
      .then((res) => handleResponse(t0, null, res))
      .catch((err) => handleResponse(t0, err, null));
  }
};

const handleResponse = function (t0, err, res) {
  const t3 = Date.now(); // Grab this now
  if (err) {
    // We'll still use our last computed offset if is defined
    log('Error syncing to server time: ', err);
    if (++attempts <= maxAttempts) {
      Meteor.setTimeout(TimeSync.resync, 1000);
    } else {
      log('Max number of time sync attempts reached. Giving up.');
    }
    return;
  }

  attempts = 0; // It worked
  const ts = parseInt(res, 10);
  SyncInternals.isSynced = true;
  SyncInternals.offset = Math.round(((ts - t0) + (ts - t3)) / 2);
  SyncInternals.roundTripTime = t3 - t0; // - (ts - ts) which is 0
  SyncInternals.offsetTracker.changed();
}

// Reactive variable for server time that updates every second.
TimeSync.serverTime = function (clientTime, interval) {
  check(interval, Match.Optional(Match.Integer));
  // If a client time is provided, we don't need to depend on the tick.
  if (!clientTime) getTickDependency(interval || defaultInterval).depend();

  SyncInternals.offsetTracker.depend(); // depend on offset to enable reactivity
  // Convert Date argument to epoch as necessary
  return (+clientTime || Date.now()) + SyncInternals.offset;
};

// Reactive variable for the difference between server and client time.
TimeSync.serverOffset = function () {
  SyncInternals.offsetTracker.depend();
  return SyncInternals.offset;
};

TimeSync.roundTripTime = function () {
  SyncInternals.offsetTracker.depend();
  return SyncInternals.roundTripTime;
};

TimeSync.isSynced = function () {
  SyncInternals.offsetTracker.depend();
  return SyncInternals.isSynced;
};

let resyncIntervalId = null;

TimeSync.resync = function () {
  if (resyncIntervalId !== null) Meteor.clearInterval(resyncIntervalId);

  updateOffset();
  resyncIntervalId = Meteor.setInterval(updateOffset, (SyncInternals.useDDP) ? 300000 : 600000);
};

// Run this as soon as we load, even before Meteor.startup()
// Run again whenever we reconnect after losing connection
let wasConnected = false;

Tracker.autorun(function () {
  const connected = Meteor.status().connected;
  if (connected && !wasConnected) TimeSync.resync();
  wasConnected = connected;
  SyncInternals.useDDP = connected;
});

// Resync if unexpected change by more than a few seconds. This needs to be
// somewhat lenient, or a CPU-intensive operation can trigger a re-sync even
// when the offset is still accurate. In any case, we're not going to be able to
// catch very small system-initiated NTP adjustments with this, anyway.
const tickCheckTolerance = 5000;

let lastClientTime = Date.now();

// Set up a new interval for any amount of reactivity.
function getTickDependency(interval) {

  if (!SyncInternals.timeTick[interval]) {
    const dep = new Tracker.Dependency();

    Meteor.setInterval(function () {
      dep.changed();
    }, interval);

    SyncInternals.timeTick[interval] = dep;
  }

  return SyncInternals.timeTick[interval];
}

// Set up special interval for the default tick, which also watches for re-sync
Meteor.setInterval(function () {
  const currentClientTime = Date.now();
  const discrepancy = SyncInternals.getDiscrepancy(lastClientTime, currentClientTime, defaultInterval);

  if (Math.abs(discrepancy) < tickCheckTolerance) {
    // No problem here, just keep ticking along
    SyncInternals.timeTick[defaultInterval].changed();
  } else {
    // resync on major client clock changes
    // based on http://stackoverflow.com/a/3367542/1656818
    log('Clock discrepancy detected. Attempting re-sync.');
    // Refuse to compute server time and try to guess new server offset. Guessing only works if the server time hasn't changed.
    SyncInternals.offset = SyncInternals.offset - discrepancy;
    SyncInternals.isSynced = false;
    SyncInternals.offsetTracker.changed();
    TimeSync.resync();
  }

  lastClientTime = currentClientTime;
}, defaultInterval);
