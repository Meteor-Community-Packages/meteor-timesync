Tinytest.add("timesync - tick check - normal tick", function(test) {
  var lastTime = 5000;
  var currentTime = 6000;
  var interval = 1000;
  var tolerance = 1000;

  test.equal(SyncInternals.timeCheck(lastTime, currentTime, interval, tolerance), true);
});

Tinytest.add("timesync - tick check - slightly off", function(test) {
  var lastTime = 5000;
  var currentTime = 6500;
  var interval = 1000;
  var tolerance = 1000;

  test.equal(SyncInternals.timeCheck(lastTime, currentTime, interval, tolerance), true);

  currentTime = 5500;

  test.equal(SyncInternals.timeCheck(lastTime, currentTime, interval, tolerance), true);
});

Tinytest.add("timesync - tick check - big jump", function(test) {
  var lastTime = 5000;
  var currentTime = 0;
  var interval = 1000;
  var tolerance = 1000;

  test.equal(SyncInternals.timeCheck(lastTime, currentTime, interval, tolerance), false);

  currentTime = 10000;

  test.equal(SyncInternals.timeCheck(lastTime, currentTime, interval, tolerance), false);
});

/*
  TODO: add tests for proper dependencies in reactive functions
 */

Tinytest.addAsync("timesync - basic - initial sync", function(test, next) {

  function success() {
    var syncedTime = TimeSync.serverTime();

    // Make sure the time exists
    test.isTrue(syncedTime);

    // Make sure it's close to the current time on the client. This should
    // always be true in PhantomJS tests where client/server are the same
    // machine, although it might fail in development environments.
    test.isTrue( Math.abs(syncedTime - Date.now()) < 1000 );

    next();
  }

  function fail() {
    test.fail();
    next();
  }

  simplePoll(TimeSync.isSynced, success, fail, 5000, 100);
});
