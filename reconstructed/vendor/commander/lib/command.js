/**
 * commander/lib/command.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { H } from "./argument.js";
import { b } from "./error.js";
import { k } from "./help.js";
import { D } from "./option.js";
import { U } from "./suggestSimilar.js";

//@ chunk-b7dyevzy.js:9832-34778 cjs-fingerprint
var B = x(function (vt) {
  var EventEmitter = importMetaRequire("events").EventEmitter,
    C = importMetaRequire("child_process"),
    f = importMetaRequire("path"),
    A = importMetaRequire("fs"),
    l = importMetaRequire("process"),
    { Argument: Argument, humanReadableArgName: humanReadableArgName } = H(),
    { CommanderError: CommanderError } = b(),
    { Help: Help } = k(),
    { Option: Option, DualOptions: DualOptions } = D(),
    { suggestSimilar: suggestSimilar } = U();
  class I extends EventEmitter {
    constructor(t) {
      super();
      ((this.commands = []),
        (this.options = []),
        (this.parent = null),
        (this._allowUnknownOption = !1),
        (this._allowExcessArguments = !0),
        (this.registeredArguments = []),
        (this._args = this.registeredArguments),
        (this.args = []),
        (this.rawArgs = []),
        (this.processedArgs = []),
        (this._scriptPath = null),
        (this._name = t || ""),
        (this._optionValues = {}),
        (this._optionValueSources = {}),
        (this._storeOptionsAsProperties = !1),
        (this._actionHandler = null),
        (this._executableHandler = !1),
        (this._executableFile = null),
        (this._executableDir = null),
        (this._defaultCommandName = null),
        (this._exitCallback = null),
        (this._aliases = []),
        (this._combineFlagAndOptionalValue = !0),
        (this._description = ""),
        (this._summary = ""),
        (this._argsDescription = void 0),
        (this._enablePositionalOptions = !1),
        (this._passThroughOptions = !1),
        (this._lifeCycleHooks = {}),
        (this._showHelpAfterError = !1),
        (this._showSuggestionAfterError = !0),
        (this._outputConfiguration = {
          writeOut: (e) => l.stdout.write(e),
          writeErr: (e) => l.stderr.write(e),
          getOutHelpWidth: () => (l.stdout.isTTY ? l.stdout.columns : void 0),
          getErrHelpWidth: () => (l.stderr.isTTY ? l.stderr.columns : void 0),
          outputError: (e, i) => i(e),
        }),
        (this._hidden = !1),
        (this._helpOption = void 0),
        (this._addImplicitHelpCommand = void 0),
        (this._helpCommand = void 0),
        (this._helpConfiguration = {}));
    }
    copyInheritedSettings(t) {
      return (
        (this._outputConfiguration = t._outputConfiguration),
        (this._helpOption = t._helpOption),
        (this._helpCommand = t._helpCommand),
        (this._helpConfiguration = t._helpConfiguration),
        (this._exitCallback = t._exitCallback),
        (this._storeOptionsAsProperties = t._storeOptionsAsProperties),
        (this._combineFlagAndOptionalValue = t._combineFlagAndOptionalValue),
        (this._allowExcessArguments = t._allowExcessArguments),
        (this._enablePositionalOptions = t._enablePositionalOptions),
        (this._showHelpAfterError = t._showHelpAfterError),
        (this._showSuggestionAfterError = t._showSuggestionAfterError),
        this
      );
    }
    _getCommandAndAncestors() {
      let t = [];
      for (let e = this; e; e = e.parent) t.push(e);
      return t;
    }
    command(t, e, i) {
      let n = e,
        s = i;
      if (typeof n === "object" && n !== null) ((s = n), (n = null));
      s = s || {};
      let [, r, a] = t.match(/([^ ]+) *(.*)/),
        command = this.createCommand(r);
      if (n) (command.description(n), (command._executableHandler = !0));
      if (s.isDefault) this._defaultCommandName = command._name;
      if (
        ((command._hidden = !!(s.noHelp || s.hidden)),
        (command._executableFile = s.executableFile || null),
        a)
      )
        command.arguments(a);
      if ((this._registerCommand(command), (command.parent = this), command.copyInheritedSettings(this), n))
        return this;
      return command;
    }
    createCommand(t) {
      return new I(t);
    }
    createHelp() {
      return Object.assign(new Help(), this.configureHelp());
    }
    configureHelp(t) {
      if (t === void 0) return this._helpConfiguration;
      return ((this._helpConfiguration = t), this);
    }
    configureOutput(t) {
      if (t === void 0) return this._outputConfiguration;
      return (Object.assign(this._outputConfiguration, t), this);
    }
    showHelpAfterError(t = !0) {
      if (typeof t !== "string") t = !!t;
      return ((this._showHelpAfterError = t), this);
    }
    showSuggestionAfterError(t = !0) {
      return ((this._showSuggestionAfterError = !!t), this);
    }
    addCommand(t, e) {
      if (!t._name)
        throw Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      if (((e = e || {}), e.isDefault)) this._defaultCommandName = t._name;
      if (e.noHelp || e.hidden) t._hidden = !0;
      return (this._registerCommand(t), (t.parent = this), t._checkForBrokenPassThrough(), this);
    }
    createArgument(t, e) {
      return new Argument(t, e);
    }
    argument(t, e, i, n) {
      let argument = this.createArgument(t, e);
      if (typeof i === "function") argument.default(n).argParser(i);
      else argument.default(i);
      return (this.addArgument(argument), this);
    }
    arguments(t) {
      return (
        t
          .trim()
          .split(/ +/)
          .forEach((e) => {
            this.argument(e);
          }),
        this
      );
    }
    addArgument(t) {
      let e = this.registeredArguments.slice(-1)[0];
      if (e && e.variadic) throw Error(`only the last argument can be variadic '${e.name()}'`);
      if (t.required && t.defaultValue !== void 0 && t.parseArg === void 0)
        throw Error(`a default value for a required argument is never used: '${t.name()}'`);
      return (this.registeredArguments.push(t), this);
    }
    helpCommand(t, e) {
      if (typeof t === "boolean") return ((this._addImplicitHelpCommand = t), this);
      t = t ?? "help [command]";
      let [, i, n] = t.match(/([^ ]+) *(.*)/),
        s = e ?? "display help for command",
        command = this.createCommand(i);
      if ((command.helpOption(!1), n)) command.arguments(n);
      if (s) command.description(s);
      return ((this._addImplicitHelpCommand = !0), (this._helpCommand = command), this);
    }
    addHelpCommand(t, e) {
      if (typeof t !== "object") return (this.helpCommand(t, e), this);
      return ((this._addImplicitHelpCommand = !0), (this._helpCommand = t), this);
    }
    _getHelpCommand() {
      if (
        this._addImplicitHelpCommand ??
        (this.commands.length && !this._actionHandler && !this._findCommand("help"))
      ) {
        if (this._helpCommand === void 0) this.helpCommand(void 0, void 0);
        return this._helpCommand;
      }
      return null;
    }
    hook(t, e) {
      let i = ["preSubcommand", "preAction", "postAction"];
      if (!i.includes(t))
        throw Error(`Unexpected value for event passed to hook : '${t}'.
Expecting one of '${i.join("', '")}'`);
      if (this._lifeCycleHooks[t]) this._lifeCycleHooks[t].push(e);
      else this._lifeCycleHooks[t] = [e];
      return this;
    }
    exitOverride(t) {
      if (t) this._exitCallback = t;
      else
        this._exitCallback = (e) => {
          if (e.code !== "commander.executeSubCommandAsync") throw e;
        };
      return this;
    }
    _exit(t, e, i) {
      if (this._exitCallback) this._exitCallback(new CommanderError(t, e, i));
      l.exit(t);
    }
    action(t) {
      let e = (i) => {
        let n = this.registeredArguments.length,
          sliced = i.slice(0, n);
        if (this._storeOptionsAsProperties) sliced[n] = this;
        else sliced[n] = this.opts();
        return (sliced.push(this), t.apply(this, sliced));
      };
      return ((this._actionHandler = e), this);
    }
    createOption(t, e) {
      return new Option(t, e);
    }
    _callParseArg(t, e, i, n) {
      try {
        return t.parseArg(e, i);
      } catch (error) {
        if (error.code === "commander.invalidArgument") {
          let r = `${n} ${error.message}`;
          this.error(r, { exitCode: error.exitCode, code: error.code });
        }
        throw error;
      }
    }
    _registerOption(t) {
      let e = (t.short && this._findOption(t.short)) || (t.long && this._findOption(t.long));
      if (e) {
        let i = t.long && this._findOption(t.long) ? t.long : t.short;
        throw Error(`Cannot add option '${t.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${i}'
-  already used by option '${e.flags}'`);
      }
      this.options.push(t);
    }
    _registerCommand(t) {
      let e = (n) => [n.name()].concat(n.aliases()),
        found = e(t).find((n) => this._findCommand(n));
      if (found) {
        let joined = e(this._findCommand(found)).join("|"),
          joined_2 = e(t).join("|");
        throw Error(`cannot add command '${joined_2}' as already have command '${joined}'`);
      }
      this.commands.push(t);
    }
    addOption(t) {
      this._registerOption(t);
      let e = t.name(),
        attributeName = t.attributeName();
      if (t.negate) {
        let replaced = t.long.replace(/^--no-/, "--");
        if (!this._findOption(replaced))
          this.setOptionValueWithSource(
            attributeName,
            t.defaultValue === void 0 ? !0 : t.defaultValue,
            "default",
          );
      } else if (t.defaultValue !== void 0)
        this.setOptionValueWithSource(attributeName, t.defaultValue, "default");
      let n = (s, r, a) => {
        if (s == null && t.presetArg !== void 0) s = t.presetArg;
        let optionValue = this.getOptionValue(attributeName);
        if (s !== null && t.parseArg) s = this._callParseArg(t, s, optionValue, r);
        else if (s !== null && t.variadic) s = t._concatValue(s, optionValue);
        if (s == null)
          if (t.negate) s = !1;
          else if (t.isBoolean() || t.optional) s = !0;
          else s = "";
        this.setOptionValueWithSource(attributeName, s, a);
      };
      if (
        (this.on("option:" + e, (s) => {
          let r = `error: option '${t.flags}' argument '${s}' is invalid.`;
          n(s, r, "cli");
        }),
        t.envVar)
      )
        this.on("optionEnv:" + e, (s) => {
          let r = `error: option '${t.flags}' value '${s}' from env '${t.envVar}' is invalid.`;
          n(s, r, "env");
        });
      return this;
    }
    _optionEx(t, e, i, n, s) {
      if (typeof e === "object" && e instanceof Option)
        throw Error("To add an Option object use addOption() instead of option() or requiredOption()");
      let option = this.createOption(e, i);
      if ((option.makeOptionMandatory(!!t.mandatory), typeof n === "function"))
        option.default(s).argParser(n);
      else if (n instanceof RegExp) {
        let a = n;
        ((n = (o, h) => {
          let match = a.exec(o);
          return match ? match[0] : h;
        }),
          option.default(s).argParser(n));
      } else option.default(n);
      return this.addOption(option);
    }
    option(t, e, i, n) {
      return this._optionEx({}, t, e, i, n);
    }
    requiredOption(t, e, i, n) {
      return this._optionEx({ mandatory: !0 }, t, e, i, n);
    }
    combineFlagAndOptionalValue(t = !0) {
      return ((this._combineFlagAndOptionalValue = !!t), this);
    }
    allowUnknownOption(t = !0) {
      return ((this._allowUnknownOption = !!t), this);
    }
    allowExcessArguments(t = !0) {
      return ((this._allowExcessArguments = !!t), this);
    }
    enablePositionalOptions(t = !0) {
      return ((this._enablePositionalOptions = !!t), this);
    }
    passThroughOptions(t = !0) {
      return ((this._passThroughOptions = !!t), this._checkForBrokenPassThrough(), this);
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions)
        throw Error(
          `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`,
        );
    }
    storeOptionsAsProperties(t = !0) {
      if (this.options.length) throw Error("call .storeOptionsAsProperties() before adding options");
      if (Object.keys(this._optionValues).length)
        throw Error("call .storeOptionsAsProperties() before setting option values");
      return ((this._storeOptionsAsProperties = !!t), this);
    }
    getOptionValue(t) {
      if (this._storeOptionsAsProperties) return this[t];
      return this._optionValues[t];
    }
    setOptionValue(t, e) {
      return this.setOptionValueWithSource(t, e, void 0);
    }
    setOptionValueWithSource(t, e, i) {
      if (this._storeOptionsAsProperties) this[t] = e;
      else this._optionValues[t] = e;
      return ((this._optionValueSources[t] = i), this);
    }
    getOptionValueSource(t) {
      return this._optionValueSources[t];
    }
    getOptionValueSourceWithGlobals(t) {
      let e;
      return (
        this._getCommandAndAncestors().forEach((i) => {
          if (i.getOptionValueSource(t) !== void 0) e = i.getOptionValueSource(t);
        }),
        e
      );
    }
    _prepareUserArgs(t, e) {
      if (t !== void 0 && !Array.isArray(t))
        throw Error("first parameter to parse must be array or undefined");
      if (((e = e || {}), t === void 0 && e.from === void 0)) {
        if (l.versions?.electron) e.from = "electron";
        let n = l.execArgv ?? [];
        if (n.includes("-e") || n.includes("--eval") || n.includes("-p") || n.includes("--print"))
          e.from = "eval";
      }
      if (t === void 0) t = l.argv;
      this.rawArgs = t.slice();
      let i;
      switch (e.from) {
        case void 0:
        case "node":
          ((this._scriptPath = t[1]), (i = t.slice(2)));
          break;
        case "electron":
          if (l.defaultApp) ((this._scriptPath = t[1]), (i = t.slice(2)));
          else i = t.slice(1);
          break;
        case "user":
          i = t.slice(0);
          break;
        case "eval":
          i = t.slice(1);
          break;
        default:
          throw Error(`unexpected parse option { from: '${e.from}' }`);
      }
      if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
      return ((this._name = this._name || "program"), i);
    }
    parse(t, e) {
      let _prepareUserArgs = this._prepareUserArgs(t, e);
      return (this._parseCommand([], _prepareUserArgs), this);
    }
    async parseAsync(t, e) {
      let _prepareUserArgs = this._prepareUserArgs(t, e);
      return (await this._parseCommand([], _prepareUserArgs), this);
    }
    _executeSubCommand(t, e) {
      e = e.slice();
      let i = !1,
        n = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function s(u, c) {
        let resolved = f.resolve(u, c);
        if (A.existsSync(resolved)) return resolved;
        if (n.includes(f.extname(c))) return;
        let found = n.find((p) => A.existsSync(`${resolved}${p}`));
        if (found) return `${resolved}${found}`;
        return;
      }
      (this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions());
      let r = t._executableFile || `${this._name}-${t._name}`,
        a = this._executableDir || "";
      if (this._scriptPath) {
        let u;
        try {
          u = A.realpathSync(this._scriptPath);
        } catch (error) {
          u = this._scriptPath;
        }
        a = f.resolve(f.dirname(u), a);
      }
      if (a) {
        let u = s(a, r);
        if (!u && !t._executableFile && this._scriptPath) {
          let base = f.basename(this._scriptPath, f.extname(this._scriptPath));
          if (base !== this._name) u = s(a, `${base}-${t._name}`);
        }
        r = u || r;
      }
      i = n.includes(f.extname(r));
      let o;
      if (l.platform !== "win32")
        if (i)
          (e.unshift(r), (e = G(l.execArgv).concat(e)), (o = C.spawn(l.argv[0], e, { stdio: "inherit" })));
        else o = C.spawn(r, e, { stdio: "inherit" });
      else (e.unshift(r), (e = G(l.execArgv).concat(e)), (o = C.spawn(l.execPath, e, { stdio: "inherit" })));
      if (!o.killed)
        ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"].forEach((c) => {
          l.on(c, () => {
            if (o.killed === !1 && o.exitCode === null) o.kill(c);
          });
        });
      let _exitCallback = this._exitCallback;
      (o.on("close", (u) => {
        if (((u = u ?? 1), !_exitCallback)) l.exit(u);
        else _exitCallback(new CommanderError(u, "commander.executeSubCommandAsync", "(close)"));
      }),
        o.on("error", (u) => {
          if (u.code === "ENOENT") {
            let c = a
                ? `searched for local subcommand relative to directory '${a}'`
                : "no directory for search for local subcommand, use .executableDir() to supply a custom directory",
              d = `'${r}' does not exist
 - if '${t._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${c}`;
            throw Error(d);
          } else if (u.code === "EACCES") throw Error(`'${r}' not executable`);
          if (!_exitCallback) l.exit(1);
          else {
            let c = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
            ((c.nestedError = u), _exitCallback(c));
          }
        }),
        (this.runningCommand = o));
    }
    _dispatchSubcommand(t, e, i) {
      let _findCommand = this._findCommand(t);
      if (!_findCommand) this.help({ error: !0 });
      let s;
      return (
        (s = this._chainOrCallSubCommandHook(s, _findCommand, "preSubcommand")),
        (s = this._chainOrCall(s, () => {
          if (_findCommand._executableHandler) this._executeSubCommand(_findCommand, e.concat(i));
          else return _findCommand._parseCommand(e, i);
        })),
        s
      );
    }
    _dispatchHelpCommand(t) {
      if (!t) this.help();
      let _findCommand = this._findCommand(t);
      if (_findCommand && !_findCommand._executableHandler) _findCommand.help();
      return this._dispatchSubcommand(
        t,
        [],
        [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"],
      );
    }
    _checkNumberOfArguments() {
      if (
        (this.registeredArguments.forEach((registeredArgument, e) => {
          if (registeredArgument.required && this.args[e] == null)
            this.missingArgument(registeredArgument.name());
        }),
        this.registeredArguments.length > 0 &&
          this.registeredArguments[this.registeredArguments.length - 1].variadic)
      )
        return;
      if (this.args.length > this.registeredArguments.length) this._excessArguments(this.args);
    }
    _processArguments() {
      let t = (i, n, s) => {
        let r = n;
        if (n !== null && i.parseArg) {
          let a = `error: command-argument value '${n}' is invalid for argument '${i.name()}'.`;
          r = this._callParseArg(i, n, s, a);
        }
        return r;
      };
      this._checkNumberOfArguments();
      let e = [];
      (this.registeredArguments.forEach((registeredArgument, n) => {
        let defaultValue = registeredArgument.defaultValue;
        if (registeredArgument.variadic) {
          if (n < this.args.length) {
            if (((defaultValue = this.args.slice(n)), registeredArgument.parseArg))
              defaultValue = defaultValue.reduce(
                (r, a) => t(registeredArgument, a, r),
                registeredArgument.defaultValue,
              );
          } else if (defaultValue === void 0) defaultValue = [];
        } else if (n < this.args.length) {
          if (((defaultValue = this.args[n]), registeredArgument.parseArg))
            defaultValue = t(registeredArgument, defaultValue, registeredArgument.defaultValue);
        }
        e[n] = defaultValue;
      }),
        (this.processedArgs = e));
    }
    _chainOrCall(t, e) {
      if (t && t.then && typeof t.then === "function") return t.then(() => e());
      return e();
    }
    _chainOrCallHooks(t, e) {
      let i = t,
        n = [];
      if (
        (this._getCommandAndAncestors()
          .reverse()
          .filter((s) => s._lifeCycleHooks[e] !== void 0)
          .forEach((s) => {
            s._lifeCycleHooks[e].forEach((r) => {
              n.push({ hookedCommand: s, callback: r });
            });
          }),
        e === "postAction")
      )
        n.reverse();
      return (
        n.forEach((s) => {
          i = this._chainOrCall(i, () => s.callback(s.hookedCommand, this));
        }),
        i
      );
    }
    _chainOrCallSubCommandHook(t, e, i) {
      let n = t;
      if (this._lifeCycleHooks[i] !== void 0)
        this._lifeCycleHooks[i].forEach((s) => {
          n = this._chainOrCall(n, () => s(this, e));
        });
      return n;
    }
    _parseCommand(t, e) {
      let options = this.parseOptions(e);
      if (
        (this._parseOptionsEnv(),
        this._parseOptionsImplied(),
        (t = t.concat(options.operands)),
        (e = options.unknown),
        (this.args = t.concat(e)),
        t && this._findCommand(t[0]))
      )
        return this._dispatchSubcommand(t[0], t.slice(1), e);
      if (this._getHelpCommand() && t[0] === this._getHelpCommand().name())
        return this._dispatchHelpCommand(t[1]);
      if (this._defaultCommandName)
        return (this._outputHelpIfRequested(e), this._dispatchSubcommand(this._defaultCommandName, t, e));
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName)
        this.help({ error: !0 });
      (this._outputHelpIfRequested(options.unknown),
        this._checkForMissingMandatoryOptions(),
        this._checkForConflictingOptions());
      let n = () => {
          if (options.unknown.length > 0) this.unknownOption(options.unknown[0]);
        },
        s = `command:${this.name()}`;
      if (this._actionHandler) {
        (n(), this._processArguments());
        let r;
        if (
          ((r = this._chainOrCallHooks(r, "preAction")),
          (r = this._chainOrCall(r, () => this._actionHandler(this.processedArgs))),
          this.parent)
        )
          r = this._chainOrCall(r, () => {
            this.parent.emit(s, t, e);
          });
        return ((r = this._chainOrCallHooks(r, "postAction")), r);
      }
      if (this.parent && this.parent.listenerCount(s))
        (n(), this._processArguments(), this.parent.emit(s, t, e));
      else if (t.length) {
        if (this._findCommand("*")) return this._dispatchSubcommand("*", t, e);
        if (this.listenerCount("command:*")) this.emit("command:*", t, e);
        else if (this.commands.length) this.unknownCommand();
        else (n(), this._processArguments());
      } else if (this.commands.length) (n(), this.help({ error: !0 }));
      else (n(), this._processArguments());
    }
    _findCommand(t) {
      if (!t) return;
      return this.commands.find((command) => command._name === t || command._aliases.includes(t));
    }
    _findOption(t) {
      return this.options.find((option) => option.is(t));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((t) => {
        t.options.forEach((option) => {
          if (option.mandatory && t.getOptionValue(option.attributeName()) === void 0)
            t.missingMandatoryOptionValue(option);
        });
      });
    }
    _checkForConflictingLocalOptions() {
      let filtered = this.options.filter((option) => {
        let attributeName = option.attributeName();
        if (this.getOptionValue(attributeName) === void 0) return !1;
        return this.getOptionValueSource(attributeName) !== "default";
      });
      filtered
        .filter((i) => i.conflictsWith.length > 0)
        .forEach((i) => {
          let found = filtered.find((s) => i.conflictsWith.includes(s.attributeName()));
          if (found) this._conflictingOption(i, found);
        });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((t) => {
        t._checkForConflictingLocalOptions();
      });
    }
    parseOptions(t) {
      let e = [],
        i = [],
        n = e,
        sliced = t.slice();
      function r(o) {
        return o.length > 1 && o[0] === "-";
      }
      let a = null;
      while (sliced.length) {
        let o = sliced.shift();
        if (o === "--") {
          if (n === i) n.push(o);
          n.push(...sliced);
          break;
        }
        if (a && !r(o)) {
          this.emit(`option:${a.name()}`, o);
          continue;
        }
        if (((a = null), r(o))) {
          let _findOption = this._findOption(o);
          if (_findOption) {
            if (_findOption.required) {
              let u = sliced.shift();
              if (u === void 0) this.optionMissingArgument(_findOption);
              this.emit(`option:${_findOption.name()}`, u);
            } else if (_findOption.optional) {
              let u = null;
              if (sliced.length > 0 && !r(sliced[0])) u = sliced.shift();
              this.emit(`option:${_findOption.name()}`, u);
            } else this.emit(`option:${_findOption.name()}`);
            a = _findOption.variadic ? _findOption : null;
            continue;
          }
        }
        if (o.length > 2 && o[0] === "-" && o[1] !== "-") {
          let _findOption = this._findOption(`-${o[1]}`);
          if (_findOption) {
            if (_findOption.required || (_findOption.optional && this._combineFlagAndOptionalValue))
              this.emit(`option:${_findOption.name()}`, o.slice(2));
            else (this.emit(`option:${_findOption.name()}`), sliced.unshift(`-${o.slice(2)}`));
            continue;
          }
        }
        if (/^--[^=]+=/.test(o)) {
          let index = o.indexOf("="),
            _findOption = this._findOption(o.slice(0, index));
          if (_findOption && (_findOption.required || _findOption.optional)) {
            this.emit(`option:${_findOption.name()}`, o.slice(index + 1));
            continue;
          }
        }
        if (r(o)) n = i;
        if ((this._enablePositionalOptions || this._passThroughOptions) && e.length === 0 && i.length === 0) {
          if (this._findCommand(o)) {
            if ((e.push(o), sliced.length > 0)) i.push(...sliced);
            break;
          } else if (this._getHelpCommand() && o === this._getHelpCommand().name()) {
            if ((e.push(o), sliced.length > 0)) e.push(...sliced);
            break;
          } else if (this._defaultCommandName) {
            if ((i.push(o), sliced.length > 0)) i.push(...sliced);
            break;
          }
        }
        if (this._passThroughOptions) {
          if ((n.push(o), sliced.length > 0)) n.push(...sliced);
          break;
        }
        n.push(o);
      }
      return { operands: e, unknown: i };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        let t = {},
          e = this.options.length;
        for (let i = 0; i < e; i++) {
          let attributeName = this.options[i].attributeName();
          t[attributeName] = attributeName === this._versionOptionName ? this._version : this[attributeName];
        }
        return t;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((t, e) => Object.assign(t, e.opts()), {});
    }
    error(t, e) {
      if (
        (this._outputConfiguration.outputError(
          `${t}
`,
          this._outputConfiguration.writeErr,
        ),
        typeof this._showHelpAfterError === "string")
      )
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      else if (this._showHelpAfterError)
        (this._outputConfiguration.writeErr(`
`),
          this.outputHelp({ error: !0 }));
      let i = e || {},
        n = i.exitCode || 1,
        s = i.code || "commander.error";
      this._exit(n, s, t);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in l.env) {
          let attributeName = option.attributeName();
          if (
            this.getOptionValue(attributeName) === void 0 ||
            ["default", "config", "env"].includes(this.getOptionValueSource(attributeName))
          )
            if (option.required || option.optional)
              this.emit(`optionEnv:${option.name()}`, l.env[option.envVar]);
            else this.emit(`optionEnv:${option.name()}`);
        }
      });
    }
    _parseOptionsImplied() {
      let t = new DualOptions(this.options),
        e = (i) =>
          this.getOptionValue(i) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(i));
      this.options
        .filter(
          (option) =>
            option.implied !== void 0 &&
            e(option.attributeName()) &&
            t.valueFromOption(this.getOptionValue(option.attributeName()), option),
        )
        .forEach((i) => {
          Object.keys(i.implied)
            .filter((n) => !e(n))
            .forEach((n) => {
              this.setOptionValueWithSource(n, i.implied[n], "implied");
            });
        });
    }
    missingArgument(t) {
      let e = `error: missing required argument '${t}'`;
      this.error(e, { code: "commander.missingArgument" });
    }
    optionMissingArgument(t) {
      let e = `error: option '${t.flags}' argument missing`;
      this.error(e, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(t) {
      let e = `error: required option '${t.flags}' not specified`;
      this.error(e, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(t, e) {
      let i = (r) => {
          let attributeName = r.attributeName(),
            optionValue = this.getOptionValue(attributeName),
            found = this.options.find((option) => option.negate && attributeName === option.attributeName()),
            found_2 = this.options.find(
              (option) => !option.negate && attributeName === option.attributeName(),
            );
          if (
            found &&
            ((found.presetArg === void 0 && optionValue === !1) ||
              (found.presetArg !== void 0 && optionValue === found.presetArg))
          )
            return found;
          return found_2 || r;
        },
        n = (r) => {
          let a = i(r),
            attributeName = a.attributeName();
          if (this.getOptionValueSource(attributeName) === "env") return `environment variable '${a.envVar}'`;
          return `option '${a.flags}'`;
        },
        s = `error: ${n(t)} cannot be used with ${n(e)}`;
      this.error(s, { code: "commander.conflictingOption" });
    }
    unknownOption(t) {
      if (this._allowUnknownOption) return;
      let e = "";
      if (t.startsWith("--") && this._showSuggestionAfterError) {
        let n = [],
          s = this;
        do {
          let mapped = s
            .createHelp()
            .visibleOptions(s)
            .filter((a) => a.long)
            .map((a) => a.long);
          ((n = n.concat(mapped)), (s = s.parent));
        } while (s && !s._enablePositionalOptions);
        e = suggestSimilar(t, n);
      }
      let i = `error: unknown option '${t}'${e}`;
      this.error(i, { code: "commander.unknownOption" });
    }
    _excessArguments(t) {
      if (this._allowExcessArguments) return;
      let e = this.registeredArguments.length,
        i = e === 1 ? "" : "s",
        s = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${e} argument${i} but got ${t.length}.`;
      this.error(s, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      let t = this.args[0],
        e = "";
      if (this._showSuggestionAfterError) {
        let n = [];
        (this.createHelp()
          .visibleCommands(this)
          .forEach((s) => {
            if ((n.push(s.name()), s.alias())) n.push(s.alias());
          }),
          (e = suggestSimilar(t, n)));
      }
      let i = `error: unknown command '${t}'${e}`;
      this.error(i, { code: "commander.unknownCommand" });
    }
    version(t, e, i) {
      if (t === void 0) return this._version;
      ((this._version = t), (e = e || "-V, --version"), (i = i || "output the version number"));
      let option = this.createOption(e, i);
      return (
        (this._versionOptionName = option.attributeName()),
        this._registerOption(option),
        this.on("option:" + option.name(), () => {
          (this._outputConfiguration.writeOut(`${t}
`),
            this._exit(0, "commander.version", t));
        }),
        this
      );
    }
    description(t, e) {
      if (t === void 0 && e === void 0) return this._description;
      if (((this._description = t), e)) this._argsDescription = e;
      return this;
    }
    summary(t) {
      if (t === void 0) return this._summary;
      return ((this._summary = t), this);
    }
    alias(t) {
      if (t === void 0) return this._aliases[0];
      let e = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler)
        e = this.commands[this.commands.length - 1];
      if (t === e._name) throw Error("Command alias can't be the same as its name");
      let i = this.parent?._findCommand(t);
      if (i) {
        let joined = [i.name()].concat(i.aliases()).join("|");
        throw Error(
          `cannot add alias '${t}' to command '${this.name()}' as already have command '${joined}'`,
        );
      }
      return (e._aliases.push(t), this);
    }
    aliases(t) {
      if (t === void 0) return this._aliases;
      return (t.forEach((e) => this.alias(e)), this);
    }
    usage(t) {
      if (t === void 0) {
        if (this._usage) return this._usage;
        let mapped = this.registeredArguments.map((registeredArgument) =>
          humanReadableArgName(registeredArgument),
        );
        return []
          .concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? mapped : [],
          )
          .join(" ");
      }
      return ((this._usage = t), this);
    }
    name(t) {
      if (t === void 0) return this._name;
      return ((this._name = t), this);
    }
    nameFromFilename(t) {
      return ((this._name = f.basename(t, f.extname(t))), this);
    }
    executableDir(t) {
      if (t === void 0) return this._executableDir;
      return ((this._executableDir = t), this);
    }
    helpInformation(t) {
      let help = this.createHelp();
      if (help.helpWidth === void 0)
        help.helpWidth =
          t && t.error
            ? this._outputConfiguration.getErrHelpWidth()
            : this._outputConfiguration.getOutHelpWidth();
      return help.formatHelp(this, help);
    }
    _getHelpContext(t) {
      t = t || {};
      let e = { error: !!t.error },
        i;
      if (e.error) i = (n) => this._outputConfiguration.writeErr(n);
      else i = (n) => this._outputConfiguration.writeOut(n);
      return ((e.write = t.write || i), (e.command = this), e);
    }
    outputHelp(t) {
      let e;
      if (typeof t === "function") ((e = t), (t = void 0));
      let _getHelpContext = this._getHelpContext(t);
      (this._getCommandAndAncestors()
        .reverse()
        .forEach((s) => s.emit("beforeAllHelp", _getHelpContext)),
        this.emit("beforeHelp", _getHelpContext));
      let helpInformation = this.helpInformation(_getHelpContext);
      if (e) {
        if (
          ((helpInformation = e(helpInformation)),
          typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation))
        )
          throw Error("outputHelp callback must return a string or a Buffer");
      }
      if ((_getHelpContext.write(helpInformation), this._getHelpOption()?.long))
        this.emit(this._getHelpOption().long);
      (this.emit("afterHelp", _getHelpContext),
        this._getCommandAndAncestors().forEach((s) => s.emit("afterAllHelp", _getHelpContext)));
    }
    helpOption(t, e) {
      if (typeof t === "boolean") {
        if (t) this._helpOption = this._helpOption ?? void 0;
        else this._helpOption = null;
        return this;
      }
      return (
        (t = t ?? "-h, --help"),
        (e = e ?? "display help for command"),
        (this._helpOption = this.createOption(t, e)),
        this
      );
    }
    _getHelpOption() {
      if (this._helpOption === void 0) this.helpOption(void 0, void 0);
      return this._helpOption;
    }
    addHelpOption(t) {
      return ((this._helpOption = t), this);
    }
    help(t) {
      this.outputHelp(t);
      let e = l.exitCode || 0;
      if (e === 0 && t && typeof t !== "function" && t.error) e = 1;
      this._exit(e, "commander.help", "(outputHelp)");
    }
    addHelpText(t, e) {
      let i = ["beforeAll", "before", "after", "afterAll"];
      if (!i.includes(t))
        throw Error(`Unexpected value for position to addHelpText.
Expecting one of '${i.join("', '")}'`);
      let n = `${t}Help`;
      return (
        this.on(n, (s) => {
          let r;
          if (typeof e === "function") r = e({ error: s.error, command: s.command });
          else r = e;
          if (r)
            s.write(`${r}
`);
        }),
        this
      );
    }
    _outputHelpIfRequested(t) {
      let _getHelpOption = this._getHelpOption();
      if (_getHelpOption && t.find((n) => _getHelpOption.is(n)))
        (this.outputHelp(), this._exit(0, "commander.helpDisplayed", "(outputHelp)"));
    }
  }
  function G(t) {
    return t.map((e) => {
      if (!e.startsWith("--inspect")) return e;
      let i,
        n = "127.0.0.1",
        s = "9229",
        r;
      if ((r = e.match(/^(--inspect(-brk)?)$/)) !== null) i = r[1];
      else if ((r = e.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null)
        if (((i = r[1]), /^\d+$/.test(r[3]))) s = r[3];
        else n = r[3];
      else if ((r = e.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null)
        ((i = r[1]), (n = r[3]), (s = r[4]));
      if (i && s !== "0") return `${i}=${n}:${parseInt(s) + 1}`;
      return e;
    });
  }
  vt.Command = I;
});

export { B };
