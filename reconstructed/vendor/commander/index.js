/**
 * commander/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (2)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_argument } from "./lib/argument.js";
import { require_command } from "./lib/command.js";
import { require_error } from "./lib/error.js";
import { require_help } from "./lib/help.js";
import { require_option } from "./lib/option.js";

//@ chunk-b7dyevzy.js:34778-35160 cjs-fingerprint
var require_commander = x(function (cjsExports) {
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
//@ chunk-b7dyevzy.js:35160-35561 cjs-fingerprint
var require_commander_2 = x(function (cjsExports, cjsModule) {
  var m = require_commander();
  cjsExports = cjsModule.exports = {};
  cjsExports.program = new m.Command();
  cjsExports.Argument = m.Argument;
  cjsExports.Command = m.Command;
  cjsExports.CommanderError = m.CommanderError;
  cjsExports.Help = m.Help;
  cjsExports.InvalidArgumentError = m.InvalidArgumentError;
  cjsExports.InvalidOptionArgumentError = m.InvalidArgumentError;
  cjsExports.Option = m.Option;
  cjsExports.createCommand = (t) => new m.Command(t);
  cjsExports.createOption = (t, e) => new m.Option(t, e);
  cjsExports.createArgument = (t, e) => new m.Argument(t, e);
});
export { require_commander_2 };
