/**
 * chalk/source/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-4ymxyb4g.js (14)
 * attribution: esm-layout 5, esm-fingerprint 9
 */
import { supportsColor_default, h } from "./vendor/supports-color/index.js";

//@ chunk-4ymxyb4g.js:4788-4951 esm-layout
function S(e, close, open) {
  let index = e.indexOf(close);
  if (index === -1) return e;
  let n = close.length;
  let a = 0;
  let c = "";
  do {
    c += e.slice(a, index) + close + open;
    a = index + n;
    index = e.indexOf(close, a);
  } while (index !== -1);
  c += e.slice(a);
  return c;
}
//@ chunk-4ymxyb4g.js:4951-5109 esm-layout
function L(e, closeAll, openAll, lfIndex) {
  let n = 0;
  let a = "";
  do {
    let c = e[lfIndex - 1] === "\r";
    a +=
      e.slice(n, c ? lfIndex - 1 : lfIndex) +
      closeAll +
      (c
        ? `\r
`
        : `
`) +
      openAll;
    n = lfIndex + 1;
    lfIndex = e.indexOf(
      `
`,
      n,
    );
  } while (lfIndex !== -1);
  a += e.slice(n);
  return a;
}
//@ chunk-4ymxyb4g.js:5109-5455 esm-fingerprint
var { stdout: stdoutColor, stderr: stderrColor } = supportsColor_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = ["ansi", "ansi", "ansi256", "ansi16m"];
var styles = Object.create(null);
var H = (chalk, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3))
    throw Error("The `level` option should be an integer from 0 to 3");
  let level = stdoutColor ? stdoutColor.level : 0;
  chalk.level = options.level === undefined ? level : options.level;
};
//@ chunk-4ymxyb4g.js:5455-5493 esm-layout
class Chalk {
  constructor(options) {
    return chalkFactory(options);
  }
}
//@ chunk-4ymxyb4g.js:5493-5585 esm-fingerprint
var chalkFactory = (options) => {
  let chalk = (...strings) => strings.join(" ");
  H(chalk, options);
  Object.setPrototypeOf(chalk, createChalk.prototype);
  return chalk;
};
//@ chunk-4ymxyb4g.js:5585-5611 esm-layout
function createChalk(options) {
  return chalkFactory(options);
}
//@ chunk-4ymxyb4g.js:5611-5665 esm-fingerprint
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
//@ chunk-4ymxyb4g.js:5665-5809 esm-fingerprint
for (let [styleName, style] of Object.entries(h))
  styles[styleName] = {
    get() {
      let builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, {
        value: builder,
      });
      return builder;
    },
  };
//@ chunk-4ymxyb4g.js:5809-5910 esm-fingerprint
styles.visible = {
  get() {
    let builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", {
      value: builder,
    });
    return builder;
  },
};
//@ chunk-4ymxyb4g.js:5910-6184 esm-fingerprint
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") return h[type].ansi16m(...arguments_);
    if (level === "ansi256") return h[type].ansi256(h.rgbToAnsi256(...arguments_));
    return h[type].ansi(h.rgbToAnsi(...arguments_));
  }
  if (model === "hex") return getModelAnsi("rgb", level, type, ...h.hexToRgb(...arguments_));
  return h[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
//@ chunk-4ymxyb4g.js:6184-6513 esm-fingerprint
for (let model of usedModels) {
  styles[model] = {
    get() {
      let { level } = this;
      return function (...arguments_) {
        let styler = createStyler(
          getModelAnsi(model, levelMapping[level], "color", ...arguments_),
          h.color.close,
          this[STYLER],
        );
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    },
  };
  let r = "bg" + model[0].toUpperCase() + model.slice(1);
  styles[r] = {
    get() {
      let { level } = this;
      return function (...arguments_) {
        let styler = createStyler(
          getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_),
          h.bgColor.close,
          this[STYLER],
        );
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    },
  };
}
//@ chunk-4ymxyb4g.js:6513-7121 esm-fingerprint
var proto = Object.defineProperties(() => {}, {
  ...styles,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    },
  },
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent,
  };
};
var createBuilder = (e, _styler, _isEmpty) => {
  let builder = (...arguments_) =>
    applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = e;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (e, string) => {
  if (e.level <= 0 || !string) return e[IS_EMPTY] ? "" : string;
  let styler = e[STYLER];
  if (styler === undefined) return string;
  let { openAll, closeAll } = styler;
  if (string.includes("\x1B"))
    while (styler !== undefined) {
      string = S(string, styler.close, styler.open);
      styler = styler.parent;
    }
  let lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) string = L(string, closeAll, openAll, lfIndex);
  return openAll + string + closeAll;
};
//@ chunk-4ymxyb4g.js:7121-7160 esm-fingerprint
Object.defineProperties(createChalk.prototype, styles);
//@ chunk-4ymxyb4g.js:7160-7196 esm-layout
var Z = createChalk();
var chalkStderr = createChalk({
  level: stderrColor ? stderrColor.level : 0,
});
export { Z, Chalk };
