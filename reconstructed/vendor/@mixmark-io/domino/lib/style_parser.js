/**
 * @mixmark-io/domino/lib/style_parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:76494-77213 cjs-fingerprint
var require_style_parser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.hyphenate = cjsExports.parse = undefined;
  function parse(value) {
    let styles = [];
    let i = 0;
    let parenDepth = 0;
    let quote = 0;
    let valueStart = 0;
    let propStart = 0;
    let currentProp = null;
    while (i < value.length)
      switch (value.charCodeAt(i++)) {
        case 40:
          parenDepth++;
          break;
        case 41:
          parenDepth--;
          break;
        case 39:
          if (quote === 0) quote = 39;
          else if (quote === 39 && value.charCodeAt(i - 1) !== 92) quote = 0;
          break;
        case 34:
          if (quote === 0) quote = 34;
          else if (quote === 34 && value.charCodeAt(i - 1) !== 92) quote = 0;
          break;
        case 58:
          if (!currentProp && parenDepth === 0 && quote === 0) {
            currentProp = hyphenate(value.substring(propStart, i - 1).trim());
            valueStart = i;
          }
          break;
        case 59:
          if (currentProp && valueStart > 0 && parenDepth === 0 && quote === 0) {
            let styleVal = value.substring(valueStart, i - 1).trim();
            styles.push(currentProp, styleVal);
            propStart = i;
            valueStart = 0;
            currentProp = null;
          }
          break;
      }
    if (currentProp && valueStart) {
      let styleVal = value.slice(valueStart).trim();
      styles.push(currentProp, styleVal);
    }
    return styles;
  }
  cjsExports.parse = parse;
  function hyphenate(value) {
    return value.replace(/[a-z][A-Z]/g, (v) => v.charAt(0) + "-" + v.charAt(1)).toLowerCase();
  }
  cjsExports.hyphenate = hyphenate;
});
export { require_style_parser };
