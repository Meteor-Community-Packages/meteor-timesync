import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { HTTP } from 'meteor/http';
import { _ } from 'meteor/underscore';

Tinytest.add("timesync - tick check - normal tick", function (test) {
  const lastTime = 5000;
  const currentTime = 6000;
  const interval = 1000;

  test.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 0);
});

Tinytest.add("timesync - tick check - slightly off", function (test) {
  const lastTime = 5000;
  let currentTime = 6500;
  const interval = 1000;

  test.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 500);

  currentTime = 5500;

  test.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), -500);
});

Tinytest.add("timesync - tick check - big jump", function (test) {
  const lastTime = 5000;
  let currentTime = 0;
  const interval = 1000;

  test.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), -6000);

  currentTime = 10000;

  test.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 4000);
});

/*
  TODO: add tests for proper dependencies in reactive functions
 */

Tinytest.addAsync("timesync - basic - initial sync", function (test, next) {

  function success() {
    const syncedTime = TimeSync.serverTime();

    // Make sure the time exists
    test.isTrue(syncedTime);

    // Make sure it's close to the current time on the client. This should
    // always be true in PhantomJS tests where client/server are the same
    // machine, although it might fail in development environments, for example
    // when the server and client are different VMs.
    test.isTrue(Math.abs(syncedTime - Date.now()) < 1000);

    next();
  }

  function fail() {
    test.fail();
    next();
  }

  simplePoll(TimeSync.isSynced, success, fail, 5000, 100);
});

Tinytest.addAsync("timesync - basic - serverTime format", function (test, next) {

  test.isTrue(_.isNumber(TimeSync.serverTime()));

  test.isTrue(_.isNumber(TimeSync.serverTime(null)));

  // Accept Date as client time
  test.isTrue(_.isNumber(TimeSync.serverTime(new Date())));

  // Accept epoch as client time
  test.isTrue(_.isNumber(TimeSync.serverTime(Date.now())));

  next();
});

Tinytest.addAsync("timesync - basic - different sync intervals", function (test, next) {

  let aCount = 0;
  let bCount = 0;
  let cCount = 0;

  const a = Tracker.autorun(function () {
    TimeSync.serverTime(null, 500);
    aCount++;
  });

  const b = Tracker.autorun(function () {
    TimeSync.serverTime();
    bCount++;
  });

  const c = Tracker.autorun(function () {
    TimeSync.serverTime(null, 2000);
    cCount++;
  });

  const testInterval = 4990;

  Meteor.setTimeout(function () {

    test.equal(aCount, 10); // 0, 500, 1000, 1500 ...
    // not going to be 5 since the first tick won't generate this dep
    test.equal(bCount, 6);
    test.equal(cCount, 3); // 0, 2000, 4000

    test.isTrue(SyncInternals.timeTick[500]);
    test.isTrue(SyncInternals.timeTick[1000]);
    test.isTrue(SyncInternals.timeTick[2000]);

    test.equal(Object.keys(SyncInternals.timeTick).length, 3);

    a.stop();
    b.stop();
    c.stop();

    next()
  }, testInterval);

});

Tinytest.addAsync("timesync - basic - DDP timeSync", function (test, next) {
  Meteor.call('_timeSync', function (err, res) {
    if (err) {
      test.fail();
      next();
    }
    test.isTrue(_.isNumber(res));

    // Make sure it's close to the current time on the client. This should
    // always be true in PhantomJS tests where client/server are the same
    // machine, although it might fail in development environments, for example
    // when the server and client are different VMs.
    test.isTrue(Math.abs(res - Date.now()) < 1000);

    next();
  });
});

Tinytest.addAsync("timesync - basic - HTTP timeSync", function (test, next) {
  const syncUrl = TimeSync.getSyncUrl();

  test.isNotNull(syncUrl);

  HTTP.get(syncUrl, function (err, res) {
    if (err) {
      test.fail();
      next();
    }
    test.isTrue(res.content);
    const serverTime = parseInt(res.content,10);
    test.isTrue(_.isNumber(serverTime));
    test.isTrue(Math.abs(serverTime - Date.now()) < 1000);
    next();
  });
});
