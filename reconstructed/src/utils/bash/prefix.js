/**
 * utils/bash/prefix.ts
 *
 * 基于 Fig spec 的静态命令前缀提取（处理包装命令、子命令、复合命令），用于权限规则建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/prefix.ts
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: fingerprint 5, layout 2, file-local 1, placement 3
 */
import { parseCommand, extractCommandArguments } from "./parser.js";
import { buildPrefix, MH } from "../shell/specPrefix.js";
import { countCharInString, firstLineOf } from "../stringUtils.js";
import { splitCommand } from "./commands.js";

/**
 * 参数是否为 spec 中的子命令名（大小写不敏感，支持别名数组）。
 */
//@ chunk-e6aww6q8.js:1047628-1047821 fingerprint = isKnownSubcommand (1)
function isKnownSubcommand(arg, spec) {
  if (!spec?.subcommands?.length) return !1;
  let lower = arg.toLowerCase();
  return spec.subcommands.some((sub) =>
    Array.isArray(sub.name)
      ? sub.name.some((h) => h.toLowerCase() === lower)
      : sub.name.toLowerCase() === lower,
  );
}
/**
 * 前缀提取用的常量：纯数字参数正则、环境变量赋值正则、总视为包装命令的集合（nice），以及转数组的辅助函数。
 */
//@ chunk-e6aww6q8.js:3034349-3034450 fingerprint = WRAPPER_COMMANDS (1)
var NUMERIC_ARG_RE = /^\d+$/,
  ENV_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*=/,
  ALWAYS_WRAPPER_COMMANDS = new Set(["nice"]),
  toArray = (e) => (Array.isArray(e) ? e : [e]);
//@ chunk-e6aww6q8.js:3034450-3034588 layout = isKnownSubcommand (1)
function isExactSubcommand(arg, spec) {
  if (!spec?.subcommands?.length) return !1;
  return spec.subcommands.some((sub) =>
    Array.isArray(sub.name) ? sub.name.includes(arg) : sub.name === arg,
  );
}
/**
 * 用 Fig spec 静态计算命令前缀（用于“始终允许 xxx 开头的命令”建议）：递归最多 10 层/包装 2 层；包装命令（nice 或 spec 中 isCommand 参数）递归取被包装命令前缀；前缀词数少于 MH 要求时返回 null 前缀；保留前导 VAR=val。
 */
//@ chunk-e6aww6q8.js:3034588-3035162 fingerprint = getCommandPrefixStatic (1)
async function getCommandPrefixStatic(specRegistry, command, recursionDepth = 0, wrapperDepth = 0) {
  if (wrapperDepth > 2 || recursionDepth > 10) return null;
  let parsed = await parseCommand(command);
  if (!parsed) return null;
  if (!parsed.commandNode) return { commandPrefix: null };
  let { envVars: envVars, commandNode: commandNode } = parsed,
    cmdArgs = extractCommandArguments(commandNode),
    [L, ...G] = cmdArgs;
  if (!L) return { commandPrefix: null };
  let q = await specRegistry.get(L),
    isWrapper = ALWAYS_WRAPPER_COMMANDS.has(L) || (q?.args && toArray(q.args).some((arg) => arg?.isCommand));
  if (isWrapper && G[0] && isExactSubcommand(G[0], q)) isWrapper = !1;
  let Se = isWrapper
    ? await handleWrapper(specRegistry, L, G, recursionDepth, wrapperDepth)
    : await buildPrefix(L, G, q);
  if (Se === null && recursionDepth === 0 && isWrapper) return null;
  let ke = MH(L, G[0] ?? "");
  if (ke !== void 0 && countCharInString(Se ?? "", " ") + 1 < ke) return { commandPrefix: null };
  let we = envVars.length ? `${envVars.join(" ")} ` : "";
  return { commandPrefix: Se ? we + Se : null };
}
/**
 * 处理包装命令（timeout/nohup/srun…）：按 spec 的 isCommand 参数位置或第一个非选项参数找到被包装命令，递归取其前缀并拼上包装名。
 */
//@ chunk-e6aww6q8.js:3035162-3035729 fingerprint = handleWrapper (1)
async function handleWrapper(specRegistry, wrapperName, args, s, h) {
  let y = await specRegistry.get(wrapperName);
  if (y?.args) {
    let commandArgIndex = toArray(y.args).findIndex((arg) => arg?.isCommand);
    if (commandArgIndex !== -1) {
      let parts = [wrapperName];
      for (let q = 0; q < args.length && q <= commandArgIndex; q++)
        if (q === commandArgIndex) {
          let Z = await getCommandPrefixStatic(specRegistry, args.slice(q).join(" "), s + 1, h + 1);
          if (Z?.commandPrefix) return (parts.push(...Z.commandPrefix.split(" ")), parts.join(" "));
          break;
        } else if (args[q] && !args[q].startsWith("-") && !ENV_ASSIGN_RE.test(args[q])) parts.push(args[q]);
    }
  }
  let wrapped = args.find(
    (arg) => !arg.startsWith("-") && !NUMERIC_ARG_RE.test(arg) && !ENV_ASSIGN_RE.test(arg),
  );
  if (!wrapped) return wrapperName;
  let w = await getCommandPrefixStatic(
    specRegistry,
    args.slice(args.indexOf(wrapped)).join(" "),
    s + 1,
    h + 1,
  );
  return !w?.commandPrefix ? null : `${wrapperName} ${w.commandPrefix}`;
}
/**
 * 复合命令的前缀：用 splitCommand 拆子命令，逐个求前缀（可用回调排除），按首词分组后取最长公共前缀。
 */
