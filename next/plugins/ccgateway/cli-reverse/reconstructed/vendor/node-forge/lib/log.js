/**
 * node-forge/lib/log.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:275827-278274 cjs-fingerprint
var require_log = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  cjsModule.exports = forge.log = forge.log || {};
  forge.log.levels = ["none", "error", "warning", "info", "debug", "verbose", "max"];
  var sLevelInfo = {};
  var sLoggers = [];
  var sConsoleLogger = null;
  forge.log.LEVEL_LOCKED = 2;
  forge.log.NO_LEVEL_CHECK = 4;
  forge.log.INTERPOLATE = 8;
  for (i = 0; i < forge.log.levels.length; ++i) {
    level = forge.log.levels[i];
    sLevelInfo[level] = {
      index: i,
      name: level.toUpperCase(),
    };
  }
  var level;
  var i;
  forge.log.logMessage = function (message) {
    var messageLevelIndex = sLevelInfo[message.level].index;
    for (var i = 0; i < sLoggers.length; ++i) {
      var logger = sLoggers[i];
      if (logger.flags & forge.log.NO_LEVEL_CHECK) logger.f(message);
      else {
        var loggerLevelIndex = sLevelInfo[logger.level].index;
        if (messageLevelIndex <= loggerLevelIndex) logger.f(logger, message);
      }
    }
  };
  forge.log.prepareStandard = function (message) {
    if (!("standard" in message))
      message.standard = sLevelInfo[message.level].name + " [" + message.category + "] " + message.message;
  };
  forge.log.prepareFull = function (message) {
    if (!("full" in message)) {
      var args = [message.message];
      args = args.concat([]);
      message.full = forge.util.format.apply(this, args);
    }
  };
  forge.log.prepareStandardFull = function (message) {
    if (!("standardFull" in message)) {
      forge.log.prepareStandard(message);
      message.standardFull = message.standard;
    }
  };
  levels = ["error", "warning", "info", "debug", "verbose"];
  for (i = 0; i < levels.length; ++i)
    (function (level) {
      forge.log[level] = function (category, message) {
        var args = Array.prototype.slice.call(arguments).slice(2);
        var msg = {
          timestamp: new Date(),
          level,
          category,
          message,
          arguments: args,
        };
        forge.log.logMessage(msg);
      };
    })(levels[i]);
  var levels;
  var i;
  forge.log.makeLogger = function (logFunction) {
    var logger = {
      flags: 0,
      f: logFunction,
    };
    forge.log.setLevel(logger, "none");
    return logger;
  };
  forge.log.setLevel = function (logger, level) {
    var rval = false;
    if (logger && !(logger.flags & forge.log.LEVEL_LOCKED))
      for (var i = 0; i < forge.log.levels.length; ++i) {
        var aValidLevel = forge.log.levels[i];
        if (level == aValidLevel) {
          logger.level = level;
          rval = true;
          break;
        }
      }
    return rval;
  };
  forge.log.lock = function (logger, lock) {
    if (typeof lock === "undefined" || lock) logger.flags |= forge.log.LEVEL_LOCKED;
    else logger.flags &= ~forge.log.LEVEL_LOCKED;
  };
  forge.log.addLogger = function (logger) {
    sLoggers.push(logger);
  };
  if (typeof console !== "undefined" && "log" in console) {
    if (console.error && console.warn && console.info && console.debug) {
      levelHandlers = {
        error: console.error,
        warning: console.warn,
        info: console.info,
        debug: console.debug,
        verbose: console.debug,
      };
      f = function (logger, message) {
        forge.log.prepareStandard(message);
        var handler = levelHandlers[message.level];
        var args = [message.standard];
        args = args.concat(message.arguments.slice());
        handler.apply(console, args);
      };
      logger = forge.log.makeLogger(f);
    } else {
      f = function (logger, message) {
        forge.log.prepareStandardFull(message);
        console.log(message.standardFull);
      };
      logger = forge.log.makeLogger(f);
    }
    forge.log.setLevel(logger, "debug");
    forge.log.addLogger(logger);
    sConsoleLogger = logger;
  } else
    console = {
      log: function () {},
    };
  var logger;
  var levelHandlers;
  var f;
  if (sConsoleLogger !== null && typeof window !== "undefined" && window.location) {
    query = new URL(window.location.href).searchParams;
    if (query.has("console.level"))
      forge.log.setLevel(sConsoleLogger, query.get("console.level").slice(-1)[0]);
    if (query.has("console.lock")) {
      lock = query.get("console.lock").slice(-1)[0];
      if (lock == "true") forge.log.lock(sConsoleLogger);
    }
  }
  var query;
  var lock;
  forge.log.consoleLogger = sConsoleLogger;
});
export { require_log };
