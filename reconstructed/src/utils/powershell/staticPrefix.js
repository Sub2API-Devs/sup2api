/**
 * utils/powershell/staticPrefix.ts
 *
 * 从 PowerShell 解析结果静态提取权限规则前缀（复合命令按首词分组求公共前缀）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/powershell/staticPrefix.ts
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: affinity 1, fingerprint 2, callgraph-fingerprint 1, file-local 1
 */
import { NEVER_SUGGEST } from "./dangerousCmdlets.js";
import { startsWithBareShell } from "../../tools/BashTool/bashPermissions.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { buildPrefix, DEPTH_RULES } from "../shell/specPrefix.js";
import { parsePowerShellCommand } from "./parser.js";
import { firstLineOf, countCharInString } from "../stringUtils.js";

//@ chunk-18hwfzwa.js:1396518-1396546 affinity
var TENGU_MISTY_CROWN = "tengu_misty_crown";
/**
 * 取所有语句里 elementType 为 CommandAst 的命令。
 */
//@ chunk-18hwfzwa.js:1396546-1396672 fingerprint = getCompoundCommandPrefixesStatic (0.631)
function getCompoundCommandPrefixesStatic(h) {
  let x = [];
  for (let statement of h.statements)
    for (let command of statement.commands) if (command.elementType === "CommandAst") x.push(command);
  return x;
}
/**
 * 从单个 PowerShell 命令元素提取规则前缀：application 类、危险名（NEVER_SUGGEST）不建议；cmdlet 直接用名；外部命令要求参数全为常量/参数并经 buildPrefix 对齐；tengu_misty_crown 下拒绝带 isCommand 参数的命令。
 */
//@ chunk-18hwfzwa.js:1396672-1397730 fingerprint = extractPrefixFromElement (0.897)
async function extractPrefixFromElement(h, x) {
  if (x.nameType === "application") return null;
  let name = x.name;
  if (!name) return null;
  if (!/^[A-Za-z0-9_+-]+$/.test(name)) return null;
  if (NEVER_SUGGEST.has(name.toLowerCase())) return null;
  if (x.nameType === "cmdlet") return name;
  if (x.elementTypes?.[0] !== "StringConstant") return null;
  for (let Be = 0; Be < x.args.length; Be++) {
    let He = x.elementTypes[Be + 1];
    if (He !== "StringConstant" && He !== "Parameter") return null;
  }
  let nameLower = name.toLowerCase(),
    ee = await h.get(nameLower);
  if (
    (startsWithBareShell(nameLower) || [ee?.args].flat().some((Be) => Be?.isCommand)) &&
    readFlagWithOverride(TENGU_MISTY_CROWN, { safe: !0 })
  )
    return null;
  let prefix = await buildPrefix(name, x.args, ee),
    Re = 0;
  for (let word of prefix.split(" ").slice(1)) {
    if (word.includes("\\")) return null;
    while (Re < x.args.length) {
      let He = x.args[Re];
      if (He === word) break;
      if (He.startsWith("-")) {
        if ((Re++, ee?.options && Re < x.args.length && x.args[Re] !== word && !x.args[Re].startsWith("-"))) {
          let flagLower = He.toLowerCase();
          if (
            ee.options.find((option) =>
              Array.isArray(option.name) ? option.name.includes(flagLower) : option.name === flagLower,
            )?.args
          )
            Re++;
        }
        continue;
      }
      return null;
    }
    if (Re >= x.args.length) return null;
    Re++;
  }
  if (!prefix.includes(" ") && (ee?.subcommands?.length || Object.hasOwn(DEPTH_RULES, nameLower)))
    return null;
  return prefix;
}
/**
 * 复合 PowerShell 命令的静态前缀：逐命令取前缀，按首词分组求词对齐公共前缀；只剩一个词且该命令有子命令/深度规则时丢弃。
 */
//@ chunk-18hwfzwa.js:1397730-1398289 callgraph-fingerprint = getCommandPrefixStatic (0.236)
async function getCommandPrefixStatic(h, x, D) {
  let parsed = await parsePowerShellCommand(x);
  if (!parsed.valid) return [];
  let ee = getCompoundCommandPrefixesStatic(parsed);
  if (ee.length <= 1) {
    let He = ee[0] ? await extractPrefixFromElement(h, ee[0]) : null;
    return He ? [He] : [];
  }
  let ke = [];
  for (let He of ee) {
    if (D?.(He)) continue;
    let We = await extractPrefixFromElement(h, He);
    if (We) ke.push(We);
  }
  if (ke.length === 0) return [];
  let Re = new Map();
  for (let He of ke) {
    let lower = firstLineOf(He, " ").toLowerCase(),
      ze = Re.get(lower);
    if (ze) ze.push(He);
    else Re.set(lower, [He]);
  }
  let Be = [];
  for (let [He, We] of Re) {
    let ze = wordAlignedLCP(We);
    if ((ze === "" ? 0 : countCharInString(ze, " ") + 1) <= 1) {
      if ((await h.get(He))?.subcommands?.length || Object.hasOwn(DEPTH_RULES, He)) continue;
    }
    Be.push(ze);
  }
  return Be;
}
//@ chunk-18hwfzwa.js:1398289-1398571 file-local
function wordAlignedLCP(strings) {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];
  let firstWords = strings[0].split(" "),
    commonWordCount = firstWords.length;
  for (let L = 1; L < strings.length; L++) {
    let words = strings[L].split(" "),
      matchCount = 0;
    while (
      matchCount < commonWordCount &&
      matchCount < words.length &&
      words[matchCount].toLowerCase() === firstWords[matchCount].toLowerCase()
    )
      matchCount++;
    if (((commonWordCount = matchCount), commonWordCount === 0)) break;
  }
  return firstWords.slice(0, commonWordCount).join(" ");
}

export { getCommandPrefixStatic };
