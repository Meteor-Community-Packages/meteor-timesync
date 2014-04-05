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

- `TimeSync.serverTime(clientTime, handleChange)`: returns the server time for a given client time. A reactive variable. If `clientTime` is included, returns the current time on the server which reactively updates every second. If `handleChange` is `true`, a change of the client's clock will call `TimeSync.resync()`.
- `TimeSync.serverOffset()`: returns the current time difference between the server and the client. Reactively updates as the offset is recomputed.
- `TimeSync.roundTripTime()`: The round trip ping to the server. Also reactive.
- `TimeSync.isSynced()`: Reactive variable that determines if an initial sync has taken place.
- `TimeSync.resync()`: Re-triggers a sync with the server. Can be useful because the initial sync often takes place during a lot of method calls where the sync method may have been blocked for an arbitrary amount of time.

To use the above functions in a non-reactive context, use [`Deps.nonreactive`](http://docs.meteor.com/#deps_nonreactive). This is useful if you are displaying a lot of timestamps or differences on a page and you don't want them to be constantly recomputed on the client. Things should get a lot more efficient when [Blaze (Meteor UI)](https://groups.google.com/forum/#!topic/meteor-talk/fFPWxgNVFE4) is released.

## Notes

- This library is a crude approximation of NTP, at the moment. It's empirically shown to be accurate to under 100 ms on the meteor.com servers.
- We could definitely do something smarter and more accurate, with multiple measurements and exponentially weighted updating.
- Check out the moment library [packaged for meteor](https://github.com/acreeger/meteor-moment) for formatting and displaying the differences computed by this package.
