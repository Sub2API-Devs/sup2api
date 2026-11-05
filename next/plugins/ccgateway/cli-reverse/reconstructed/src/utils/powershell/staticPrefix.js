/**
 * utils/powershell/staticPrefix.ts
 *
 * 从 PowerShell 解析结果静态提取权限规则前缀（复合命令按首词分组求公共前缀）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/powershell/staticPrefix.ts
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: affinity 1, fingerprint 2, callgraph-fingerprint 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { NEVER_SUGGEST } from "./dangerousCmdlets.js";
import { startsWithBareShell } from "../../tools/BashTool/bashPermissions.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { buildPrefix, DEPTH_RULES } from "../shell/specPrefix.js";
import { parsePowerShellCommand } from "./parser.js";
import { firstLineOf, countCharInString } from "../stringUtils.js";

//@ chunk-czq1j3j2.js:1435261-1435289 affinity
var TENGU_MISTY_CROWN = "tengu_misty_crown";
//@ chunk-czq1j3j2.js:1435289-1435415 fingerprint (2.1.88 match: getCompoundCommandPrefixesStatic, 0.631)
/**
 * 取所有语句里 elementType 为 CommandAst 的命令。
 */
function getCompoundCommandPrefixesStatic(parsed) {
  let commands = [];
  for (let statement of parsed.statements)
    for (let command of statement.commands) if (command.elementType === "CommandAst") commands.push(command);
  return commands;
}
//@ chunk-czq1j3j2.js:1435415-1436473 fingerprint (2.1.88 match: extractPrefixFromElement, 0.898)
/**
 * 从单个 PowerShell 命令元素提取规则前缀：application 类、危险名（NEVER_SUGGEST）不建议；cmdlet 直接用名；外部命令要求参数全为常量/参数并经 buildPrefix 对齐；tengu_misty_crown 下拒绝带 isCommand 参数的命令。
 */
async function extractPrefixFromElement(specCache, cmd) {
  if (cmd.nameType === "application") return null;
  let name = cmd.name;
  if (!name) return null;
  if (!/^[A-Za-z0-9_+-]+$/.test(name)) return null;
  if (NEVER_SUGGEST.has(name.toLowerCase())) return null;
  if (cmd.nameType === "cmdlet") return name;
  if (cmd.elementTypes?.[0] !== "StringConstant") return null;
  for (let i = 0; i < cmd.args.length; i++) {
    let t = cmd.elementTypes[i + 1];
    if (t !== "StringConstant" && t !== "Parameter") return null;
  }
  let nameLower = name.toLowerCase();
  let spec = await specCache.get(nameLower);
  if (
    (startsWithBareShell(nameLower) || [spec?.args].flat().some((entry) => entry?.isCommand)) &&
    readFlagWithOverride(TENGU_MISTY_CROWN, {
      safe: true,
    })
  )
    return null;
  let prefix = await buildPrefix(name, cmd.args, spec);
  let argIdx = 0;
  for (let word of prefix.split(" ").slice(1)) {
    if (word.includes("\\")) return null;
    while (argIdx < cmd.args.length) {
      let arg = cmd.args[argIdx];
      if (arg === word) break;
      if (arg.startsWith("-")) {
        argIdx++;
        if (
          spec?.options &&
          argIdx < cmd.args.length &&
          cmd.args[argIdx] !== word &&
          !cmd.args[argIdx].startsWith("-")
        ) {
          let flagLower = arg.toLowerCase();
          if (
            spec.options.find((option) =>
              Array.isArray(option.name) ? option.name.includes(flagLower) : option.name === flagLower,
            )?.args
          )
            argIdx++;
        }
        continue;
      }
      return null;
    }
    if (argIdx >= cmd.args.length) return null;
    argIdx++;
  }
  if (!prefix.includes(" ") && (spec?.subcommands?.length || Object.hasOwn(DEPTH_RULES, nameLower)))
    return null;
  return prefix;
}
//@ chunk-czq1j3j2.js:1436473-1437032 callgraph-fingerprint (2.1.88 match: getCommandPrefixStatic, 0.236)
/**
 * 复合 PowerShell 命令的静态前缀：逐命令取前缀，按首词分组求词对齐公共前缀；只剩一个词且该命令有子命令/深度规则时丢弃。
 */
async function getCommandPrefixStatic(specCache, command, skip) {
  let parsed = await parsePowerShellCommand(command);
  if (!parsed.valid) return [];
  let commands = getCompoundCommandPrefixesStatic(parsed);
  if (commands.length <= 1) {
    let prefix = commands[0] ? await extractPrefixFromElement(specCache, commands[0]) : null;
    return prefix ? [prefix] : [];
  }
  let prefixes = [];
  for (let command of commands) {
    if (skip?.(command)) continue;
    let prefix = await extractPrefixFromElement(specCache, command);
    if (prefix) prefixes.push(prefix);
  }
  if (prefixes.length === 0) return [];
  let groups = new Map();
  for (let prefix of prefixes) {
    let lower = firstLineOf(prefix, " ").toLowerCase();
    let group = groups.get(lower);
    if (group) group.push(prefix);
    else groups.set(lower, [prefix]);
  }
  let collapsed = [];
  for (let [rootLower, group] of groups) {
    let lcp = wordAlignedLCP(group);
    if ((lcp === "" ? 0 : countCharInString(lcp, " ") + 1) <= 1) {
      if ((await specCache.get(rootLower))?.subcommands?.length || Object.hasOwn(DEPTH_RULES, rootLower))
        continue;
    }
    collapsed.push(lcp);
  }
  return collapsed;
}
//@ chunk-czq1j3j2.js:1437032-1437314 file-local
function wordAlignedLCP(strings) {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];
  let firstWords = strings[0].split(" ");
  let commonWordCount = firstWords.length;
  for (let i = 1; i < strings.length; i++) {
    let words = strings[i].split(" ");
    let matchCount = 0;
    while (
      matchCount < commonWordCount &&
      matchCount < words.length &&
      words[matchCount].toLowerCase() === firstWords[matchCount].toLowerCase()
    )
      matchCount++;
    commonWordCount = matchCount;
    if (commonWordCount === 0) break;
  }
  return firstWords.slice(0, commonWordCount).join(" ");
}
export { getCommandPrefixStatic };
