/**
 * commander/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-ardnz7sf.js (2)
 * attribution: cjs-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_argument } from "./lib/argument.js";
import { require_command } from "./lib/command.js";
import { require_error } from "./lib/error.js";
import { require_help } from "./lib/help.js";
import { require_option } from "./lib/option.js";

//@ chunk-ardnz7sf.js:34778-35160 cjs-fingerprint
var require_commander = __commonJS(function (cjsExports) {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  cjsExports.program = new Command();
  cjsExports.createCommand = (name) => new Command(name);
  cjsExports.createOption = (flags, description) => new Option(flags, description);
  cjsExports.createArgument = (name, description) => new Argument(name, description);
  cjsExports.Command = Command;
  cjsExports.Option = Option;
  cjsExports.Argument = Argument;
  cjsExports.Help = Help;
  cjsExports.CommanderError = CommanderError;
  cjsExports.InvalidArgumentError = InvalidArgumentError;
  cjsExports.InvalidOptionArgumentError = InvalidArgumentError;
});
//@ chunk-ardnz7sf.js:35160-35561 cjs-fingerprint
var require_commander_2 = __commonJS(function (cjsExports, cjsModule) {
  var commanderModule = require_commander();
  cjsExports = cjsModule.exports = {};
  cjsExports.program = new commanderModule.Command();
  cjsExports.Argument = commanderModule.Argument;
  cjsExports.Command = commanderModule.Command;
  cjsExports.CommanderError = commanderModule.CommanderError;
  cjsExports.Help = commanderModule.Help;
  cjsExports.InvalidArgumentError = commanderModule.InvalidArgumentError;
  cjsExports.InvalidOptionArgumentError = commanderModule.InvalidArgumentError;
  cjsExports.Option = commanderModule.Option;
  cjsExports.createCommand = (name) => new commanderModule.Command(name);
  cjsExports.createOption = (flags, description) => new commanderModule.Option(flags, description);
  cjsExports.createArgument = (name, description) => new commanderModule.Argument(name, description);
});
export { require_commander_2 };
