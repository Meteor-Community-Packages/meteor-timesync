// Forcibly shove our handler to the beginning of the connect stack
// so it goes as fast as possible
WebApp.connectHandlers.stack.splice(0, 0, {
  route: '/_timesync',
  handle: function(req, res, next) {
    res.end(Date.now().toString());
  }
});
