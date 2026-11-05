/**
 * asynckit/lib/state.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-ww9agm6g.js (4)
 * attribution: cjs-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_asynckit } from "../index.js";
import { require_abort } from "./abort.js";

//@ chunk-ww9agm6g.js:5825-6165 cjs-fingerprint
var asyncModule3 = __commonJS(function (cjsExports, cjsModule) {
  var asyncModule = require_asynckit();
  var abortModule = require_abort();
  cjsModule.exports = iterate;
  function iterate(list, iterator, state, callback) {
    var key = state.keyedList ? state.keyedList[state.index] : state.index;
    state.jobs[key] = runJob(iterator, key, list[key], function (error, output) {
      if (!(key in state.jobs)) return;
      delete state.jobs[key];
      if (error) abortModule(state);
      else state.results[key] = output;
      callback(error, state.results);
    });
  }
  function runJob(iterator, key, item, callback) {
    var aborter;
    if (iterator.length == 2) aborter = iterator(item, asyncModule(callback));
    else aborter = iterator(item, key, asyncModule(callback));
    return aborter;
  }
});
//@ chunk-ww9agm6g.js:6165-6428 cjs-fingerprint
var require_state = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = state;
  function state(list, sortMethod) {
    var isNamedList = !Array.isArray(list);
    var initState = {
      index: 0,
      keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
      jobs: {},
      results: isNamedList ? {} : [],
      size: isNamedList ? Object.keys(list).length : list.length,
    };
    if (sortMethod)
      initState.keyedList.sort(
        isNamedList
          ? sortMethod
          : function (a, b) {
              return sortMethod(list[a], list[b]);
            },
      );
    return initState;
  }
});
//@ chunk-ww9agm6g.js:6428-6601 cjs-fingerprint
var abortModule3 = __commonJS(function (cjsExports, cjsModule) {
  var abortModule2 = require_abort();
  var asyncModule2 = require_asynckit();
  cjsModule.exports = state;
  function state(list) {
    if (!Object.keys(this.jobs).length) return;
    this.index = this.size;
    abortModule2(this);
    asyncModule2(list)(null, this.results);
  }
});
//@ chunk-ww9agm6g.js:6601-6876 cjs-fingerprint
var require_state_2 = __commonJS(function (cjsExports, cjsModule) {
  var iterateModule = asyncModule3();
  var stateModule = require_state();
  var stateModule4 = abortModule3();
  cjsModule.exports = state;
  function state(list, iterator, callback) {
    var currentState = stateModule(list);
    while (currentState.index < (currentState.keyedList || list).length) {
      iterateModule(list, iterator, currentState, function (error, output) {
        if (error) {
          callback(error, output);
          return;
        }
        if (Object.keys(currentState.jobs).length === 0) {
          callback(null, currentState.results);
          return;
        }
      });
      currentState.index++;
    }
    return stateModule4.bind(currentState, callback);
  }
});
export { require_state_2, asyncModule3, require_state, abortModule3 };
