/**
 * chalk/source/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-4ymxyb4g.js (14)
 * attribution: esm-layout 5, esm-fingerprint 9
 */
import { supportsColor_default, ansiStylesAlias } from "./vendor/supports-color/index.js";

//@ chunk-4ymxyb4g.js:4788-4951 esm-layout
function stringReplaceAll(string, close, open) {
  let index = string.indexOf(close);
  if (index === -1) return string;
  let substringLength = close.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + close + open;
    endIndex = index + substringLength;
    index = string.indexOf(close, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
//@ chunk-4ymxyb4g.js:4951-5109 esm-layout
function stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex) {
  let endIndex = 0;
  let returnValue = "";
  do {
    let isGotCR = string[lfIndex - 1] === "\r";
    returnValue +=
      string.slice(endIndex, isGotCR ? lfIndex - 1 : lfIndex) +
      closeAll +
      (isGotCR
        ? `\r
`
        : `
`) +
      openAll;
    endIndex = lfIndex + 1;
    lfIndex = string.indexOf(
      `
`,
      endIndex,
    );
  } while (lfIndex !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
//@ chunk-4ymxyb4g.js:5109-5455 esm-fingerprint
var { stdout: stdoutColor, stderr: stderrColor } = supportsColor_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = ["ansi", "ansi", "ansi256", "ansi16m"];
var styles = Object.create(null);
var applyOptions = (chalk, options = {}) => {
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
  applyOptions(chalk, options);
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
for (let [styleName, style] of Object.entries(ansiStylesAlias))
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
    if (level === "ansi16m") return ansiStylesAlias[type].ansi16m(...arguments_);
    if (level === "ansi256")
      return ansiStylesAlias[type].ansi256(ansiStylesAlias.rgbToAnsi256(...arguments_));
    return ansiStylesAlias[type].ansi(ansiStylesAlias.rgbToAnsi(...arguments_));
  }
  if (model === "hex") return getModelAnsi("rgb", level, type, ...ansiStylesAlias.hexToRgb(...arguments_));
  return ansiStylesAlias[type][model](...arguments_);
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
          ansiStylesAlias.color.close,
          this[STYLER],
        );
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    },
  };
  let styleName = "bg" + model[0].toUpperCase() + model.slice(1);
  styles[styleName] = {
    get() {
      let { level } = this;
      return function (...arguments_) {
        let styler = createStyler(
          getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_),
          ansiStylesAlias.bgColor.close,
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
var createBuilder = (parent, _styler, _isEmpty) => {
  let builder = (...arguments_) =>
    applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = parent;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (builder, string) => {
  if (builder.level <= 0 || !string) return builder[IS_EMPTY] ? "" : string;
  let styler = builder[STYLER];
  if (styler === undefined) return string;
  let { openAll, closeAll } = styler;
  if (string.includes("\x1B"))
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  let lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  return openAll + string + closeAll;
};
//@ chunk-4ymxyb4g.js:7121-7160 esm-fingerprint
Object.defineProperties(createChalk.prototype, styles);
//@ chunk-4ymxyb4g.js:7160-7196 esm-layout
var chalk = createChalk();
var chalkStderr = createChalk({
  level: stderrColor ? stderrColor.level : 0,
});
export { chalk, Chalk };
