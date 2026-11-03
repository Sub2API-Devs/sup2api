/**
 * commander/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (2)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../runtime/bun-runtime.js";
import { H } from "./lib/argument.js";
import { B } from "./lib/command.js";
import { b } from "./lib/error.js";
import { k } from "./lib/help.js";
import { D } from "./lib/option.js";

//@ chunk-b7dyevzy.js:34778-35160 cjs-fingerprint
var Y = x(function (kt) {
  var { Argument: Argument } = H(),
    { Command: Command } = B(),
    { CommanderError: CommanderError, InvalidArgumentError: InvalidArgumentError } = b(),
    { Help: Help } = k(),
    { Option: Option } = D();
  kt.program = new Command();
  kt.createCommand = (t) => new Command(t);
  kt.createOption = (t, e) => new Option(t, e);
  kt.createArgument = (t, e) => new Argument(t, e);
  kt.Command = Command;
  kt.Option = Option;
  kt.Argument = Argument;
  kt.Help = Help;
  kt.CommanderError = CommanderError;
  kt.InvalidArgumentError = InvalidArgumentError;
  kt.InvalidOptionArgumentError = InvalidArgumentError;
});
//@ chunk-b7dyevzy.js:35160-35561 cjs-fingerprint
var Q = x(function (g, X) {
  var m = Y();
  g = X.exports = {};
  g.program = new m.Command();
  g.Argument = m.Argument;
  g.Command = m.Command;
  g.CommanderError = m.CommanderError;
  g.Help = m.Help;
  g.InvalidArgumentError = m.InvalidArgumentError;
  g.InvalidOptionArgumentError = m.InvalidArgumentError;
  g.Option = m.Option;
  g.createCommand = (t) => new m.Command(t);
  g.createOption = (t, e) => new m.Option(t, e);
  g.createArgument = (t, e) => new m.Argument(t, e);
});

export { Q };
