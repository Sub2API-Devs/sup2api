/**
 * utils/bash/prefix.ts
 *
 * 基于 Fig spec 的静态命令前缀提取（处理包装命令、子命令、复合命令），用于权限规则建议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/prefix.ts
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: fingerprint 5, layout 2, file-local 1, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseCommand, extractCommandArguments } from "./parser.js";
import { buildPrefix, noAdditionalDepthRule } from "../shell/specPrefix.js";
import { countCharInString, firstLineOf } from "../stringUtils.js";
import { splitCommand } from "./commands.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1042834-1043027 fingerprint (2.1.88 match: isKnownSubcommand, 1)
/**
 * 参数是否为 spec 中的子命令名（大小写不敏感，支持别名数组）。
 */
function isKnownSubcommand(arg, spec) {
  if (!spec?.subcommands?.length) return false;
  let lower = arg.toLowerCase();
  return spec.subcommands.some((sub) =>
    Array.isArray(sub.name)
      ? sub.name.some((name) => name.toLowerCase() === lower)
      : sub.name.toLowerCase() === lower,
  );
}
//@ chunk-5xgkngpb.js:3118432-3118533 fingerprint (2.1.88 match: WRAPPER_COMMANDS, 1)
/**
 * 前缀提取用的常量：纯数字参数正则、环境变量赋值正则、总视为包装命令的集合（nice），以及转数组的辅助函数。
 */
var NUMERIC_ARG_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ENV_ASSIGN_RE;
var ALWAYS_WRAPPER_COMMANDS;
var toArray;
deferInit("chunk-5xgkngpb.js:3118432", () => {
  NUMERIC_ARG_RE = /^\d+$/;
  ENV_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;
  ALWAYS_WRAPPER_COMMANDS = new Set(["nice"]);
  toArray = (val) => (Array.isArray(val) ? val : [val]);
});
//@ chunk-5xgkngpb.js:3118533-3118671 layout (2.1.88 match: isKnownSubcommand, 1)
function isExactSubcommand(arg, spec) {
  if (!spec?.subcommands?.length) return false;
  return spec.subcommands.some((sub) =>
    Array.isArray(sub.name) ? sub.name.includes(arg) : sub.name === arg,
  );
}
//@ chunk-5xgkngpb.js:3118671-3119250 fingerprint (2.1.88 match: getCommandPrefixStatic, 1)
/**
 * 用 Fig spec 静态计算命令前缀（用于“始终允许 xxx 开头的命令”建议）：递归最多 10 层/包装 2 层；包装命令（nice 或 spec 中 isCommand 参数）递归取被包装命令前缀；前缀词数少于 MH 要求时返回 null 前缀；保留前导 VAR=val。
 */
async function getCommandPrefixStatic(specRegistry, command, recursionDepth = 0, wrapperDepth = 0) {
  if (wrapperDepth > 2 || recursionDepth > 10) return null;
  let parsed = await parseCommand(command);
  if (!parsed) return null;
  if (!parsed.commandNode)
    return {
      commandPrefix: null,
    };
  let { envVars, commandNode } = parsed;
  let cmdArgs = extractCommandArguments(commandNode);
  let [cmd, ...args] = cmdArgs;
  if (!cmd)
    return {
      commandPrefix: null,
    };
  let spec = await specRegistry.get(cmd);
  let isWrapper =
    ALWAYS_WRAPPER_COMMANDS.has(cmd) || (spec?.args && toArray(spec.args).some((arg) => arg?.isCommand));
  if (isWrapper && args[0] && isExactSubcommand(args[0], spec)) isWrapper = false;
  let prefix = isWrapper
    ? await handleWrapper(specRegistry, cmd, args, recursionDepth, wrapperDepth)
    : await buildPrefix(cmd, args, spec);
  if (prefix === null && recursionDepth === 0 && isWrapper) return null;
  let minDepth = noAdditionalDepthRule(cmd, args[0] ?? "");
  if (minDepth !== undefined && countCharInString(prefix ?? "", " ") + 1 < minDepth)
    return {
      commandPrefix: null,
    };
  let envPrefix = envVars.length ? `${envVars.join(" ")} ` : "";
  return {
    commandPrefix: prefix ? envPrefix + prefix : null,
  };
}
//@ chunk-5xgkngpb.js:3119250-3119820 fingerprint (2.1.88 match: handleWrapper, 1)
/**
 * 处理包装命令（timeout/nohup/srun…）：按 spec 的 isCommand 参数位置或第一个非选项参数找到被包装命令，递归取其前缀并拼上包装名。
 */
