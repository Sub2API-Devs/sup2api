/**
 * utils/shell/specPrefix.ts
 *
 * 依据 Fig 命令 spec 计算权限规则建议用的命令前缀（DEPTH_RULES、子命令/参数形状推断）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/specPrefix.ts
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: fingerprint 4, placement 2, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isKnownSubcommand } from "../bash/prefix.js";
import { getOwn } from "../objectSafety.js";

//@ chunk-5xgkngpb.js:1042613-1042775 fingerprint (2.1.88 match: DEPTH_RULES, 0.891)
var URL_PROTOCOL_PREFIXES = ["http://", "https://", "ftp://"];
var DEPTH_RULES = {
  rg: 2,
  "pre-commit": 2,
  gcloud: 4,
  "gcloud compute": 6,
  "gcloud beta": 6,
  aws: 4,
  az: 4,
  kubectl: 3,
  docker: 3,
  dotnet: 3,
  "git push": 2,
};
//@ chunk-5xgkngpb.js:1042775-1042799 placement
function noAdditionalDepthRule(command, subcommand) {
  return;
}
//@ chunk-5xgkngpb.js:1042799-1042834 placement
var toArray_3 = (val) => (Array.isArray(val) ? val : [val]);
//@ chunk-5xgkngpb.js:1043027-1043235 sole-consumer (2.1.88 match: isKnownSubcommand, 1)
/**
 * 按命令规格判断某选项是否带参数：规格里有该选项时看其 args；规格有子命令且下一个词不是已知子命令时也视为带参数。
 */
function optionTakesArg(arg, nextArg, spec) {
  if (spec?.options) {
    let found = spec.options.find((sub) =>
      Array.isArray(sub.name) ? sub.name.includes(arg) : sub.name === arg,
    );
    if (found) return !!found.args;
  }
  if (spec?.subcommands?.length && nextArg && !nextArg.startsWith("-"))
    return !isKnownSubcommand(nextArg, spec);
  return false;
}
//@ chunk-5xgkngpb.js:1043235-1043425 sole-consumer (2.1.88 match: isKnownSubcommand, 1)
/**
 * 按命令规格跳过选项（及其参数），返回第一个子命令词；规格没有子命令时返回第一个非选项词。用于提取命令前缀。
 */
function findFirstSubcommand(arg, spec) {
  for (let idx = 0; idx < arg.length; idx++) {
    let token = arg[idx];
    if (!token) continue;
    if (token.startsWith("-")) {
      if (optionTakesArg(token, arg[idx + 1], spec)) idx++;
      continue;
    }
    if (!spec?.subcommands?.length) return token;
    if (isKnownSubcommand(token, spec)) return token;
  }
  return;
}
//@ chunk-5xgkngpb.js:1043425-1043973 fingerprint (2.1.88 match: buildPrefix, 1)
/**
 * 按 Fig spec 生成命令前缀（如 `git push`、`gcloud compute …`）：跳过 flag（带 isCommand/isModule 参数的保留），遇路径/URL 停止，深度由 calculateDepth 决定；用于权限规则建议。
 */
async function buildPrefix(command, args, spec) {
  let maxDepth = await calculateDepth(command, args, spec);
  let parts = [command];
  let hasSubcommands = !!spec?.subcommands?.length;
  let foundSubcommand = false;
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg || parts.length >= maxDepth) break;
    if (arg.startsWith("-")) {
      if (arg === "-c" && ["python", "python3"].includes(command.toLowerCase())) break;
      if (spec?.options) {
        let option = spec.options.find((opt) =>
          Array.isArray(opt.name) ? opt.name.includes(arg) : opt.name === arg,
        );
        if (
          option?.args &&
          toArray_3(option.args).some((optionArg) => optionArg?.isCommand || optionArg?.isModule)
        ) {
          parts.push(arg);
          continue;
        }
      }
      if (hasSubcommands && !foundSubcommand) {
        if (optionTakesArg(arg, args[i + 1], spec)) i++;
        continue;
      }
      break;
    }
    if (await shouldStopAtArg(arg, args.slice(0, i), spec)) break;
    if (hasSubcommands && !foundSubcommand) foundSubcommand = isKnownSubcommand(arg, spec);
    parts.push(arg);
  }
  return parts.join(" ");
}
//@ chunk-5xgkngpb.js:1043973-1045027 fingerprint (2.1.88 match: calculateDepth, 1)
/**
 * 计算前缀深度：DEPTH_RULES 表（rg 2、gcloud 4、kubectl 3…）优先，否则按 spec 的子命令/参数形状推断（默认 2）。
 */
