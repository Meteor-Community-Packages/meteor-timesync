/** eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { fetch } from 'meteor/fetch';
import { SyncInternals, TimeSync } from 'meteor/mizzao:timesync';
import { assert } from 'chai';
import { simplePoll, isNumber } from './helpers'

describe('Timesync', () => {
  it ("tick check - normal tick", () => {
    const lastTime = 5000;
    const currentTime = 6000;
    const interval = 1000;

    assert.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 0);
  });

  it("tick check - slightly off", () => {
    const lastTime = 5000;
    let currentTime = 6500;
    const interval = 1000;

    assert.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 500);

    currentTime = 5500;

    assert.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), -500);
  });

  it("tick check - big jump", () => {
    const lastTime = 5000;
    let currentTime = 0;
    const interval = 1000;

    assert.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), -6000);

    currentTime = 10000;

    assert.equal(SyncInternals.getDiscrepancy(lastTime, currentTime, interval), 4000);
  });

  /*
    TODO: add tests for proper dependencies in reactive functions
   */

  it("basic - initial sync", (done) => {

    function success() {
      const syncedTime = TimeSync.serverTime();
      if (syncedTime === 0)  {
        return done(new Error("TimeSync did not sync"));
      }
      // Make sure the time exists abd  it's close to the current time on the client. This should
      // always be true in PhantomJS tests where client/server are the same
      // machine, although it might fail in development environments, for example
      // when the server and client are different VMs.
      const inRange = Math.abs(syncedTime - Date.now()) < 1000;


      if (!inRange) {
        return done(new Error("TimeSync did not sync within the expected range"));
      }

      return done();
    }

    function fail(e) {
      done(e ?? new Error("TimeSync did not sync within the expected time"));
    }

    simplePoll(TimeSync.isSynced, success, fail, 5000, 100);
  });

  it("basic - serverTime format", (done) => {

    assert.isTrue(isNumber(TimeSync.serverTime()));

    assert.isTrue(isNumber(TimeSync.serverTime(null)));

    // Accept Date as client time
    assert.isTrue(isNumber(TimeSync.serverTime(new Date())));

    // Accept epoch as client time
    assert.isTrue(isNumber(TimeSync.serverTime(Date.now())));

    done();
  });

  it("basic - different sync intervals", function (done) {
    this.timeout(10000); // 10 sec max timeout
    let aCount = 0;
    let bCount = 0;
    let cCount = 0;

    const a = Tracker.autorun(() => {
      TimeSync.serverTime(null, 500);
      aCount++;
    });

    const b = Tracker.autorun(() => {
      TimeSync.serverTime();
      bCount++;
    });

    const c = Tracker.autorun(() => {
      TimeSync.serverTime(null, 2000);
      cCount++;
    });

    const testInterval = 4990;

    Meteor.setTimeout(() => {

      assert.equal(aCount, 10); // 0, 500, 1000, 1500 ...
      // not going to be 5 since the first tick won't generate this dep
      assert.equal(bCount, 6);
      assert.equal(cCount, 3); // 0, 2000, 4000

      assert.isTrue(!!SyncInternals.timeTick[500]);
      assert.isTrue(!!SyncInternals.timeTick[1000]);
      assert.isTrue(!!SyncInternals.timeTick[2000]);

      assert.equal(Object.keys(SyncInternals.timeTick).length, 3);

      a.stop();
      b.stop();
      c.stop();

      done()
    }, testInterval);

  });

  it("basic - DDP timeSync", function (done) {
    Meteor.call('_timeSync', function (err, res) {
      if (err) {
        return done(err);
      }
      assert.isTrue(isNumber(res));

      // Make sure it's close to the current time on the client. This should
      // always be true in PhantomJS tests where client/server are the same
      // machine, although it might fail in development environments, for example
      // when the server and client are different VMs.
      assert.isTrue(Math.abs(res - Date.now()) < 1000);

      done();
    });
  });

  it("basic - HTTP timeSync", function (next) {
    const syncUrl = TimeSync.getSyncUrl();

    assert.isNotNull(syncUrl);

    fetch(syncUrl, { method: 'GET' })
      .then(res => res.text())
      .then(res => {
        assert.isTrue(!!res);
        const serverTime = parseInt(res,10);
        assert.isTrue(isNumber(serverTime));
        assert.isTrue(Math.abs(serverTime - Date.now()) < 1000);
        next();
      })
      .catch(err => {
        console.dir(err)
        if (err) {
          assert.fail();
          next();
        }
    });
  });

  // Regression tests for the Cordova/Capacitor fix: on mobile webviews the HTTP
  // request to /_timesync can fail (CORS, URL resolution). updateOffset()
  // should force DDP transport when Meteor.isCordova is true.
  describe('transport selection', () => {
    // Spy on the transport layer so we can assert which one updateOffset()
    // picked. Returns a cleanup function that restores the originals.
    function installTransportSpies(syncUrl, counters) {
      const originalCallAsync = Meteor.callAsync;
      const originalFetch = globalThis.fetch;

      Meteor.callAsync = function (methodName) {
        if (methodName === '_timeSync') counters.ddp++;
        return originalCallAsync.apply(this, arguments);
      };

      globalThis.fetch = function (url) {
        const urlString = typeof url === 'string' ? url : (url && url.url);
        if (urlString === syncUrl) counters.http++;
        return originalFetch.apply(this, arguments);
      };

      return function restore() {
        Meteor.callAsync = originalCallAsync;
        globalThis.fetch = originalFetch;
      };
    }

    it('forces DDP transport when Meteor.isCordova is true', function (done) {
      this.timeout(10000);

      const originalIsCordova = Meteor.isCordova;
      const originalForceDDP = TimeSync.forceDDP;
      const originalUseDDP = SyncInternals.useDDP;
      const syncUrl = TimeSync.getSyncUrl();

      const counters = { ddp: 0, http: 0 };
      const restoreSpies = installTransportSpies(syncUrl, counters);

      // Simulate a Cordova client whose DDP connection flag has not yet flipped.
      // Without the fix, this combination would route through HTTP fetch.
      Meteor.isCordova = true;
      TimeSync.forceDDP = false;
      SyncInternals.useDDP = false;

      function cleanup() {
        restoreSpies();
        Meteor.isCordova = originalIsCordova;
        TimeSync.forceDDP = originalForceDDP;
        SyncInternals.useDDP = originalUseDDP;
        // A second resync rearms the internal setInterval with the restored
        // state, avoiding a transport-mismatched timer leaking into later tests.
        TimeSync.resync();
      }

      TimeSync.resync();

      simplePoll(
        () => counters.ddp >= 1,
        () => {
          cleanup();
          try {
            assert.isAtLeast(counters.ddp, 1,
              "Meteor.callAsync('_timeSync') must be used on Cordova");
            assert.equal(counters.http, 0,
              "HTTP fetch to the sync URL must not be used on Cordova");
            done();
          } catch (err) {
            done(err);
          }
        },
        () => {
          cleanup();
          done(new Error('Cordova client did not route through DDP within 5s'));
        },
        5000, 50
      );
    });

    it('uses HTTP transport on a plain browser by default', function (done) {
      this.timeout(10000);

      const originalIsCordova = Meteor.isCordova;
      const originalForceDDP = TimeSync.forceDDP;
      const originalUseDDP = SyncInternals.useDDP;
      const syncUrl = TimeSync.getSyncUrl();

      const counters = { ddp: 0, http: 0 };
      const restoreSpies = installTransportSpies(syncUrl, counters);

      Meteor.isCordova = false;
      TimeSync.forceDDP = false;
      SyncInternals.useDDP = false;

      function cleanup() {
        restoreSpies();
        Meteor.isCordova = originalIsCordova;
        TimeSync.forceDDP = originalForceDDP;
        SyncInternals.useDDP = originalUseDDP;
        TimeSync.resync();
      }

      TimeSync.resync();

      simplePoll(
        () => counters.http >= 1,
        () => {
          cleanup();
          try {
            assert.isAtLeast(counters.http, 1,
              'HTTP fetch to the sync URL must be used on a plain browser');
            assert.equal(counters.ddp, 0,
              "Meteor.callAsync('_timeSync') must not be used on a plain browser");
            done();
          } catch (err) {
            done(err);
          }
        },
        () => {
          cleanup();
          done(new Error('Browser client did not route through HTTP within 5s'));
        },
        5000, 50
      );
    });
  });
});