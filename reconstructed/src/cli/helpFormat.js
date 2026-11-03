/**
 * cli/helpFormat.ts
 *
 * 2.1.316 新增：commander 帮助文本的自定义格式（排序、换行、列宽）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b7dyevzy.js (6)
 * attribution: placement 6
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { repeatString } from "../utils/stringUtils.js";

//@ chunk-b7dyevzy.js:35767-35796 placement
var HELP_INDENT = 2;
var HELP_COLUMN_GAP = 2;
var HELP_TERM_WIDTH = 36;
var HELP_MIN_DESC_WIDTH = 30;
var HELP_SUBCOMMAND_INDENT = 4;
//@ chunk-b7dyevzy.js:35796-36090 placement
function wrapHelpText(t, e) {
  let max = Math.max(e, 1);
  let n = [];
  for (let line of t.split(`
`)) {
    let match = line.match(/\s*\S+/g);
    if (!match) {
      n.push("");
      continue;
    }
    let a = "";
    let o = 0;
    let h = false;
    for (let u of match) {
      let c = bunStringWidth(u);
      if (!h) {
        a = u;
        o = c;
        h = true;
      } else if (o + c <= max) {
        a += u;
        o += c;
      } else {
        n.push(a);
        let replaced = u.replace(/^\s+/, "");
        a = replaced;
        o = bunStringWidth(replaced);
      }
    }
    n.push(a);
  }
  return n.join(`
`);
}
//@ chunk-b7dyevzy.js:36090-36451 placement
/**
 * 格式化帮助中的一项：名称列对齐后接说明；说明多行或列宽不够时换行缩进。
 */
function formatHelpItem(t, e, i, helpWidth) {
  let s = " ".repeat(HELP_INDENT);
  if (!e) return s + t;
  let r = bunStringWidth(t);
  if (
    e.includes(`
`)
  ) {
    let c = r <= i ? repeatString(" ", i - r + HELP_COLUMN_GAP) : " ".repeat(HELP_COLUMN_GAP);
    return (s + t + c + e).replace(
      /\n/g,
      `
` + s,
    );
  }
  let a = helpWidth - HELP_INDENT - i - HELP_COLUMN_GAP;
  if (r <= i && a >= HELP_MIN_DESC_WIDTH) {
    let c = repeatString(" ", i - r + HELP_COLUMN_GAP);
    let d = " ".repeat(HELP_INDENT + i + HELP_COLUMN_GAP);
    let _ = wrapHelpText(e, a);
    return (
      s +
      t +
      c +
      _.replace(
        /\n/g,
        `
` + d,
      )
    );
  }
  let o = " ".repeat(HELP_INDENT + HELP_SUBCOMMAND_INDENT);
  let h = helpWidth - HELP_INDENT - HELP_SUBCOMMAND_INDENT;
  let u = wrapHelpText(e, h);
  return (
    s +
    t +
    `
` +
    o +
    u.replace(
      /\n/g,
      `
` + o,
    )
  );
}
//@ chunk-b7dyevzy.js:36451-36510 placement
function pushHelpSection(lines, e, i) {
  if (i.length === 0) return;
  lines.push(e, ...i, "");
}
//@ chunk-b7dyevzy.js:36510-37116 placement
/**
 * 生成 commander 命令的帮助文本：Usage、描述，以及 Arguments/Options/Global Options/Commands 各段。
 */
function formatCommandHelp(command, helper) {
  let helpWidth = helper.helpWidth || 80;
  let min = Math.min(helper.padWidth(command, helper), HELP_TERM_WIDTH);
  let lines = [`Usage: ${helper.commandUsage(command)}`, ""];
  let r = helper.commandDescription(command);
  if (r.length > 0) lines.push(wrapHelpText(r, helpWidth), "");
  pushHelpSection(
    lines,
    "Arguments:",
    helper
      .visibleArguments(command)
      .map((a) => formatHelpItem(helper.argumentTerm(a), helper.argumentDescription(a), min, helpWidth)),
  );
  pushHelpSection(
    lines,
    "Options:",
    helper
      .visibleOptions(command)
      .map((a) => formatHelpItem(helper.optionTerm(a), helper.optionDescription(a), min, helpWidth)),
  );
  if (helper.showGlobalOptions)
    pushHelpSection(
      lines,
      "Global Options:",
      helper
        .visibleGlobalOptions(command)
        .map((a) => formatHelpItem(helper.optionTerm(a), helper.optionDescription(a), min, helpWidth)),
    );
  pushHelpSection(
    lines,
    "Commands:",
    helper
      .visibleCommands(command)
      .map((a) => formatHelpItem(helper.subcommandTerm(a), helper.subcommandDescription(a), min, helpWidth)),
  );
  return lines.join(`
`);
}
//@ chunk-b7dyevzy.js:37116-37320 placement
function createHelpConfig() {
  let t = (e) => e.long?.replace(/^--/, "") ?? e.short?.replace(/^-/, "") ?? "";
  return Object.assign(
    {
      sortSubcommands: true,
      sortOptions: true,
      formatHelp: formatCommandHelp,
    },
    {
      compareOptions: (e, i) => t(e).localeCompare(t(i)),
    },
  );
}
export { createHelpConfig };
