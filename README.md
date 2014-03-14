meteor-timesync
===============

NTP-style time synchronization between server and client.

## What's this do?

Meteor clients don't necessarily have accurate timestamps relative to your server. This package computes and maintains an offset between server and client, allowing server timestamps to be used on the client (especially for displaying time differences). It also provides facilities to use time reactively in your application.

## Installation

```
mrt add timesync
```

## Usage

- `TimeSync.serverTime(clientTime)`: returns the server time for a given client time. A reactive variable. If `clientTime` is not omitted, returns the current time on the server which reactively updates every second.
- `TimeSync.serverOffset()`: returns the current time difference between the server and the client. Reactively updates as the offset is recomputed.
- `TimeSync.isSynced()`: Reactive variable that determines if an initial sync has taken place.

To use the above functions in a non-reactive context, use [`Deps.nonreactive`](http://docs.meteor.com/#deps_nonreactive). This is useful if you are displaying a lot of timestamps or differences on a page and you don't want them to be constantly recomputed on the client. Things should get a lot more efficient when [Blaze (Meteor UI)](https://groups.google.com/forum/#!topic/meteor-talk/fFPWxgNVFE4) is released.

## Notes

- This library is a crude approximation of NTP, at the moment. We could definitely do something smarter and more accurate, with multiple measurements and exponentially weighted updating, if something calls for that degree of accuracy.
- Check out the moment library [packaged for meteor](https://github.com/acreeger/meteor-moment) for formatting and displaying the differences computed by this package.
