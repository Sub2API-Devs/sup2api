/**
 * debug/src/common.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_ms } from "../../ms/index.js";

//@ chunk-ww9agm6g.js:28648-30759 cjs-fingerprint
var require_common = __commonJS(function (cjsExports, cjsModule) {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) return;
        let selfRef = debug;
        let curr = Number(new Date());
        let ms = curr - (prevTime || curr);
        selfRef.diff = ms;
        selfRef.prev = prevTime;
        selfRef.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") args.unshift("%O");
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") return "%";
          index++;
          let formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            let val = args[index];
            match = formatter.call(selfRef, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(selfRef, args);
        (selfRef.log || createDebug.log).apply(selfRef, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) return enableOverride;
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        },
      });
      if (typeof createDebug.init === "function") createDebug.init(debug);
      return debug;
    }
    function extend(namespace, delimiter) {
      let newDebug = createDebug(
        this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace,
      );
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      let split = (typeof namespaces === "string" ? namespaces : "")
        .trim()
        .replace(" ", ",")
        .split(",")
        .filter(Boolean);
      for (let ns of split)
        if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
        else createDebug.names.push(ns);
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length)
        if (
          templateIndex < template.length &&
          (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")
        ) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else return false;
      while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
      return templateIndex === template.length;
    }
    function disable() {
      let namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(
        ",",
      );
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (let skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
      for (let ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) return val.stack || val.message;
      return val;
    }
    function destroy() {
      console.warn(
        "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.",
      );
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  cjsModule.exports = setup;
});
export { require_common };
