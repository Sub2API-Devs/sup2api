/**
 * commander/lib/help.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { H } from "./argument.js";

//@ chunk-b7dyevzy.js:1889-6481 cjs-fingerprint
var k = x(function (lt) {
  var { humanReadableArgName: humanReadableArgName } = H();
  class F {
    constructor() {
      ((this.helpWidth = void 0),
        (this.sortSubcommands = !1),
        (this.sortOptions = !1),
        (this.showGlobalOptions = !1));
    }
    visibleCommands(t) {
      let filtered = t.commands.filter((command) => !command._hidden),
        _getHelpCommand = t._getHelpCommand();
      if (_getHelpCommand && !_getHelpCommand._hidden) filtered.push(_getHelpCommand);
      if (this.sortSubcommands) filtered.sort((n, s) => n.name().localeCompare(s.name()));
      return filtered;
    }
    compareOptions(t, e) {
      let i = (n) => (n.short ? n.short.replace(/^-/, "") : n.long.replace(/^--/, ""));
      return i(t).localeCompare(i(e));
    }
    visibleOptions(t) {
      let filtered = t.options.filter((option) => !option.hidden),
        _getHelpOption = t._getHelpOption();
      if (_getHelpOption && !_getHelpOption.hidden) {
        let n = _getHelpOption.short && t._findOption(_getHelpOption.short),
          s = _getHelpOption.long && t._findOption(_getHelpOption.long);
        if (!n && !s) filtered.push(_getHelpOption);
        else if (_getHelpOption.long && !s)
          filtered.push(t.createOption(_getHelpOption.long, _getHelpOption.description));
        else if (_getHelpOption.short && !n)
          filtered.push(t.createOption(_getHelpOption.short, _getHelpOption.description));
      }
      if (this.sortOptions) filtered.sort(this.compareOptions);
      return filtered;
    }
    visibleGlobalOptions(t) {
      if (!this.showGlobalOptions) return [];
      let e = [];
      for (let parent = t.parent; parent; parent = parent.parent) {
        let filtered = parent.options.filter((option) => !option.hidden);
        e.push(...filtered);
      }
      if (this.sortOptions) e.sort(this.compareOptions);
      return e;
    }
    visibleArguments(t) {
      if (t._argsDescription)
        t.registeredArguments.forEach((registeredArgument) => {
          registeredArgument.description =
            registeredArgument.description || t._argsDescription[registeredArgument.name()] || "";
        });
      if (t.registeredArguments.find((registeredArgument) => registeredArgument.description))
        return t.registeredArguments;
      return [];
    }
    subcommandTerm(t) {
      let joined = t.registeredArguments
        .map((registeredArgument) => humanReadableArgName(registeredArgument))
        .join(" ");
      return (
        t._name +
        (t._aliases[0] ? "|" + t._aliases[0] : "") +
        (t.options.length ? " [options]" : "") +
        (joined ? " " + joined : "")
      );
    }
    optionTerm(t) {
      return t.flags;
    }
    argumentTerm(t) {
      return t.name();
    }
    longestSubcommandTermLength(t, e) {
      return e.visibleCommands(t).reduce((i, n) => Math.max(i, e.subcommandTerm(n).length), 0);
    }
    longestOptionTermLength(t, e) {
      return e.visibleOptions(t).reduce((i, n) => Math.max(i, e.optionTerm(n).length), 0);
    }
    longestGlobalOptionTermLength(t, e) {
      return e.visibleGlobalOptions(t).reduce((i, n) => Math.max(i, e.optionTerm(n).length), 0);
    }
    longestArgumentTermLength(t, e) {
      return e.visibleArguments(t).reduce((i, n) => Math.max(i, e.argumentTerm(n).length), 0);
    }
    commandUsage(t) {
      let _name = t._name;
      if (t._aliases[0]) _name = _name + "|" + t._aliases[0];
      let i = "";
      for (let parent = t.parent; parent; parent = parent.parent) i = parent.name() + " " + i;
      return i + _name + " " + t.usage();
    }
    commandDescription(t) {
      return t.description();
    }
    subcommandDescription(t) {
      return t.summary() || t.description();
    }
    optionDescription(t) {
      let e = [];
      if (t.argChoices)
        e.push(`choices: ${t.argChoices.map((argChoice) => JSON.stringify(argChoice)).join(", ")}`);
      if (t.defaultValue !== void 0) {
        if (t.required || t.optional || (t.isBoolean() && typeof t.defaultValue === "boolean"))
          e.push(`default: ${t.defaultValueDescription || JSON.stringify(t.defaultValue)}`);
      }
      if (t.presetArg !== void 0 && t.optional) e.push(`preset: ${JSON.stringify(t.presetArg)}`);
      if (t.envVar !== void 0) e.push(`env: ${t.envVar}`);
      if (e.length > 0) return `${t.description} (${e.join(", ")})`;
      return t.description;
    }
    argumentDescription(t) {
      let e = [];
      if (t.argChoices)
        e.push(`choices: ${t.argChoices.map((argChoice) => JSON.stringify(argChoice)).join(", ")}`);
      if (t.defaultValue !== void 0)
        e.push(`default: ${t.defaultValueDescription || JSON.stringify(t.defaultValue)}`);
      if (e.length > 0) {
        let i = `(${e.join(", ")})`;
        if (t.description) return `${t.description} ${i}`;
        return i;
      }
      return t.description;
    }
    formatHelp(t, e) {
      let padWidth = e.padWidth(t, e),
        n = e.helpWidth || 80,
        s = 2,
        r = 2;
      function a(p, O) {
        if (O) {
          let S = `${p.padEnd(padWidth + 2)}${O}`;
          return e.wrap(S, n - 2, padWidth + 2);
        }
        return p;
      }
      function o(p) {
        return p
          .join(
            `
`,
          )
          .replace(/^/gm, " ".repeat(2));
      }
      let h = [`Usage: ${e.commandUsage(t)}`, ""],
        commandDescription = e.commandDescription(t);
      if (commandDescription.length > 0) h = h.concat([e.wrap(commandDescription, n, 0), ""]);
      let mapped = e.visibleArguments(t).map((p) => a(e.argumentTerm(p), e.argumentDescription(p)));
      if (mapped.length > 0) h = h.concat(["Arguments:", o(mapped), ""]);
      let mapped_2 = e.visibleOptions(t).map((p) => a(e.optionTerm(p), e.optionDescription(p)));
      if (mapped_2.length > 0) h = h.concat(["Options:", o(mapped_2), ""]);
      if (this.showGlobalOptions) {
        let mapped = e.visibleGlobalOptions(t).map((O) => a(e.optionTerm(O), e.optionDescription(O)));
        if (mapped.length > 0) h = h.concat(["Global Options:", o(mapped), ""]);
      }
      let mapped_3 = e.visibleCommands(t).map((p) => a(e.subcommandTerm(p), e.subcommandDescription(p)));
      if (mapped_3.length > 0) h = h.concat(["Commands:", o(mapped_3), ""]);
      return h.join(`
`);
    }
    padWidth(t, e) {
      return Math.max(
        e.longestOptionTermLength(t, e),
        e.longestGlobalOptionTermLength(t, e),
        e.longestSubcommandTermLength(t, e),
        e.longestArgumentTermLength(t, e),
      );
    }
    wrap(t, e, i, n = 40) {
      let regExp = new RegExp(`[\\n][${" \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF"}]+`);
      if (t.match(regExp)) return t;
      let a = e - i;
      if (a < n) return t;
      let sliced = t.slice(0, i),
        replaced = t.slice(i).replace(
          `\r
`,
          `
`,
        ),
        repeat = " ".repeat(i),
        d = `\\s${"\u200B"}`,
        regExp_2 = new RegExp(
          `
|.{1,${a - 1}}([${d}]|$)|[^${d}]+?([${d}]|$)`,
          "g",
        ),
        p = replaced.match(regExp_2) || [];
      return (
        sliced +
        p.map((O, S) => {
          if (
            O ===
            `
`
          )
            return "";
          return (S > 0 ? repeat : "") + O.trimEnd();
        }).join(`
`)
      );
    }
  }
  lt.Help = F;
});

export { k };
