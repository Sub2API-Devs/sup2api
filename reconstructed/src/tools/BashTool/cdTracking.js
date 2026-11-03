/**
 * tools/BashTool/cdTracking.ts
 *
 * 2.1.316 新增：cd/pushd/popd 的权限检查与目录跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import { containsAnyPlaceholder } from "../../utils/bash/ast.js";
import { getPlatform } from "../../utils/platform.js";
import { validatePath } from "../../utils/permissions/pathValidation.js";
import {
  pathInAllowedWorkingPath,
  denyRuleMatchingAnywhere,
  readDenyRuleMayMatchBeneath,
} from "../../utils/permissions/filesystem.js";
import { count } from "../../utils/collections.js";
import { oT, isPlainPathToken } from "./bashPermissions.js";
import {
  stripWrappersFromArgvForPaths,
  checkPathConstraints,
  getReadPathsForAstCommand,
} from "./pathValidation.js";
import { Lu } from "../../utils/networkPaths.js";
import { getDirectoryChangeBuiltin } from "../../utils/powershell/parser.js";
import { qhe, RA } from "../../utils/shell/shellEnvSnapshot.js";
import { getFsImplementation, safeResolvePath } from "../../utils/fsOperations.js";
import { BashTool } from "./BashTool.js";
import { containsVulnerableUncPath } from "../../utils/shell/readOnlyCommandValidation.js";
import { isSentinelInode } from "../../utils/slowOperations.js";

/**
 * 对单纯的 "cd 路径" 命令（无环境变量/重定向、显式相对或绝对路径、不含 .. 或通配）校验路径在允许的工作目录内，返回解析后的路径或 null。
 */
//@ chunk-e6aww6q8.js:1190605-1191075 placement
function resolveSimpleCdTarget(e, n, r) {
  if (!e) return null;
  if (e.envVars.length > 0 || e.redirects.length > 0) return null;
  if (e.argv.length !== 2 || e.argv[0] !== "cd") return null;
  let s = e.argv[1];
  if (containsAnyPlaceholder(s)) return null;
  if (s.startsWith("-")) return null;
  if (!isExplicitRelativeOrAbsolutePath(s)) return null;
  if (!isAbsolute_20(s) && s.split(/[\\/]/).includes("..")) return null;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(s, n)) return null;
  if (/[*?[\]]/.test(s)) return null;
  let { allowed: allowed, resolvedPath: resolvedPath } = validatePath(s, n, r, "read");
  if (!allowed) return null;
  if (!pathInAllowedWorkingPath(resolvedPath, r, [resolvedPath])) return null;
  return resolvedPath;
}
/**
 * 判断命令中的 cd 是否只切换到当前目录（只有一个 cd、无环境变量与重定向、目标与当前目录文件身份相同）。
 */
//@ chunk-e6aww6q8.js:1191075-1191490 placement
async function isCdToCurrentDir(e, n, r) {
  let s = await getFileIdentity_4(r);
  if (s === null) return !1;
  if (count(n, (S) => oT(S)) > 1) return !1;
  let y = !1;
  for (let S = 0; S < n.length; S++) {
    if (!oT(n[S])) continue;
    y = !0;
    let w = e[S];
    if (!w) return !1;
    if (w.envVars.length > 0 || w.redirects.length > 0) return !1;
    if (w.argv.length !== 2 || w.argv[0] !== "cd") return !1;
    if (containsAnyPlaceholder(w.argv[1])) return !1;
    let L = getPlatform() === "windows" ? parseCdTarget(n[S]) : w.argv[1];
    if (L === null) return !1;
    if (!(await isSameDirPath(L, r, s))) return !1;
  }
  return y;
}
/**
 * 按文本判断命令中的 cd 是否只切换到当前目录（只允许一个 cd）。
 */
//@ chunk-e6aww6q8.js:1191490-1191728 placement
async function isCdTextToCurrentDir(e, n) {
  let r = await getFileIdentity_4(n);
  if (r === null) return !1;
  if (count(e, (y) => oT(y.trim())) > 1) return !1;
  let h = !1;
  for (let y of e) {
    let trimmed = y.trim();
    if (!oT(trimmed)) continue;
    h = !0;
    let w = parseCdTarget(trimmed);
    if (w === null) return !1;
    if (!(await isSameDirPath(w, n, r))) return !1;
  }
  return h;
}
/**
 * 从 "cd 目标" 文本中解析目标路径（支持完整引号），含空白、引号、反斜杠、shell 元字符或控制字符时返回 null。
 */
