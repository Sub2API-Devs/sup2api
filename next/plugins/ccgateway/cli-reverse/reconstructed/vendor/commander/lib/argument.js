/**
 * commander/lib/argument.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-ardnz7sf.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_error } from "./error.js";

//@ chunk-ardnz7sf.js:707-1889 cjs-fingerprint
var require_argument = __commonJS(function (cjsExports) {
  var { InvalidArgumentError } = require_error();
  class Argument {
    constructor(name, description) {
      switch (
        ((this.description = description || ""),
        (this.variadic = false),
        (this.parseArg = undefined),
        (this.defaultValue = undefined),
        (this.defaultValueDescription = undefined),
        (this.argChoices = undefined),
        name[0])
      ) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg))
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        if (this.variadic) return this._concatValue(arg, previous);
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    let nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  cjsExports.Argument = Argument;
  cjsExports.humanReadableArgName = humanReadableArgName;
});
export { require_argument };
