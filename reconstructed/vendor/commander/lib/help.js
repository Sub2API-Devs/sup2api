/**
 * commander/lib/help.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_argument } from "./argument.js";

//@ chunk-b7dyevzy.js:1889-6481 cjs-fingerprint
var require_help = x(function (cjsExports) {
  var { humanReadableArgName } = require_argument();
  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    visibleCommands(cmd) {
      let visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
      let helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) visibleCommands.push(helpCommand);
      if (this.sortSubcommands) visibleCommands.sort((a, b) => a.name().localeCompare(b.name()));
      return visibleCommands;
    }
    compareOptions(a, b) {
      let getSortKey = (option) =>
        option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      let visibleOptions = cmd.options.filter((option) => !option.hidden);
      let helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        let removeShort = helpOption.short && cmd._findOption(helpOption.short);
        let removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) visibleOptions.push(helpOption);
        else if (helpOption.long && !removeLong)
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        else if (helpOption.short && !removeShort)
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
      }
      if (this.sortOptions) visibleOptions.sort(this.compareOptions);
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions) return [];
      let globalOptions = [];
      for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        let visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) globalOptions.sort(this.compareOptions);
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription)
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      if (cmd.registeredArguments.find((argument) => argument.description)) return cmd.registeredArguments;
      return [];
    }
    subcommandTerm(cmd) {
      let args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return (
        cmd._name +
        (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") +
        (cmd.options.length ? " [options]" : "") +
        (args ? " " + args : "")
      );
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper
        .visibleCommands(cmd)
        .reduce((max, command) => Math.max(max, helper.subcommandTerm(command).length), 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper
        .visibleOptions(cmd)
        .reduce((max, option) => Math.max(max, helper.optionTerm(option).length), 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper
        .visibleGlobalOptions(cmd)
        .reduce((max, option) => Math.max(max, helper.optionTerm(option).length), 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper
        .visibleArguments(cmd)
        .reduce((max, argument) => Math.max(max, helper.argumentTerm(argument).length), 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) cmdName = cmdName + "|" + cmd._aliases[0];
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent)
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      let extraInfo = [];
      if (option.argChoices)
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      if (option.defaultValue !== undefined) {
        if (
          option.required ||
          option.optional ||
          (option.isBoolean() && typeof option.defaultValue === "boolean")
        )
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
      }
      if (option.presetArg !== undefined && option.optional)
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      if (option.envVar !== undefined) extraInfo.push(`env: ${option.envVar}`);
      if (extraInfo.length > 0) return `${option.description} (${extraInfo.join(", ")})`;
      return option.description;
    }
    argumentDescription(argument) {
      let extraInfo = [];
      if (argument.argChoices)
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      if (argument.defaultValue !== undefined)
        extraInfo.push(
          `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`,
        );
      if (extraInfo.length > 0) {
        let extraDescripton = `(${extraInfo.join(", ")})`;
        if (argument.description) return `${argument.description} ${extraDescripton}`;
        return extraDescripton;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      let termWidth = helper.padWidth(cmd, helper);
      let helpWidth = helper.helpWidth || 80;
      let itemIndentWidth = 2;
      let itemSeparatorWidth = 2;
      function formatItem(term, description) {
        if (description) {
          let fullText = `${term.padEnd(termWidth + 2)}${description}`;
          return helper.wrap(fullText, helpWidth - 2, termWidth + 2);
        }
        return term;
      }
      function formatList(textArray) {
        return textArray
          .join(
            `
`,
          )
          .replace(/^/gm, " ".repeat(2));
      }
      let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
      let commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0)
        output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
      let argumentList = helper
        .visibleArguments(cmd)
        .map((argument) => formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument)));
      if (argumentList.length > 0) output = output.concat(["Arguments:", formatList(argumentList), ""]);
      let optionList = helper
        .visibleOptions(cmd)
        .map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
      if (optionList.length > 0) output = output.concat(["Options:", formatList(optionList), ""]);
      if (this.showGlobalOptions) {
        let globalOptionList = helper
          .visibleGlobalOptions(cmd)
          .map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
        if (globalOptionList.length > 0)
          output = output.concat(["Global Options:", formatList(globalOptionList), ""]);
      }
      let commandList = helper
        .visibleCommands(cmd)
        .map((cmd) => formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd)));
      if (commandList.length > 0) output = output.concat(["Commands:", formatList(commandList), ""]);
      return output.join(`
`);
    }
    padWidth(cmd, helper) {
      return Math.max(
        helper.longestOptionTermLength(cmd, helper),
        helper.longestGlobalOptionTermLength(cmd, helper),
        helper.longestSubcommandTermLength(cmd, helper),
        helper.longestArgumentTermLength(cmd, helper),
      );
    }
    wrap(str, width, indent, minColumnWidth = 40) {
      let manualIndent = new RegExp(`[\\n][${" \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF"}]+`);
      if (str.match(manualIndent)) return str;
      let columnWidth = width - indent;
      if (columnWidth < minColumnWidth) return str;
      let leadingStr = str.slice(0, indent);
      let columnText = str.slice(indent).replace(
        `\r
`,
        `
`,
      );
      let indentString = " ".repeat(indent);
      let breaks = `\\s${"\u200B"}`;
      let regex = new RegExp(
        `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
        "g",
      );
      let lines = columnText.match(regex) || [];
      return (
        leadingStr +
        lines.map((line, i) => {
          if (
            line ===
            `
`
          )
            return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join(`
`)
      );
    }
  }
  cjsExports.Help = Help;
});
export { require_help };