//@ chunk-e6aww6q8.js:1191728-1192212 placement
function parseCdTarget(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("cd ")) return null;
  let trimmed_2 = trimmed.slice(3).trim();
  if (trimmed_2.length === 0) return null;
  let s = trimmed_2[0];
  if (s === '"' || s === "'") {
    if (trimmed_2.length < 2 || trimmed_2.at(-1) !== s) return null;
    let sliced = trimmed_2.slice(1, -1);
    if (sliced.includes(s)) return null;
    if (s === '"' && sliced.includes("\\") && getPlatform() !== "windows") return null;
    if (/[\x00-\x1f\x7f]/.test(sliced)) return null;
    return sliced;
  }
  if (/\s/.test(trimmed_2)) return null;
  if (/['"]/.test(trimmed_2)) return null;
  if (trimmed_2.includes("\\")) return null;
  if (/[<>|&;(){}]/.test(trimmed_2)) return null;
  return trimmed_2;
}
/**
 * 检查 cd/pushd/popd 命令：目标目录的读权限与拒绝规则。
 */
//@ chunk-e6aww6q8.js:1192212-1193672 placement
function checkCdCommand(e, n, r) {
  let s = new Set([n]),
    h = n,
    y,
    S = [],
    w = !1;
  for (let L of e) {
    let G = stripWrappersFromArgvForPaths(L.argv),
      q = G[0]?.replace(/^.*[\\/]/, "");
    if (q === "cd" || q === "chdir" || q === "pushd" || q === "popd") {
      let filtered = G.slice(1).filter((Ae) => Ae !== "--" && (Ae === "-" || !Ae.startsWith("-"))),
        Se =
          filtered.length === 1
            ? filtered[0]
            : filtered.length === 0 && (q === "cd" || q === "chdir")
              ? "~"
              : void 0,
        filtered_2 = G.slice(1).filter(
          (Ae) => Ae !== "--" && Ae !== "-" && Ae.startsWith("-") && !/^-[PLe@]+$/.test(Ae),
        );
      if ((q === "pushd" || q === "popd") && filtered_2.length === 1 && filtered_2[0] === "-n") continue;
      let we =
          q !== "popd" &&
          filtered_2.length === 0 &&
          Se !== void 0 &&
          Se !== "-" &&
          !/^[+-]\d+$/.test(Se) &&
          !containsAnyPlaceholder(Se) &&
          !/[*?[\]$`]/.test(Se) &&
          !(Se.startsWith("~") && Se !== "~" && !Se.startsWith("~/")) &&
          !L.envVars.some((envVar) => containsAnyPlaceholder(envVar.value)),
        Ee =
          filtered_2.length === 0 &&
          (q === "popd"
            ? filtered.length === 0 && S.length > 0
              ? { dir: S.pop() }
              : void 0
            : Se === "-" && y !== void 0
              ? { dir: y }
              : void 0);
      if (Ee) [y, h] = [h, Ee.dir];
      else if (we) {
        if (q === "pushd") S.push(h);
        if (((y = h), s.add(resolve_17(n, Lu(Se))), h !== void 0)) ((h = resolve_17(h, Lu(Se))), s.add(h));
      } else {
        if (q === "pushd") S.push(h);
        ((w = !0), (y = h), (h = void 0));
      }
      if (h === void 0 && (Ee || we)) w = !0;
      continue;
    }
    for (let Z of s) {
      let Se = checkPathConstraints({ command: L.text }, Z, r, !1, L.redirects, [L]);
      if (Se.behavior === "deny" && Se.decisionReason?.type === "rule") return Se;
    }
    if (w)
      for (let Z of getReadPathsForAstCommand(L)) {
        let Se = denyRuleMatchingAnywhere(Z, r, "read");
        if (Se !== null)
          return {
            behavior: "deny",
            message: `${G[0]} reads '${Z}' after a cd whose target cannot be resolved, and a deny rule (${Se.ruleValue.ruleContent ?? Se.ruleValue.toolName}) names that file under a directory it may run in`,
            decisionReason: { type: "rule", rule: Se },
          };
      }
  }
  return null;
}
/**
 * 判断开头的 cd/pushd 是否可能让后续命令读到规则外的内容（CDPATH、目标或其下的拒绝规则、后续参数中的相对路径相对两个目录都需允许）；返回 true 表示需谨慎处理。
 */
//@ chunk-e6aww6q8.js:1193672-1194665 placement
function cdMayChangeReadScope(commands, cwd, context, s) {
  if (getPlatform() === "windows") return !0;
  let [h, ...y] = commands.map((Se) => ({ cmd: Se, argv: stripWrappersFromArgvForPaths(Se.argv) })),
    S = h && getDirectoryChangeBuiltin(h.argv);
  if (h === void 0 || S === void 0 || S === "popd") return !0;
  let filtered = h.argv.slice(1).filter((Se) => Se !== "--"),
    target = filtered[0];
  if (
    h.cmd.envVars.length > 0 ||
    filtered.length !== 1 ||
    target === void 0 ||
    containsAnyPlaceholder(target) ||
    /^[-+~]|[$`*?[\]{}\\\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)/.test(target)
  )
    return !0;
  let G = !isAbsolute_20(target) && target !== "." && !target.startsWith("./");
  if (G && qhe(RA(s))?.has("CDPATH") !== !1) return !0;
  let resolvedTarget = resolve_17(cwd, target);
  if (!pathInAllowedWorkingPath(resolvedTarget, context, [resolvedTarget])) return !0;
  try {
    if (!getFsImplementation().statSync(resolvedTarget).isDirectory()) return !0;
  } catch {
    return !0;
  }
  let Z = (Se) => readDenyRuleMayMatchBeneath(Se, context) !== null;
  if (Z(cwd) || Z(resolvedTarget) || (G && Z(resolve_17(homedir_3(), target)))) return !0;
  for (let { cmd: cmd, argv: argv } of y) {
    if (
      cmd.hasUnquotedGlob ||
      cmd.envVars.length > 0 ||
      getDirectoryChangeBuiltin(argv) !== void 0 ||
      argv.some((we) => containsAnyPlaceholder(we) || /(^|[\\/])\.\.([\\/]|$)/.test(we))
    )
      return !0;
    for (let we of argv.slice(1))
      for (let Ee of getArgPathCandidates(we)) {
        if (Ee === "") continue;
        if (/[*?[\]{}\\~]/.test(Ee) || /(^|[\\/=])\.\.([\\/]|$)/.test(Ee)) return !0;
        for (let Ae of [cwd, resolvedTarget])
          if (!validatePath(Ee, Ae, context, "read").allowed || Z(resolve_17(Ae, Ee))) return !0;
      }
  }
  return !1;
}
/**
 * 判断 "cd 目录 && 只读命令…" 是否可视为只读：cd 目标规范且允许，后续命令无环境变量、只重定向到 /dev/null、为只读命令，且其路径参数相对两个目录都被允许。
 */
//@ chunk-e6aww6q8.js:1194665-1195521 placement
function isReadOnlyAfterCd(e, n, r, s) {
  let [h, ...y] = e,
    S = h?.argv[1];
  if (
    getPlatform() === "windows" ||
    h === void 0 ||
    S === void 0 ||
    y.length === 0 ||
    h.argvSourceLiteral !== !0 ||
    h.text !== `cd ${S}` ||
    !isPlainPathToken(S)
  )
    return !1;
  let w = resolveSimpleCdTarget(h, n, r);
  if (w === null) return !1;
  let mapped = [n, w].map((G) => safeResolvePath(getFsImplementation(), G));
  if (!mapped.every((G) => G.isCanonical)) return !1;
  return y.every((G) => {
    let q = G.carveOutMayDesyncQuoteScan !== !0 && G.argvUnquotedGlob?.length === G.argv.length;
    return (
      G.envVars.length === 0 &&
      G.argvSourceLiteral === !0 &&
      G.redirects.every(
        ({ op: op, target: target, targetSourceLiteral: targetSourceLiteral }) =>
          targetSourceLiteral === !0 &&
          (op === ">&" ? /^\d+$/.test(target) : (op === ">" || op === ">>") && target === "/dev/null"),
      ) &&
      BashTool.isReadOnly({ command: G.text }, s) &&
      G.argv.every(
        (Z, Se) =>
          getDirectoryChangeBuiltin([Z]) === void 0 &&
          !/(^|[\\/])xargs$/.test(Z) &&
          !/[{}]/.test(Z) &&
          !containsAnyPlaceholder(Z) &&
          (isAbsolute_20(Z) || !/[*?[]/.test(Z) || (q && G.argvUnquotedGlob?.[Se] === !1)) &&
          getArgPathCandidates(Z).every(
            (ke) => ke === "" || mapped.every((we) => validatePath(ke, we.resolvedPath, r, "read").allowed),
          ),
      )
    );
  });
}
//@ chunk-e6aww6q8.js:1195635-1195872 placement
function getArgPathCandidates(e) {
  let n = new Set([e]);
  if (/^-[^-]/.test(e)) for (let s = 2; s <= e.length; s++) n.add(e.slice(s));
  let r = e;
  for (;;) {
    let s = r.startsWith("@") ? r.slice(1) : r.includes("=") ? r.slice(r.indexOf("=") + 1) : r;
    if ((n.add(s), s === r)) break;
    r = s;
  }
  return [...n];
}
/**
 * （旧版名配错）路径是否是绝对路径或以 ./ ../ . .. 开头的显式路径。
 */
//@ chunk-e6aww6q8.js:1195872-1195961 placement = resolveCwdReentry (1)
function isExplicitRelativeOrAbsolutePath(normalized) {
  return (
    isAbsolute_20(normalized) ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized === "." ||
    normalized === ".."
  );
}
/**
 * 判断 cd 目标是否就是当前目录：拒绝选项、变量、通配、UNC 路径与越界的 ..，再比较文件身份。
 */
//@ chunk-e6aww6q8.js:1195961-1196457 placement
async function isSameDirPath(e, n, r) {
  if (e.startsWith("-")) return !1;
  if (!isExplicitRelativeOrAbsolutePath(e)) return !1;
  if (
    e.includes("$") ||
    e.includes("`") ||
    /[*?[]/.test(e) ||
    (getPlatform() !== "windows" && e.includes("\\")) ||
    (getPlatform() === "windows" && e.includes("%"))
  )
    return !1;
  if (containsVulnerableUncPath(e) || (getPlatform() === "windows" && /^[\\/]{2}/.test(e))) return !1;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(e, n)) return !1;
  {
    let y = isAbsolute_20(e),
      S = !1;
    for (let w of e.split(/[\\/]/)) {
      if (w === "" || w === ".") continue;
      if (w === "..") {
        if (!y || S) return !1;
        continue;
      }
      S = !0;
    }
  }
  let s = isAbsolute_20(e) ? e : resolve_17(n, e),
    h = await getFileIdentity_4(s);
  if (h === null) return !1;
  return h === r;
}
/**
 * 检查 Windows 相对路径中的 .. 不会越过相对根（结合当前目录深度计算）。
 */
//@ chunk-e6aww6q8.js:1196457-1196939 placement
function staysWithinRelativeRoot(e, n) {
  let r = e,
    s,
    match = /^[A-Za-z]:[\\/]/.exec(e);
  if (match) ((r = e.slice(match[0].length)), (s = 0));
  else if (/^[\\/]/.test(e) || e.includes("\\")) return !1;
  else {
    if (/^[\\/]{2}/.test(n)) return !1;
    s = 0;
    for (let w of n.replace(/^[A-Za-z]:/, "").split(/[\\/]/)) {
      if (w === "" || w === ".") continue;
      s += w === ".." ? -1 : 1;
    }
  }
  let y = !match,
    S = !1;
  for (let w of r.split(/[\\/]/)) {
    if (w === "" || w === ".") continue;
    if (w === "..") {
      if (s === 0) return !1;
      ((s -= 1), (S = !0));
      continue;
    }
    if (y && S) return !1;
    if (w.includes(":") || /[ .]$/.test(w)) return !1;
    s += 1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:1196939-1197312 placement = getFileIdentity (1)
async function getFileIdentity_4(filePath) {
  if (getPlatform() === "windows") {
    let parts = filePath.split(/[\\/]/);
    for (let s = 0; s < parts.length; s++) {
      let h = parts[s];
      if (h === "." || h === "..") continue;
      if (/[ .]$/.test(h)) return null;
      if (h.includes(":") && !(s === 0 && /^[A-Za-z]:$/.test(h))) return null;
    }
    let r = await stat_10(filePath, { bigint: !0 }).catch(() => null);
    if (r === null || isSentinelInode(r.ino)) return null;
    return `${r.dev}:${r.ino}`;
  }
  return await realpath_17(filePath).catch(() => null);
}

export {
  cdMayChangeReadScope,
  isReadOnlyAfterCd,
  isCdTextToCurrentDir,
  checkCdCommand,
  resolveSimpleCdTarget,
  isCdToCurrentDir,
};
