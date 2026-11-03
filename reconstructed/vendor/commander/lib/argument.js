/**
 * commander/lib/argument.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { b } from "./error.js";

//@ chunk-b7dyevzy.js:707-1889 cjs-fingerprint
var H = x(function (ot) {
  var { InvalidArgumentError: InvalidArgumentError } = b();
  class q {
    constructor(t, e) {
      switch (
        ((this.description = e || ""),
        (this.variadic = !1),
        (this.parseArg = void 0),
        (this.defaultValue = void 0),
        (this.defaultValueDescription = void 0),
        (this.argChoices = void 0),
        t[0])
      ) {
        case "<":
          ((this.required = !0), (this._name = t.slice(1, -1)));
          break;
        case "[":
          ((this.required = !1), (this._name = t.slice(1, -1)));
          break;
        default:
          ((this.required = !0), (this._name = t));
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...")
        ((this.variadic = !0), (this._name = this._name.slice(0, -3)));
    }
    name() {
      return this._name;
    }
    _concatValue(t, e) {
      if (e === this.defaultValue || !Array.isArray(e)) return [t];
      return e.concat(t);
    }
    default(t, e) {
      return ((this.defaultValue = t), (this.defaultValueDescription = e), this);
    }
    argParser(t) {
      return ((this.parseArg = t), this);
    }
    choices(t) {
      return (
        (this.argChoices = t.slice()),
        (this.parseArg = (e, i) => {
          if (!this.argChoices.includes(e))
            throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
          if (this.variadic) return this._concatValue(e, i);
          return e;
        }),
        this
      );
    }
    argRequired() {
      return ((this.required = !0), this);
    }
    argOptional() {
      return ((this.required = !1), this);
    }
  }
  function rt(t) {
    let e = t.name() + (t.variadic === !0 ? "..." : "");
    return t.required ? "<" + e + ">" : "[" + e + "]";
  }
  ot.Argument = q;
  ot.humanReadableArgName = rt;
});

export { H };
