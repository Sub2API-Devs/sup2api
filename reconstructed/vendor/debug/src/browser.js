/**
 * debug/src/browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { vr } from "./common.js";

//@ chunk-h6b7mazd.js:30759-33381 cjs-fingerprint
var Is = x(function (Tr, Ut) {
  Tr.formatArgs = zc;
  Tr.save = $c;
  Tr.load = Vc;
  Tr.useColors = Hc;
  Tr.storage = Wc();
  Tr.destroy = (() => {
    let e = !1;
    return () => {
      if (!e)
        ((e = !0),
          console.warn(
            "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.",
          ));
    };
  })();
  Tr.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33",
  ];
  function Hc() {
    if (
      typeof window < "u" &&
      window.process &&
      (window.process.type === "renderer" || window.process.__nwjs)
    )
      return !0;
    if (
      typeof navigator < "u" &&
      navigator.userAgent &&
      navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)
    )
      return !1;
    let e;
    return (
      (typeof document < "u" &&
        document.documentElement &&
        document.documentElement.style &&
        document.documentElement.style.WebkitAppearance) ||
      (typeof window < "u" &&
        window.console &&
        (window.console.firebug || (window.console.exception && window.console.table))) ||
      (typeof navigator < "u" &&
        navigator.userAgent &&
        (e = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) &&
        parseInt(e[1], 10) >= 31) ||
      (typeof navigator < "u" &&
        navigator.userAgent &&
        navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/))
    );
  }
  function zc(e) {
    if (
      ((e[0] =
        (this.useColors ? "%c" : "") +
        this.namespace +
        (this.useColors ? " %c" : " ") +
        e[0] +
        (this.useColors ? "%c " : " ") +
        "+" +
        Ut.exports.humanize(this.diff)),
      !this.useColors)
    )
      return;
    let t = "color: " + this.color;
    e.splice(1, 0, t, "color: inherit");
    let r = 0,
      n = 0;
    (e[0].replace(/%[a-zA-Z%]/g, (o) => {
      if (o === "%%") return;
      if ((r++, o === "%c")) n = r;
    }),
      e.splice(n, 0, t));
  }
  Tr.log = console.debug || console.log || (() => {});
  function $c(e) {
    try {
      if (e) Tr.storage.setItem("debug", e);
      else Tr.storage.removeItem("debug");
    } catch (error) {}
  }
  function Vc() {
    let e;
    try {
      e = Tr.storage.getItem("debug");
    } catch (error) {}
    if (!e && typeof process < "u" && "env" in process) e = process.env.DEBUG;
    return e;
  }
  function Wc() {
    try {
      return localStorage;
    } catch (error) {}
  }
  Ut.exports = vr()(Tr);
  var { formatters: formatters } = Ut.exports;
  formatters.j = function (e) {
    try {
      return JSON.stringify(e);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});

export { Is };
