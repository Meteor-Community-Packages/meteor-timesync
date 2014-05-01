## v0.1.6

- Added the optional `TimeSync.watchClockChanges` which can resync if a client's clock is detected to have significantly changed.
- Added retry attempts to syncing, making it more robust over a hot code reload among other situations.

## v0.1.5

- Use `WebApp.rawConnectHandlers` as a less janky way of getting our date request handled first.
- Fixed an issue where a cached reload could result in a wacky time offset due to the server time being cached.

## v0.1.4

- Switch to JS at the request of @raix and @arunoda ;-)
- Use a middleware handler, spliced into the top of the connect stack, instead of a Meteor method to avoid arbitrary method blocking delay. This improves accuracy significantly.
- Compute a RTT value in `TimeSync.roundTripTime` as well as a time offset.

## v0.1.3

- Ensure that the computed offset is always an integer number of milliseconds.

## v0.1.2

- Added the `TimeSync.resync` function that triggers a resync with the server.

## v0.1.1

- Added the reactive function `TimeSync.isSynced` to determine if an initial sync has taken place.

## v0.1.0

- First release.
