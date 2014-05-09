meteor-timesync
===============

NTP-style time synchronization between server and client.

## What's this do?

Meteor clients don't necessarily have accurate timestamps relative to your server. This package computes and maintains an offset between server and client, allowing server timestamps to be used on the client (especially for displaying time differences). It also provides facilities to use time reactively in your application.

There is a demo as part of the user-status app at http://user-status.meteor.com.

## Installation

```
mrt add timesync
```

## Usage

- `TimeSync.serverTime(clientTime)`: returns the server time for a given client time. A reactive variable which changes with the computed offset. If `clientTime` is omitted, returns the current time on the server, reactively updating every second.
- `TimeSync.serverOffset()`: returns the current time difference between the server and the client. Reactively updates as the offset is recomputed.
- `TimeSync.roundTripTime()`: The round trip ping to the server. Also reactive.
- `TimeSync.isSynced()`: Reactive variable that determines if an initial sync has taken place.
- `TimeSync.resync()`: Re-triggers a sync with the server. Can be useful because the initial sync often takes place during a lot of traffic with the server and could be less accurate.
- `TimeSync.watchClockChanges(boolean)`: Call this with `true` to turn on watching for major client-side clock changes, which will trigger a re-sync. Call it with `false` to turn off. This is opt-in; defaults to off.

To use the above functions in a non-reactive context, use [`Deps.nonreactive`](http://docs.meteor.com/#deps_nonreactive). This is useful if you are displaying a lot of timestamps or differences on a page and you don't want them to be constantly recomputed on the client. However, displaying time reactively should be pretty efficient with Meteor 0.8.0+ (Blaze).

## Notes

- This library is a crude approximation of NTP, at the moment. It's empirically shown to be accurate to under 100 ms on the meteor.com servers.
- We could definitely do something smarter and more accurate, with multiple measurements and exponentially weighted updating.
- Check out the moment library [packaged for meteor](https://github.com/acreeger/meteor-moment) for formatting and displaying the differences computed by this package.