async function calculateDepth(command, args, spec) {
  let firstSubcommand = findFirstSubcommand(args, spec);
  let commandLower = command.toLowerCase();
  let key = firstSubcommand ? `${commandLower} ${firstSubcommand.toLowerCase()}` : commandLower;
  let depthRule =
    getOwn(DEPTH_RULES, key) ??
    noAdditionalDepthRule(command, firstSubcommand ?? "") ??
    getOwn(DEPTH_RULES, commandLower);
  if (depthRule !== undefined) return depthRule;
  if (!spec) return 2;
  if (spec.options && args.some((arg) => arg?.startsWith("-")))
    for (let arg of args) {
      if (!arg?.startsWith("-")) continue;
      let option = spec.options.find((opt) =>
        Array.isArray(opt.name) ? opt.name.includes(arg) : opt.name === arg,
      );
      if (option?.args && toArray_3(option.args).some((arg) => arg?.isCommand || arg?.isModule)) return 3;
    }
  if (firstSubcommand && spec.subcommands?.length) {
    let firstSubLower = firstSubcommand.toLowerCase();
    let subcommand = spec.subcommands.find((sub) =>
      Array.isArray(sub.name)
        ? sub.name.some((n) => n.toLowerCase() === firstSubLower)
        : sub.name.toLowerCase() === firstSubLower,
    );
    if (subcommand) {
      if (subcommand.args) {
        let subArgs = toArray_3(subcommand.args);
        if (subArgs.some((arg) => arg?.isCommand)) return 3;
        if (subArgs.some((arg) => arg?.isVariadic)) return 2;
      }
      if (subcommand.subcommands?.length) return 4;
      if (!subcommand.args) return 2;
      return 3;
    }
  }
  if (spec.args) {
    let argsArray = toArray_3(spec.args);
    if (argsArray.some((arg) => arg?.isCommand))
      return !Array.isArray(spec.args) && spec.args.isCommand
        ? 2
        : Math.min(2 + argsArray.findIndex((arg) => arg?.isCommand), 3);
    if (!spec.subcommands?.length) {
      if (argsArray.some((arg) => arg?.isVariadic)) return 1;
      if (argsArray[0] && !argsArray[0].isOptional) return 2;
    }
  }
  return spec.args && toArray_3(spec.args).some((arg) => arg?.isDangerous) ? 3 : 2;
}
//@ chunk-5xgkngpb.js:1045027-1045432 fingerprint (2.1.88 match: shouldStopAtArg, 1)
/**
 * 参数是否为前缀终点：flag、含 '/' 或像文件名（有扩展名）或 URL 时停止；`-m 模块` 例外。
 */
async function shouldStopAtArg(arg, args, spec) {
  if (arg.startsWith("-")) return true;
  let dotIndex = arg.lastIndexOf(".");
  let hasExtension = dotIndex > 0 && dotIndex < arg.length - 1 && !arg.substring(dotIndex + 1).includes(":");
  let hasFile = arg.includes("/") || hasExtension;
  let hasUrl = URL_PROTOCOL_PREFIXES.some((proto) => arg.startsWith(proto));
  if (!hasFile && !hasUrl) return false;
  if (spec?.options && args.length > 0 && args[args.length - 1] === "-m") {
    let option = spec.options.find((opt) =>
      Array.isArray(opt.name) ? opt.name.includes("-m") : opt.name === "-m",
    );
    if (option?.args && toArray_3(option.args).some((arg) => arg?.isModule)) return false;
  }
  return true;
}
export { buildPrefix, noAdditionalDepthRule, DEPTH_RULES };
