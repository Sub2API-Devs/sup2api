/**
 * debug/src/node.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_supports_color_2 } from "../../supports-color/index.js";
import { require_common } from "./common.js";

//@ chunk-ww9agm6g.js:35154-37209 cjs-fingerprint
var require_node = __commonJS(function (cjsExports, cjsModule) {
  var tty = importMetaRequire("tty");
  var util = importMetaRequire("util");
  cjsExports.init = init;
  cjsExports.log = log;
  cjsExports.formatArgs = formatArgs;
  cjsExports.save = save;
  cjsExports.load = load;
  cjsExports.useColors = useColors;
  cjsExports.destroy = util.deprecate(
    () => {},
    "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.",
  );
  cjsExports.colors = [6, 2, 3, 4, 5, 1];
  try {
    let supportsColor = require_supports_color_2();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2)
      cjsExports.colors = [
        20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68, 69, 74, 75, 76, 77, 78,
        79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134, 135, 148, 149, 160, 161, 162, 163, 164, 165, 166,
        167, 168, 169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201, 202, 203, 204,
        205, 206, 207, 208, 209, 214, 215, 220, 221,
      ];
  } catch (error) {}
  cjsExports.inspectOpts = Object.keys(process.env)
    .filter((key) => /^debug_/i.test(key))
    .reduce((obj, key) => {
      let prop = key
        .substring(6)
        .toLowerCase()
        .replace(/_([a-z])/g, (_, k) => k.toUpperCase());
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
      else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
      else if (val === "null") val = null;
      else val = Number(val);
      obj[prop] = val;
      return obj;
    }, {});
  function useColors() {
    return "colors" in cjsExports.inspectOpts
      ? Boolean(cjsExports.inspectOpts.colors)
      : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    let { namespace: name, useColors } = this;
    if (useColors) {
      let c = this.color;
      let colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      let prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] =
        prefix +
        args[0]
          .split(
            `
`,
          )
          .join(
            `
` + prefix,
          );
      args.push(colorCode + "m+" + cjsModule.exports.humanize(this.diff) + "\x1B[0m");
    } else args[0] = getDate() + name + " " + args[0];
  }
  function getDate() {
    if (cjsExports.inspectOpts.hideDate) return "";
    return new Date().toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(
      util.formatWithOptions(cjsExports.inspectOpts, ...args) +
        `
`,
    );
  }
  function save(namespaces) {
    if (namespaces) process.env.DEBUG = namespaces;
    else delete process.env.DEBUG;
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    let keys = Object.keys(cjsExports.inspectOpts);
    for (let i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = cjsExports.inspectOpts[keys[i]];
  }
  cjsModule.exports = require_common()(cjsExports);
  var { formatters } = cjsModule.exports;
  formatters.o = function (v) {
    this.inspectOpts.colors = this.useColors;
    return util
      .inspect(v, this.inspectOpts)
      .split(
        `
`,
      )
      .map((str) => str.trim())
      .join(" ");
  };
  formatters.O = function (v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});
export { require_node };
