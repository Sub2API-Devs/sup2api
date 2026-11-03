/**
 * node-forge/lib/log.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:275290-277737 cjs-fingerprint
var uC = x(function (Wfe, cC) {
  var $n = Tn();
  Zn();
  cC.exports = $n.log = $n.log || {};
  $n.log.levels = ["none", "error", "warning", "info", "debug", "verbose", "max"];
  var mm = {},
    ZS = [],
    Rf = null;
  $n.log.LEVEL_LOCKED = 2;
  $n.log.NO_LEVEL_CHECK = 4;
  $n.log.INTERPOLATE = 8;
  for (Oi = 0; Oi < $n.log.levels.length; ++Oi)
    ((pm = $n.log.levels[Oi]), (mm[pm] = { index: Oi, name: pm.toUpperCase() }));
  var pm, Oi;
  $n.log.logMessage = function (e) {
    var index = mm[e.level].index;
    for (var r = 0; r < ZS.length; ++r) {
      var s = ZS[r];
      if (s.flags & $n.log.NO_LEVEL_CHECK) s.f(e);
      else {
        var index_2 = mm[s.level].index;
        if (index <= index_2) s.f(s, e);
      }
    }
  };
  $n.log.prepareStandard = function (e) {
    if (!("standard" in e)) e.standard = mm[e.level].name + " [" + e.category + "] " + e.message;
  };
  $n.log.prepareFull = function (e) {
    if (!("full" in e)) {
      var n = [e.message];
      ((n = n.concat([])), (e.full = $n.util.format.apply(this, n)));
    }
  };
  $n.log.prepareStandardFull = function (e) {
    if (!("standardFull" in e)) ($n.log.prepareStandard(e), (e.standardFull = e.standard));
  };
  hm = ["error", "warning", "info", "debug", "verbose"];
  for (Oi = 0; Oi < hm.length; ++Oi)
    (function (n) {
      $n.log[n] = function (r, s) {
        var sliced = Array.prototype.slice.call(arguments).slice(2),
          y = { timestamp: new Date(), level: n, category: r, message: s, arguments: sliced };
        $n.log.logMessage(y);
      };
    })(hm[Oi]);
  var hm, Oi;
  $n.log.makeLogger = function (e) {
    var n = { flags: 0, f: e };
    return ($n.log.setLevel(n, "none"), n);
  };
  $n.log.setLevel = function (e, n) {
    var r = !1;
    if (e && !(e.flags & $n.log.LEVEL_LOCKED))
      for (var s = 0; s < $n.log.levels.length; ++s) {
        var h = $n.log.levels[s];
        if (n == h) {
          ((e.level = n), (r = !0));
          break;
        }
      }
    return r;
  };
  $n.log.lock = function (e, n) {
    if (typeof n > "u" || n) e.flags |= $n.log.LEVEL_LOCKED;
    else e.flags &= ~$n.log.LEVEL_LOCKED;
  };
  $n.log.addLogger = function (e) {
    ZS.push(e);
  };
  if (typeof console < "u" && "log" in console) {
    if (console.error && console.warn && console.info && console.debug)
      ((zS = {
        error: console.error,
        warning: console.warn,
        info: console.info,
        debug: console.debug,
        verbose: console.debug,
      }),
        (yu = function (e, n) {
          $n.log.prepareStandard(n);
          var r = zS[n.level],
            s = [n.standard];
          ((s = s.concat(n.arguments.slice())), r.apply(console, s));
        }),
        (fc = $n.log.makeLogger(yu)));
    else
      ((yu = function (n, r) {
        ($n.log.prepareStandardFull(r), console.log(r.standardFull));
      }),
        (fc = $n.log.makeLogger(yu)));
    ($n.log.setLevel(fc, "debug"), $n.log.addLogger(fc), (Rf = fc));
  } else console = { log: function () {} };
  var fc, zS, yu;
  if (Rf !== null && typeof window < "u" && window.location) {
    if (((gu = new URL(window.location.href).searchParams), gu.has("console.level")))
      $n.log.setLevel(Rf, gu.get("console.level").slice(-1)[0]);
    if (gu.has("console.lock")) {
      if (((XS = gu.get("console.lock").slice(-1)[0]), XS == "true")) $n.log.lock(Rf);
    }
  }
  var gu, XS;
  $n.log.consoleLogger = Rf;
});

export { uC };