async function handleWrapper(specRegistry, wrapperName, args, recursionDepth, wrapperCount) {
  let spec = await specRegistry.get(wrapperName);
  if (spec?.args) {
    let commandArgIndex = toArray(spec.args).findIndex((arg) => arg?.isCommand);
    if (commandArgIndex !== -1) {
      let parts = [wrapperName];
      for (let i = 0; i < args.length && i <= commandArgIndex; i++)
        if (i === commandArgIndex) {
          let result = await getCommandPrefixStatic(
            specRegistry,
            args.slice(i).join(" "),
            recursionDepth + 1,
            wrapperCount + 1,
          );
          if (result?.commandPrefix) {
            parts.push(...result.commandPrefix.split(" "));
            return parts.join(" ");
          }
          break;
        } else if (args[i] && !args[i].startsWith("-") && !ENV_ASSIGN_RE.test(args[i])) parts.push(args[i]);
    }
  }
  let wrapped = args.find(
    (arg) => !arg.startsWith("-") && !NUMERIC_ARG_RE.test(arg) && !ENV_ASSIGN_RE.test(arg),
  );
  if (!wrapped) return wrapperName;
  let result = await getCommandPrefixStatic(
    specRegistry,
    args.slice(args.indexOf(wrapped)).join(" "),
    recursionDepth + 1,
    wrapperCount + 1,
  );
  return !result?.commandPrefix ? null : `${wrapperName} ${result.commandPrefix}`;
}
//@ chunk-5xgkngpb.js:3119820-3120228 fingerprint (2.1.88 match: getCompoundCommandPrefixesStatic, 1)
/**
 * 复合命令的前缀：用 splitCommand 拆子命令，逐个求前缀（可用回调排除），按首词分组后取最长公共前缀。
 */
async function getCompoundCommandPrefixesStatic(command, command_2, isExcluded) {
  let subcommands = splitCommand(command_2);
  if (subcommands.length <= 1) {
    let result = await getCommandPrefixStatic(command, command_2);
    return result?.commandPrefix ? [result.commandPrefix] : [];
  }
  let prefixes = [];
  for (let subcmd of subcommands) {
    let trimmed = subcmd.trim();
    if (isExcluded?.(trimmed)) continue;
    let result = await getCommandPrefixStatic(command, trimmed);
    if (result?.commandPrefix) prefixes.push(result.commandPrefix);
  }
  if (prefixes.length === 0) return [];
  let groups = new Map();
  for (let prefix of prefixes) {
    let root = firstLineOf(prefix, " ");
    let group = groups.get(root);
    if (group) group.push(prefix);
    else groups.set(root, [prefix]);
  }
  let collapsed = [];
  for (let [, group] of groups) collapsed.push(longestCommonPrefix(group));
  return collapsed;
}
//@ chunk-5xgkngpb.js:3120228-3120469 file-local
/**
 * 按空格分词求多个字符串的最长公共前缀（至少保留首词）。
 */
function longestCommonPrefix(strings) {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];
  let words = strings[0].split(" ");
  let commonWords = words.length;
  for (let i = 1; i < strings.length; i++) {
    let otherWords = strings[i].split(" ");
    let shared = 0;
    while (shared < commonWords && shared < otherWords.length && words[shared] === otherWords[shared])
      shared++;
    commonWords = shared;
  }
  return words.slice(0, Math.max(1, commonWords)).join(" ");
}
//@ chunk-5xgkngpb.js:3120469-3120668 layout (2.1.88 match: getCompoundCommandPrefixesStatic, 1)
/**
 * 复合命令逐子命令求前缀，去掉命令自带的 VAR=val，再按 spec 逐层扩展子命令，返回去重后的前缀列表。
 */
async function getCompoundCommandPrefixesStatic_2(command, excludeSubcommand) {
  let prefixes = new Set();
  for (let subcmd of splitCommand(excludeSubcommand)) {
    let trimmed = subcmd.trim();
    let commandPrefixStatic = await getCommandPrefixStatic(command, trimmed);
    if (!commandPrefixStatic?.commandPrefix) continue;
    let stripped = await stripEnvVarPrefix(trimmed, commandPrefixStatic.commandPrefix);
    let extended = await extendPrefixBySpec(command, stripped);
    if (extended) prefixes.add(extended);
  }
  return [...prefixes];
}
//@ chunk-5xgkngpb.js:3120668-3120818 placement
async function stripEnvVarPrefix(command, prefix) {
  let command_2 = await parseCommand(command);
  if (command_2?.envVars.length) {
    let envPrefix = `${command_2.envVars.join(" ")} `;
    if (prefix.startsWith(envPrefix)) return prefix.slice(envPrefix.length);
  }
  return prefix;
}
//@ chunk-5xgkngpb.js:3120818-3121169 placement
async function extendPrefixBySpec(command, prefix) {
  let filtered = prefix.split(" ").filter(Boolean);
  if (filtered.length <= 1) return prefix;
  let parts = [filtered[0]];
  let currentSpec = await command.get(filtered[0]);
  for (let idx = 1; idx < filtered.length; idx++) {
    let spec = filtered[idx];
    if (spec.startsWith("-")) break;
    if (currentSpec?.args && toArray(currentSpec.args).some((argSpec) => argSpec?.isCommand)) {
      if (NUMERIC_ARG_RE.test(spec)) continue;
      parts.push(spec);
      currentSpec = await command.get(spec);
      continue;
    }
    let subcommandSpec = findSubcommandSpec(currentSpec, spec);
    if (!subcommandSpec) break;
    parts.push(spec);
    currentSpec = subcommandSpec;
  }
  return parts.join(" ");
}
//@ chunk-5xgkngpb.js:3121169-3121329 placement (2.1.88 match: isKnownSubcommand, 1)
function findSubcommandSpec(arg, spec) {
  if (!arg?.subcommands?.length) return null;
  let lower = spec.toLowerCase();
  return (
    arg.subcommands.find((sub) => toArray(sub.name).some((name) => name.toLowerCase() === lower)) ?? null
  );
}
export {
  getCompoundCommandPrefixesStatic_2,
  isKnownSubcommand,
  getCompoundCommandPrefixesStatic,
  stripEnvVarPrefix,
};
