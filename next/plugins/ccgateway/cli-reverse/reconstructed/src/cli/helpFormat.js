/**
 * cli/helpFormat.ts
 *
 * 2.1.316 新增：commander 帮助文本的自定义格式（排序、换行、列宽）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ardnz7sf.js (6)
 * attribution: placement 6
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { repeatString } from "../utils/stringUtils.js";

//@ chunk-ardnz7sf.js:35767-35796 placement
var HELP_INDENT = 2;
var HELP_COLUMN_GAP = 2;
var HELP_TERM_WIDTH = 36;
var HELP_MIN_DESC_WIDTH = 30;
var HELP_SUBCOMMAND_INDENT = 4;
//@ chunk-ardnz7sf.js:35796-36090 placement
function wrapHelpText(text, width) {
  let max = Math.max(width, 1);
  let lines = [];
  for (let line of text.split(`
`)) {
    let match = line.match(/\s*\S+/g);
    if (!match) {
      lines.push("");
      continue;
    }
    let wrappedLine = "";
    let lineWidth = 0;
    let hasLine = false;
    for (let word of match) {
      let wordWidth = bunStringWidth(word);
      if (!hasLine) {
        wrappedLine = word;
        lineWidth = wordWidth;
        hasLine = true;
      } else if (lineWidth + wordWidth <= max) {
        wrappedLine += word;
        lineWidth += wordWidth;
      } else {
        lines.push(wrappedLine);
        let replaced = word.replace(/^\s+/, "");
        wrappedLine = replaced;
        lineWidth = bunStringWidth(replaced);
      }
    }
    lines.push(wrappedLine);
  }
  return lines.join(`
`);
}
//@ chunk-ardnz7sf.js:36090-36451 placement
/**
 * 格式化帮助中的一项：名称列对齐后接说明；说明多行或列宽不够时换行缩进。
 */
function formatHelpItem(term, description, padWidth, helpWidth) {
  let termWidthLimit = " ".repeat(HELP_INDENT);
  if (!description) return termWidthLimit + term;
  let indent = bunStringWidth(term);
  if (
    description.includes(`
`)
  ) {
    let termWidth =
      indent <= padWidth
        ? repeatString(" ", padWidth - indent + HELP_COLUMN_GAP)
        : " ".repeat(HELP_COLUMN_GAP);
    return (termWidthLimit + term + termWidth + description).replace(
      /\n/g,
      `
` + termWidthLimit,
    );
  }
  let available = helpWidth - HELP_INDENT - padWidth - HELP_COLUMN_GAP;
  if (indent <= padWidth && available >= HELP_MIN_DESC_WIDTH) {
    let wrapped = repeatString(" ", padWidth - indent + HELP_COLUMN_GAP);
    let hangIndent = " ".repeat(HELP_INDENT + padWidth + HELP_COLUMN_GAP);
    let hangWidth = wrapHelpText(description, available);
    return (
      termWidthLimit +
      term +
      wrapped +
      hangWidth.replace(
        /\n/g,
        `
` + hangIndent,
      )
    );
  }
  let hangLines = " ".repeat(HELP_INDENT + HELP_SUBCOMMAND_INDENT);
  let lines = helpWidth - HELP_INDENT - HELP_SUBCOMMAND_INDENT;
  let entries = wrapHelpText(description, lines);
  return (
    termWidthLimit +
    term +
    `
` +
    hangLines +
    entries.replace(
      /\n/g,
      `
` + hangLines,
    )
  );
}
//@ chunk-ardnz7sf.js:36451-36510 placement
function pushHelpSection(lines, title, help) {
  if (help.length === 0) return;
  lines.push(title, ...help, "");
}
//@ chunk-ardnz7sf.js:36510-37116 placement
/**
 * 生成 commander 命令的帮助文本：Usage、描述，以及 Arguments/Options/Global Options/Commands 各段。
 */
function formatCommandHelp(command, helper) {
  let helpWidth = helper.helpWidth || 80;
  let min = Math.min(helper.padWidth(command, helper), HELP_TERM_WIDTH);
  let lines = [`Usage: ${helper.commandUsage(command)}`, ""];
  let out = helper.commandDescription(command);
  if (out.length > 0) lines.push(wrapHelpText(out, helpWidth), "");
  pushHelpSection(
    lines,
    "Arguments:",
    helper
      .visibleArguments(command)
      .map((option) =>
        formatHelpItem(helper.argumentTerm(option), helper.argumentDescription(option), min, helpWidth),
      ),
  );
  pushHelpSection(
    lines,
    "Options:",
    helper
      .visibleOptions(command)
      .map((option) =>
        formatHelpItem(helper.optionTerm(option), helper.optionDescription(option), min, helpWidth),
      ),
  );
  if (helper.showGlobalOptions)
    pushHelpSection(
      lines,
      "Global Options:",
      helper
        .visibleGlobalOptions(command)
        .map((option) =>
          formatHelpItem(helper.optionTerm(option), helper.optionDescription(option), min, helpWidth),
        ),
    );
  pushHelpSection(
    lines,
    "Commands:",
    helper
      .visibleCommands(command)
      .map((command) =>
        formatHelpItem(helper.subcommandTerm(command), helper.subcommandDescription(command), min, helpWidth),
      ),
  );
  return lines.join(`
`);
}
//@ chunk-ardnz7sf.js:37116-37320 placement
function createHelpConfig() {
  let flagName = (option) => option.long?.replace(/^--/, "") ?? option.short?.replace(/^-/, "") ?? "";
  return Object.assign(
    {
      sortSubcommands: true,
      sortOptions: true,
      formatHelp: formatCommandHelp,
    },
    {
      compareOptions: (a, b) => flagName(a).localeCompare(flagName(b)),
    },
  );
}
export { createHelpConfig };
