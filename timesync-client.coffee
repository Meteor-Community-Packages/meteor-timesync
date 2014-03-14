TimeSync = {}

offset = undefined
offsetDep = new Deps.Dependency
timeTick = new Deps.Dependency

# Reactive variable for server time that updates every second.
TimeSync.serverTime = (clientTime) ->
  return unless TimeSync.isSynced() # Don't try to add undefined to something.
  timeTick.depend() unless clientTime # No dependency for a fixed time
  offsetDep.depend()
  return (clientTime || Date.now()) + offset

# Reactive variable for the difference between server and client time.
TimeSync.serverOffset = ->
  offsetDep.depend()
  return offset

TimeSync.isSynced = ->
  offsetDep.depend()
  return offset?

# To be dumb and to save traffic right now, we just compute the offset once
# http://en.wikipedia.org/wiki/Network_Time_Protocol
updateOffset = ->
  t0 = Date.now()
  Meteor.call "_getServerTime", (err, ts) ->
    t3 = Date.now()

    if err
      Meteor._debug "Error syncing to server time: " + err
      # We'll still use our last computed offset if is defined
      return

    offset = ((ts - t0) + (ts - t3)) / 2
    offsetDep.changed()

updateOffset() # Run this as soon as we can!
Meteor.setInterval(updateOffset, 600000) # 10 minutes

Meteor.setInterval (-> timeTick.changed()), 1000
