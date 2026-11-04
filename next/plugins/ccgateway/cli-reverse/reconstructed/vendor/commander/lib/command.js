/**
 * commander/lib/command.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_argument } from "./argument.js";
import { require_error } from "./error.js";
import { require_help } from "./help.js";
import { require_option } from "./option.js";
import { require_suggestSimilar } from "./suggestSimilar.js";

//@ chunk-b7dyevzy.js:9832-34778 cjs-fingerprint
var require_command = __commonJS(function (cjsExports) {
  var EventEmitter = importMetaRequire("events").EventEmitter;
  var childProcess = importMetaRequire("child_process");
  var path = importMetaRequire("path");
  var fs = importMetaRequire("fs");
  var processModule = importMetaRequire("process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();
  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = true;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._outputConfiguration = {
        writeOut: (str) => processModule.stdout.write(str),
        writeErr: (str) => processModule.stderr.write(str),
        getOutHelpWidth: () => (processModule.stdout.isTTY ? processModule.stdout.columns : undefined),
        getErrHelpWidth: () => (processModule.stderr.isTTY ? processModule.stderr.columns : undefined),
        outputError: (str, write) => write(str),
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      let result = [];
      for (let command = this; command; command = command.parent) result.push(command);
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      let [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      let cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault) this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args) cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc) return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help(), this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined) return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined) return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name)
        throw Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      opts = opts || {};
      if (opts.isDefault) this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden) cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      let argument = this.createArgument(name, description);
      if (typeof fn === "function") argument.default(defaultValue).argParser(fn);
      else argument.default(fn);
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names
        .trim()
        .split(/ +/)
        .forEach((detail) => {
          this.argument(detail);
        });
      return this;
    }
    addArgument(argument) {
      let previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic)
        throw Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined)
        throw Error(`a default value for a required argument is never used: '${argument.name()}'`);
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        return this;
      }
      enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
      let [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
      let helpDescription = description ?? "display help for command";
      let helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs) helpCommand.arguments(helpArgs);
      if (helpDescription) helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    _getHelpCommand() {
      if (
        this._addImplicitHelpCommand ??
        (this.commands.length && !this._actionHandler && !this._findCommand("help"))
      ) {
        if (this._helpCommand === undefined) this.helpCommand(undefined, undefined);
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      let allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event))
        throw Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      if (this._lifeCycleHooks[event]) this._lifeCycleHooks[event].push(listener);
      else this._lifeCycleHooks[event] = [listener];
      return this;
    }
    exitOverride(fn) {
      if (fn) this._exitCallback = fn;
      else
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") throw err;
        };
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) this._exitCallback(new CommanderError(exitCode, code, message));
      processModule.exit(exitCode);
    }
    action(fn) {
      let listener = (args) => {
        let expectedArgsCount = this.registeredArguments.length;
        let actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) actionArgs[expectedArgsCount] = this;
        else actionArgs[expectedArgsCount] = this.opts();
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          let message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, {
            exitCode: err.exitCode,
            code: err.code,
          });
        }
        throw err;
      }
    }
    _registerOption(option) {
      let matchingOption =
        (option.short && this._findOption(option.short)) || (option.long && this._findOption(option.long));
      if (matchingOption) {
        let matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this.options.push(option);
    }
    _registerCommand(command) {
      let knownBy = (cmd) => [cmd.name()].concat(cmd.aliases());
      let alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        let existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        let newCmd = knownBy(command).join("|");
        throw Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      let oname = option.name();
      let name = option.attributeName();
      if (option.negate) {
        let positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag))
          this.setOptionValueWithSource(
            name,
            option.defaultValue === undefined ? true : option.defaultValue,
            "default",
          );
      } else if (option.defaultValue !== undefined)
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      let handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) val = option.presetArg;
        let oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg)
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        else if (val !== null && option.variadic) val = option._concatValue(val, oldValue);
        if (val == null)
          if (option.negate) val = false;
          else if (option.isBoolean() || option.optional) val = true;
          else val = "";
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        let invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar)
        this.on("optionEnv:" + oname, (val) => {
          let invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option)
        throw Error("To add an Option object use addOption() instead of option() or requiredOption()");
      let option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") option.default(defaultValue).argParser(fn);
      else if (fn instanceof RegExp) {
        let regex = fn;
        fn = (val, def) => {
          let m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else option.default(fn);
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx(
        {
          mandatory: true,
        },
        flags,
        description,
        parseArg,
        defaultValue,
      );
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions)
        throw Error(
          `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`,
        );
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) throw Error("call .storeOptionsAsProperties() before adding options");
      if (Object.keys(this._optionValues).length)
        throw Error("call .storeOptionsAsProperties() before setting option values");
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) return this[key];
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) this[key] = value;
      else this._optionValues[key] = value;
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) source = cmd.getOptionValueSource(key);
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv))
        throw Error("first parameter to parse must be array or undefined");
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (processModule.versions?.electron) parseOptions.from = "electron";
        let execArgv = processModule.execArgv ?? [];
        if (
          execArgv.includes("-e") ||
          execArgv.includes("--eval") ||
          execArgv.includes("-p") ||
          execArgv.includes("--print")
        )
          parseOptions.from = "eval";
      }
      if (argv === undefined) argv = processModule.argv;
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (processModule.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else userArgs = argv.slice(1);
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      let userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      let userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      let sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        let localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin)) return localBin;
        if (sourceExt.includes(path.extname(baseName))) return;
        let foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt) return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch (err) {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          let legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name)
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (processModule.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(processModule.execArgv).concat(args);
          proc = childProcess.spawn(processModule.argv[0], args, {
            stdio: "inherit",
          });
        } else
          proc = childProcess.spawn(executableFile, args, {
            stdio: "inherit",
          });
      } else {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(processModule.execArgv).concat(args);
        proc = childProcess.spawn(processModule.execPath, args, {
          stdio: "inherit",
        });
      }
      if (!proc.killed)
        ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"].forEach((signal) => {
          processModule.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) proc.kill(signal);
          });
        });
      let exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) processModule.exit(code);
        else exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          let executableDirMessage = executableDir
            ? `searched for local subcommand relative to directory '${executableDir}'`
            : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
          let executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
          throw Error(executableMissing);
        } else if (err.code === "EACCES") throw Error(`'${executableFile}' not executable`);
        if (!exitCallback) processModule.exit(1);
        else {
          let wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      let subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({
          error: true,
        });
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) this._executeSubCommand(subCommand, operands.concat(unknown));
        else return subCommand._parseCommand(operands, unknown);
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) this.help();
      let subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) subCommand.help();
      return this._dispatchSubcommand(
        subcommandName,
        [],
        [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"],
      );
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) this.missingArgument(arg.name());
      });
      if (
        this.registeredArguments.length > 0 &&
        this.registeredArguments[this.registeredArguments.length - 1].variadic
      )
        return;
      if (this.args.length > this.registeredArguments.length) this._excessArguments(this.args);
    }
    _processArguments() {
      let myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          let invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      let processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg)
              value = value.reduce(
                (processed, v) => myParseArg(declaredArg, v, processed),
                declaredArg.defaultValue,
              );
          } else if (value === undefined) value = [];
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") return promise.then(() => fn());
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      let hooks = [];
      this._getCommandAndAncestors()
        .reverse()
        .filter((cmd) => cmd._lifeCycleHooks[event] !== undefined)
        .forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({
              hookedCommand,
              callback,
            });
          });
        });
      if (event === "postAction") hooks.reverse();
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => hookDetail.callback(hookDetail.hookedCommand, this));
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined)
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => hook(this, subCommand));
        });
      return result;
    }
    _parseCommand(operands, unknown) {
      let parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0]))
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name())
        return this._dispatchHelpCommand(operands[1]);
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName)
        this.help({
          error: true,
        });
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) this.unknownOption(parsed.unknown[0]);
      };
      let commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent)
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) return this._dispatchSubcommand("*", operands, unknown);
        if (this.listenerCount("command:*")) this.emit("command:*", operands, unknown);
        else if (this.commands.length) this.unknownCommand();
        else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({
          error: true,
        });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name) return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined)
            cmd.missingMandatoryOptionValue(anOption);
        });
      });
    }
    _checkForConflictingLocalOptions() {
      let definedNonDefaultOptions = this.options.filter((option) => {
        let optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) return false;
        return this.getOptionValueSource(optionKey) !== "default";
      });
      definedNonDefaultOptions
        .filter((option) => option.conflictsWith.length > 0)
        .forEach((option) => {
          let conflictingAndDefined = definedNonDefaultOptions.find((defined) =>
            option.conflictsWith.includes(defined.attributeName()),
          );
          if (conflictingAndDefined) this._conflictingOption(option, conflictingAndDefined);
        });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      let operands = [];
      let unknown = [];
      let dest = operands;
      let args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        let arg = args.shift();
        if (arg === "--") {
          if (dest === unknown) dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          let option = this._findOption(arg);
          if (option) {
            if (option.required) {
              let value = args.shift();
              if (value === undefined) this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) value = args.shift();
              this.emit(`option:${option.name()}`, value);
            } else this.emit(`option:${option.name()}`);
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          let option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || (option.optional && this._combineFlagAndOptionalValue))
              this.emit(`option:${option.name()}`, arg.slice(2));
            else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          let index = arg.indexOf("=");
          let option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) dest = unknown;
        if (
          (this._enablePositionalOptions || this._passThroughOptions) &&
          operands.length === 0 &&
          unknown.length === 0
        ) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0) unknown.push(...args);
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg);
            if (args.length > 0) operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0) unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0) dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return {
        operands,
        unknown,
      };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        let result = {};
        let len = this.options.length;
        for (let optionIndex = 0; optionIndex < len; optionIndex++) {
          let key = this.options[optionIndex].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce(
        (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
        {},
      );
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(
        `${message}
`,
        this._outputConfiguration.writeErr,
      );
      if (typeof this._showHelpAfterError === "string")
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({
          error: true,
        });
      }
      let config = errorOptions || {};
      let exitCode = config.exitCode || 1;
      let code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in processModule.env) {
          let optionKey = option.attributeName();
          if (
            this.getOptionValue(optionKey) === undefined ||
            ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))
          )
            if (option.required || option.optional)
              this.emit(`optionEnv:${option.name()}`, processModule.env[option.envVar]);
            else this.emit(`optionEnv:${option.name()}`);
        }
      });
    }
    _parseOptionsImplied() {
      let dualHelper = new DualOptions(this.options);
      let hasCustomOptionValue = (optionKey) =>
        this.getOptionValue(optionKey) !== undefined &&
        !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      this.options
        .filter(
          (option) =>
            option.implied !== undefined &&
            hasCustomOptionValue(option.attributeName()) &&
            dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option),
        )
        .forEach((option) => {
          Object.keys(option.implied)
            .filter((impliedKey) => !hasCustomOptionValue(impliedKey))
            .forEach((impliedKey) => {
              this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
            });
        });
    }
    missingArgument(name) {
      let message = `error: missing required argument '${name}'`;
      this.error(message, {
        code: "commander.missingArgument",
      });
    }
    optionMissingArgument(option) {
      let message = `error: option '${option.flags}' argument missing`;
      this.error(message, {
        code: "commander.optionMissingArgument",
      });
    }
    missingMandatoryOptionValue(option) {
      let message = `error: required option '${option.flags}' not specified`;
      this.error(message, {
        code: "commander.missingMandatoryOptionValue",
      });
    }
    _conflictingOption(option, conflictingOption) {
      let findBestOptionFromValue = (option) => {
        let optionKey = option.attributeName();
        let optionValue = this.getOptionValue(optionKey);
        let negativeOption = this.options.find(
          (target) => target.negate && optionKey === target.attributeName(),
        );
        let positiveOption = this.options.find(
          (target) => !target.negate && optionKey === target.attributeName(),
        );
        if (
          negativeOption &&
          ((negativeOption.presetArg === undefined && optionValue === false) ||
            (negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg))
        )
          return negativeOption;
        return positiveOption || option;
      };
      let getErrorMessage = (option) => {
        let bestOption = findBestOptionFromValue(option);
        let optionKey = bestOption.attributeName();
        if (this.getOptionValueSource(optionKey) === "env")
          return `environment variable '${bestOption.envVar}'`;
        return `option '${bestOption.flags}'`;
      };
      let message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, {
        code: "commander.conflictingOption",
      });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption) return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          let moreFlags = command
            .createHelp()
            .visibleOptions(command)
            .filter((option) => option.long)
            .map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      let message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, {
        code: "commander.unknownOption",
      });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments) return;
      let expected = this.registeredArguments.length;
      let s_2 = expected === 1 ? "" : "s";
      let pluralSuffix = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${expected} argument${s_2} but got ${receivedArgs.length}.`;
      this.error(pluralSuffix, {
        code: "commander.excessArguments",
      });
    }
    unknownCommand() {
      let unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        let candidateNames = [];
        this.createHelp()
          .visibleCommands(this)
          .forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      let message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, {
        code: "commander.unknownCommand",
      });
    }
    version(str, flags, description) {
      if (str === undefined) return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      let versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined) return this._description;
      this._description = str;
      if (argsDescription) this._argsDescription = argsDescription;
      return this;
    }
    summary(str) {
      if (str === undefined) return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined) return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler)
        command = this.commands[this.commands.length - 1];
      if (alias === command._name) throw Error("Command alias can't be the same as its name");
      let matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        let existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw Error(
          `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`,
        );
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined) return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage) return this._usage;
        let args = this.registeredArguments.map((arg) => humanReadableArgName(arg));
        return []
          .concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : [],
          )
          .join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined) return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path) {
      if (path === undefined) return this._executableDir;
      this._executableDir = path;
      return this;
    }
    helpInformation(contextOptions) {
      let helper = this.createHelp();
      if (helper.helpWidth === undefined)
        helper.helpWidth =
          contextOptions && contextOptions.error
            ? this._outputConfiguration.getErrHelpWidth()
            : this._outputConfiguration.getOutHelpWidth();
      return helper.formatHelp(this, helper);
    }
    _getHelpContext(contextOptions) {
      contextOptions = contextOptions || {};
      let context = {
        error: !!contextOptions.error,
      };
      let write;
      if (context.error) write = (arg) => this._outputConfiguration.writeErr(arg);
      else write = (arg) => this._outputConfiguration.writeOut(arg);
      context.write = contextOptions.write || write;
      context.command = this;
      return context;
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      let context = this._getHelpContext(contextOptions);
      this._getCommandAndAncestors()
        .reverse()
        .forEach((command) => command.emit("beforeAllHelp", context));
      this.emit("beforeHelp", context);
      let helpInformation = this.helpInformation(context);
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation))
          throw Error("outputHelp callback must return a string or a Buffer");
      }
      context.write(helpInformation);
      if (this._getHelpOption()?.long) this.emit(this._getHelpOption().long);
      this.emit("afterHelp", context);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) this._helpOption = this._helpOption ?? undefined;
        else this._helpOption = null;
        return this;
      }
      flags = flags ?? "-h, --help";
      description = description ?? "display help for command";
      this._helpOption = this.createOption(flags, description);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) this.helpOption(undefined, undefined);
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = processModule.exitCode || 0;
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error)
        exitCode = 1;
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      let allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position))
        throw Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      let helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function")
          helpStr = text({
            error: context.error,
            command: context.command,
          });
        else helpStr = text;
        if (helpStr)
          context.write(`${helpStr}
`);
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      let helpOption = this._getHelpOption();
      if (helpOption && args.find((arg) => helpOption.is(arg))) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) return arg;
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) debugOption = match[1];
      else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) debugPort = match[3];
        else debugHost = match[3];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      return arg;
    });
  }
  cjsExports.Command = Command;
});
export { require_command };
