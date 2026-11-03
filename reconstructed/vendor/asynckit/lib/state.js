/**
 * asynckit/lib/state.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (4)
 * attribution: cjs-fingerprint 4
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_asynckit } from "../index.js";
import { require_abort } from "./abort.js";

//@ chunk-h6b7mazd.js:5825-6165 cjs-fingerprint
var require_state_2 = x(function (cjsExports, cjsModule) {
  var Pn = require_asynckit();
  var La = require_abort();
  cjsModule.exports = Ba;
  function Ba(e, t, r, n) {
    var o = r.keyedList ? r.keyedList[r.index] : r.index;
    r.jobs[o] = Na(t, o, e[o], function (s, i) {
      if (!(o in r.jobs)) return;
      delete r.jobs[o];
      if (s) La(r);
      else r.results[o] = i;
      n(s, r.results);
    });
  }
  function Na(e, t, r, n) {
    var o;
    if (e.length == 2) o = e(r, Pn(n));
    else o = e(r, t, Pn(n));
    return o;
  }
});
//@ chunk-h6b7mazd.js:6165-6428 cjs-fingerprint
var require_state = x(function (cjsExports, cjsModule) {
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
//@ chunk-h6b7mazd.js:6428-6601 cjs-fingerprint
var require_state_4 = x(function (cjsExports, cjsModule) {
  var Ua = require_abort();
  var qa = require_asynckit();
  cjsModule.exports = state;
  function state(list) {
    if (!Object.keys(this.jobs).length) return;
    this.index = this.size;
    Ua(this);
    qa(list)(null, this.results);
  }
});
//@ chunk-h6b7mazd.js:6601-6876 cjs-fingerprint
var require_state_3 = x(function (cjsExports, cjsModule) {
  var ka = require_state_2();
  var Ma = require_state();
  var Ha = require_state_4();
  cjsModule.exports = state;
  function state(e, t, r) {
    var n = Ma(e);
    while (n.index < (n.keyedList || e).length) {
      ka(e, t, n, function (o, s) {
        if (o) {
          r(o, s);
          return;
        }
        if (Object.keys(n.jobs).length === 0) {
          r(null, n.results);
          return;
        }
      });
      n.index++;
    }
    return Ha.bind(n, r);
  }
});
export { require_state_3, require_state_2, require_state, require_state_4 };
