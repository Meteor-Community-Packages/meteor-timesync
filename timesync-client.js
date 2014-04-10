TimeSync = {};

var offset = undefined;
var roundTripTime = undefined;
var offsetDep = new Deps.Dependency;
var timeTick = new Deps.Dependency;

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
      return undefined;
    }
    var ts = parseInt(response.content);
    offset = Math.round(((ts - t0) + (ts - t3)) / 2);
    roundTripTime = t3 - t0; // - (ts - ts) which is 0
    return offsetDep.changed();
  });
};

// Reactive variable for server time that updates every second.
TimeSync.serverTime = function(clientTime) {
  if ( !TimeSync.isSynced() ) return undefined; // We don't know the server time.
  if ( !clientTime ) timeTick.depend(); // We don't need to depend on the tick.
  offsetDep.depend();
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
  if (resyncIntervalId !== null)
    Meteor.clearInterval(resyncIntervalId);
  updateOffset();
  resyncIntervalId = Meteor.setInterval(updateOffset, 600000);
};

//resync on major client clock changes
//based on http://stackoverflow.com/a/3367542/1656818
var timeCheckerInterval = 2000;

TimeSync.timeChecker = function() {
  var oldTime = TimeSync.timeChecker.oldTime || new Date(),
      newTime = new Date(),
      timeDiff = newTime - oldTime;
  TimeSync.timeChecker.oldTime = newTime;
  // Five second tolerance
  if (Math.abs(timeDiff) >= 5000 - timeCheckerInterval) {
      TimeSync.resync();
  };
};

var handleChangeIntervalId = null;

TimeSync.handleChange = function (handleIt) {
  if (handleChangeIntervalId !== null){
    Meteor.clearInterval(handleChangeIntervalId)
  };

  if(handleIt){
    //check for client time change
    handleChangeIntervalId = Meteor.setInterval(function (){
      TimeSync.timeChecker();
    }, timeCheckerInterval);
  };
};

// Run this as soon as we load, even before Meteor.startup()
TimeSync.resync();

Meteor.setInterval((function() {
  return timeTick.changed();
}), 1000);
