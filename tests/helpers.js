import { Meteor } from 'meteor/meteor'

// Call `fn` periodically until it returns true.  If it does, call
// `success`.  If it doesn't before the timeout, call `failed`.
export const simplePoll = function (fn, success, failed, timeout, step) {
  timeout = timeout || 10000;
  step = step || 100;
  let start = (new Date()).valueOf();
  let timeOutId;
  let helper = function () {
    if (fn()) {
      success();
      Meteor.clearTimeout(timeOutId);
      return;
    }
    if (start + timeout < (new Date()).valueOf()) {
      failed();
      Meteor.clearTimeout(timeOutId);
      return;
    }
    timeOutId = Meteor.setTimeout(helper, step);
  };
  helper();
};

export const isNumber = n => typeof n === 'number' && !isNaN(n);
