/**
 * debug/src/node.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Ms } from "../../supports-color/index.js";
import { vr } from "./common.js";

//@ chunk-h6b7mazd.js:35154-37209 cjs-fingerprint
var Vs = x(function (Fr, kt) {
  var Hs = importMetaRequire("tty"),
    me = importMetaRequire("util");
  Fr.init = lf;
  Fr.log = uf;
  Fr.formatArgs = sf;
  Fr.save = cf;
  Fr.load = ff;
  Fr.useColors = of;
  Fr.destroy = me.deprecate(
    () => {},
    "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.",
  );
  Fr.colors = [6, 2, 3, 4, 5, 1];
  try {
    let e = Ms();
    if (e && (e.stderr || e).level >= 2)
      Fr.colors = [
        20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68, 69, 74, 75, 76, 77, 78,
        79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134, 135, 148, 149, 160, 161, 162, 163, 164, 165, 166,
        167, 168, 169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201, 202, 203, 204,
        205, 206, 207, 208, 209, 214, 215, 220, 221,
      ];
  } catch (error) {}
  Fr.inspectOpts = Object.keys(process.env)
    .filter((e) => /^debug_/i.test(e))
    .reduce((e, t) => {
      let replaced = t
          .substring(6)
          .toLowerCase()
          .replace(/_([a-z])/g, (o, s) => s.toUpperCase()),
        n = process.env[t];
      if (/^(yes|on|true|enabled)$/i.test(n)) n = !0;
      else if (/^(no|off|false|disabled)$/i.test(n)) n = !1;
      else if (n === "null") n = null;
      else n = Number(n);
      return ((e[replaced] = n), e);
    }, {});
  function of() {
    return "colors" in Fr.inspectOpts ? Boolean(Fr.inspectOpts.colors) : Hs.isatty(process.stderr.fd);
  }
  function sf(e) {
    let { namespace: namespace, useColors: useColors } = this;
    if (useColors) {
      let color = this.color,
        o = "\x1B[3" + (color < 8 ? color : "8;5;" + color),
        s = `  ${o};1m${namespace} \x1B[0m`;
      ((e[0] =
        s +
        e[0]
          .split(
            `
`,
          )
          .join(
            `
` + s,
          )),
        e.push(o + "m+" + kt.exports.humanize(this.diff) + "\x1B[0m"));
    } else e[0] = af() + namespace + " " + e[0];
  }
  function af() {
    if (Fr.inspectOpts.hideDate) return "";
    return new Date().toISOString() + " ";
  }
  function uf(...e) {
    return process.stderr.write(
      me.formatWithOptions(Fr.inspectOpts, ...e) +
        `
`,
    );
  }
  function cf(e) {
    if (e) process.env.DEBUG = e;
    else delete process.env.DEBUG;
  }
  function ff() {
    return process.env.DEBUG;
  }
  function lf(e) {
    e.inspectOpts = {};
    let keys = Object.keys(Fr.inspectOpts);
    for (let r = 0; r < keys.length; r++) e.inspectOpts[keys[r]] = Fr.inspectOpts[keys[r]];
  }
  kt.exports = vr()(Fr);
  var { formatters: formatters } = kt.exports;
  formatters.o = function (e) {
    return (
      (this.inspectOpts.colors = this.useColors),
      me
        .inspect(e, this.inspectOpts)
        .split(
          `
`,
        )
        .map((t) => t.trim())
        .join(" ")
    );
  };
  formatters.O = function (e) {
    return ((this.inspectOpts.colors = this.useColors), me.inspect(e, this.inspectOpts));
  };
});

export { Vs };
