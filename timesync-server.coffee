Meteor.methods
  "_getServerTime": ->
    # What we'd really like to have here is the time this invocation arrived
    # while other things were executing, before the call got to this code.
    # This is what we need to get accuracy from ~200ms to single digits.

    # console.log DDP._CurrentInvocation.get()
    return Date.now()
