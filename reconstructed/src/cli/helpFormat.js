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
var w = 2,
  E = 2,
  Lt = 36,
  Rt = 30,
  tt = 4;
//@ chunk-b7dyevzy.js:35796-36090 placement
function wrapHelpText(t, e) {
  let max = Math.max(e, 1),
    n = [];
  for (let s of t.split(`
`)) {
    let match = s.match(/\s*\S+/g);
    if (!match) {
      n.push("");
      continue;
    }
    let a = "",
      o = 0,
      h = !1;
    for (let u of match) {
      let c = bunStringWidth(u);
      if (!h) ((a = u), (o = c), (h = !0));
      else if (o + c <= max) ((a += u), (o += c));
      else {
        n.push(a);
        let replaced = u.replace(/^\s+/, "");
        ((a = replaced), (o = bunStringWidth(replaced)));
      }
    }
    n.push(a);
  }
  return n.join(`
`);
}
/**
 * 格式化帮助中的一项：名称列对齐后接说明；说明多行或列宽不够时换行缩进。
 */
//@ chunk-b7dyevzy.js:36090-36451 placement
function formatHelpItem(t, e, i, n) {
  let repeat = " ".repeat(w);
  if (!e) return repeat + t;
  let r = bunStringWidth(t);
  if (
    e.includes(`
`)
  ) {
    let c = r <= i ? repeatString(" ", i - r + E) : " ".repeat(E);
    return (repeat + t + c + e).replace(
      /\n/g,
      `
` + repeat,
    );
  }
  let a = n - w - i - E;
  if (r <= i && a >= Rt) {
    let c = repeatString(" ", i - r + E),
      repeat_2 = " ".repeat(w + i + E),
      _ = wrapHelpText(e, a);
    return (
      repeat +
      t +
      c +
      _.replace(
        /\n/g,
        `
` + repeat_2,
      )
    );
  }
  let repeat_2 = " ".repeat(w + tt),
    h = n - w - tt,
    u = wrapHelpText(e, h);
  return (
    repeat +
    t +
    `
` +
    repeat_2 +
    u.replace(
      /\n/g,
      `
` + repeat_2,
    )
  );
}
//@ chunk-b7dyevzy.js:36451-36510 placement
function y(t, e, i) {
  if (i.length === 0) return;
  t.push(e, ...i, "");
}
/**
 * 生成 commander 命令的帮助文本：Usage、描述，以及 Arguments/Options/Global Options/Commands 各段。
 */
//@ chunk-b7dyevzy.js:36510-37116 placement
function formatCommandHelp(command, helper) {
  let helpWidth = helper.helpWidth || 80,
    min = Math.min(helper.padWidth(command, helper), Lt),
    lines = [`Usage: ${helper.commandUsage(command)}`, ""],
    commandDescription = helper.commandDescription(command);
  if (commandDescription.length > 0) lines.push(wrapHelpText(commandDescription, helpWidth), "");
  if (
    (y(
      lines,
      "Arguments:",
      helper
        .visibleArguments(command)
        .map((a) => formatHelpItem(helper.argumentTerm(a), helper.argumentDescription(a), min, helpWidth)),
    ),
    y(
      lines,
      "Options:",
      helper
        .visibleOptions(command)
        .map((a) => formatHelpItem(helper.optionTerm(a), helper.optionDescription(a), min, helpWidth)),
    ),
    helper.showGlobalOptions)
  )
    y(
      lines,
      "Global Options:",
      helper
        .visibleGlobalOptions(command)
        .map((a) => formatHelpItem(helper.optionTerm(a), helper.optionDescription(a), min, helpWidth)),
    );
  return (
    y(
      lines,
      "Commands:",
      helper
        .visibleCommands(command)
        .map((a) =>
          formatHelpItem(helper.subcommandTerm(a), helper.subcommandDescription(a), min, helpWidth),
        ),
    ),
    lines.join(`
`)
  );
}
//@ chunk-b7dyevzy.js:37116-37320 placement
function createHelpConfig() {
  let t = (e) => e.long?.replace(/^--/, "") ?? e.short?.replace(/^-/, "") ?? "";
  return Object.assign(
    { sortSubcommands: !0, sortOptions: !0, formatHelp: formatCommandHelp },
    { compareOptions: (e, i) => t(e).localeCompare(t(i)) },
  );
}

export { createHelpConfig };
