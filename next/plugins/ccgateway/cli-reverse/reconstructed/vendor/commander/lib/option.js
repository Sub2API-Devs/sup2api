/**
 * commander/lib/option.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-ardnz7sf.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_error } from "./error.js";

//@ chunk-ardnz7sf.js:6481-8871 cjs-fingerprint
var require_option = __commonJS(function (cjsExports) {
  var { InvalidArgumentError } = require_error();
  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      let optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) this.negate = this.long.startsWith("--no-");
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string")
        newImplied = {
          [impliedOptionValues]: true,
        };
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
      return previous.concat(value);
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
    name() {
      if (this.long) return this.long.replace(/^--/, "");
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }
  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map();
      this.negativeOptions = new Map();
      this.dualOptions = new Set();
      options.forEach((option) => {
        if (option.negate) this.negativeOptions.set(option.attributeName(), option);
        else this.positiveOptions.set(option.attributeName(), option);
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) this.dualOptions.add(key);
      });
    }
    valueFromOption(value, option) {
      let optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey)) return true;
      let preset = this.negativeOptions.get(optionKey).presetArg;
      let negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str, word) => str + word[0].toUpperCase() + word.slice(1));
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    let flagParts = flags.split(/[ |,]+/);
    if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
    longFlag = flagParts.shift();
    if (!shortFlag && /^-[^-]$/.test(longFlag)) {
      shortFlag = longFlag;
      longFlag = undefined;
    }
    return {
      shortFlag,
      longFlag,
    };
  }
  cjsExports.Option = Option;
  cjsExports.DualOptions = DualOptions;
});
export { require_option };
