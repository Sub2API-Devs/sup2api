/**
 * commander/lib/option.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { b } from "./error.js";

//@ chunk-b7dyevzy.js:6481-8871 cjs-fingerprint
var D = x(function (ft) {
  var { InvalidArgumentError: InvalidArgumentError } = b();
  class M {
    constructor(t, e) {
      ((this.flags = t),
        (this.description = e || ""),
        (this.required = t.includes("<")),
        (this.optional = t.includes("[")),
        (this.variadic = /\w\.\.\.[>\]]$/.test(t)),
        (this.mandatory = !1));
      let i = dt(t);
      if (((this.short = i.shortFlag), (this.long = i.longFlag), (this.negate = !1), this.long))
        this.negate = this.long.startsWith("--no-");
      ((this.defaultValue = void 0),
        (this.defaultValueDescription = void 0),
        (this.presetArg = void 0),
        (this.envVar = void 0),
        (this.parseArg = void 0),
        (this.hidden = !1),
        (this.argChoices = void 0),
        (this.conflictsWith = []),
        (this.implied = void 0));
    }
    default(t, e) {
      return ((this.defaultValue = t), (this.defaultValueDescription = e), this);
    }
    preset(t) {
      return ((this.presetArg = t), this);
    }
    conflicts(t) {
      return ((this.conflictsWith = this.conflictsWith.concat(t)), this);
    }
    implies(t) {
      let e = t;
      if (typeof t === "string") e = { [t]: !0 };
      return ((this.implied = Object.assign(this.implied || {}, e)), this);
    }
    env(t) {
      return ((this.envVar = t), this);
    }
    argParser(t) {
      return ((this.parseArg = t), this);
    }
    makeOptionMandatory(t = !0) {
      return ((this.mandatory = !!t), this);
    }
    hideHelp(t = !0) {
      return ((this.hidden = !!t), this);
    }
    _concatValue(t, e) {
      if (e === this.defaultValue || !Array.isArray(e)) return [t];
      return e.concat(t);
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
    name() {
      if (this.long) return this.long.replace(/^--/, "");
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return pt(this.name().replace(/^no-/, ""));
    }
    is(t) {
      return this.short === t || this.long === t;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }
  class j {
    constructor(t) {
      ((this.positiveOptions = new Map()),
        (this.negativeOptions = new Map()),
        (this.dualOptions = new Set()),
        t.forEach((e) => {
          if (e.negate) this.negativeOptions.set(e.attributeName(), e);
          else this.positiveOptions.set(e.attributeName(), e);
        }),
        this.negativeOptions.forEach((negativeOption, i) => {
          if (this.positiveOptions.has(i)) this.dualOptions.add(i);
        }));
    }
    valueFromOption(t, e) {
      let attributeName = e.attributeName();
      if (!this.dualOptions.has(attributeName)) return !0;
      let presetArg = this.negativeOptions.get(attributeName).presetArg,
        s = presetArg !== void 0 ? presetArg : !1;
      return e.negate === (s === t);
    }
  }
  function pt(t) {
    return t.split("-").reduce((e, i) => e + i[0].toUpperCase() + i.slice(1));
  }
  function dt(t) {
    let e,
      i,
      parts = t.split(/[ |,]+/);
    if (parts.length > 1 && !/^[[<]/.test(parts[1])) e = parts.shift();
    if (((i = parts.shift()), !e && /^-[^-]$/.test(i))) ((e = i), (i = void 0));
    return { shortFlag: e, longFlag: i };
  }
  ft.Option = M;
  ft.DualOptions = j;
});

export { D };