//@ chunk-e6aww6q8.js:3035729-3036137 fingerprint = getCompoundCommandPrefixesStatic (1)
async function getCompoundCommandPrefixesStatic(e, n, r) {
  let subcommands = splitCommand(n);
  if (subcommands.length <= 1) {
    let w = await getCommandPrefixStatic(e, n);
    return w?.commandPrefix ? [w.commandPrefix] : [];
  }
  let h = [];
  for (let subcmd of subcommands) {
    let trimmed = subcmd.trim();
    if (r?.(trimmed)) continue;
    let G = await getCommandPrefixStatic(e, trimmed);
    if (G?.commandPrefix) h.push(G.commandPrefix);
  }
  if (h.length === 0) return [];
  let groups = new Map();
  for (let prefix of h) {
    let L = firstLineOf(prefix, " "),
      group = groups.get(L);
    if (group) group.push(prefix);
    else groups.set(L, [prefix]);
  }
  let S = [];
  for (let [, w] of groups) S.push(longestCommonPrefix(w));
  return S;
}
/**
 * 按空格分词求多个字符串的最长公共前缀（至少保留首词）。
 */
//@ chunk-e6aww6q8.js:3036137-3036378 file-local
function longestCommonPrefix(strings) {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];
  let words = strings[0].split(" "),
    commonWords = words.length;
  for (let h = 1; h < strings.length; h++) {
    let otherWords = strings[h].split(" "),
      shared = 0;
    while (shared < commonWords && shared < otherWords.length && words[shared] === otherWords[shared])
      shared++;
    commonWords = shared;
  }
  return words.slice(0, Math.max(1, commonWords)).join(" ");
}
/**
 * 复合命令逐子命令求前缀，去掉命令自带的 VAR=val，再按 spec 逐层扩展子命令，返回去重后的前缀列表。
 */
//@ chunk-e6aww6q8.js:3036378-3036577 layout = getCompoundCommandPrefixesStatic (1)
async function getCompoundCommandPrefixesStatic_2(command, excludeSubcommand) {
  let r = new Set();
  for (let s of splitCommand(excludeSubcommand)) {
    let trimmed = s.trim(),
      y = await getCommandPrefixStatic(command, trimmed);
    if (!y?.commandPrefix) continue;
    let S = await stripEnvVarPrefix(trimmed, y.commandPrefix),
      w = await extendPrefixBySpec(command, S);
    if (w) r.add(w);
  }
  return [...r];
}
//@ chunk-e6aww6q8.js:3036577-3036727 placement
async function stripEnvVarPrefix(e, n) {
  let r = await parseCommand(e);
  if (r?.envVars.length) {
    let s = `${r.envVars.join(" ")} `;
    if (n.startsWith(s)) return n.slice(s.length);
  }
  return n;
}
//@ chunk-e6aww6q8.js:3036727-3037078 placement
async function extendPrefixBySpec(e, n) {
  let filtered = n.split(" ").filter(Boolean);
  if (filtered.length <= 1) return n;
  let s = [filtered[0]],
    h = await e.get(filtered[0]);
  for (let y = 1; y < filtered.length; y++) {
    let S = filtered[y];
    if (S.startsWith("-")) break;
    if (h?.args && toArray(h.args).some((L) => L?.isCommand)) {
      if (NUMERIC_ARG_RE.test(S)) continue;
      (s.push(S), (h = await e.get(S)));
      continue;
    }
    let w = findSubcommandSpec(h, S);
    if (!w) break;
    (s.push(S), (h = w));
  }
  return s.join(" ");
}
//@ chunk-e6aww6q8.js:3037078-3037238 placement = isKnownSubcommand (1)
function findSubcommandSpec(arg, spec) {
  if (!arg?.subcommands?.length) return null;
  let lower = spec.toLowerCase();
  return arg.subcommands.find((sub) => toArray(sub.name).some((h) => h.toLowerCase() === lower)) ?? null;
}

export {
  getCompoundCommandPrefixesStatic,
  stripEnvVarPrefix,
  isKnownSubcommand,
  getCompoundCommandPrefixesStatic_2,
};
