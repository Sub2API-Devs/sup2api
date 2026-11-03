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
import { isAbsolute, resolve as resolve_2 } from "path";
import { homedir } from "os";
import { stat, realpath } from "fs/promises";
import { containsAnyPlaceholder } from "../../utils/bash/ast.js";
import { getPlatform } from "../../utils/platform.js";
import { validatePath } from "../../utils/permissions/pathValidation.js";
import {
  pathInAllowedWorkingPath,
  denyRuleMatchingAnywhere,
  readDenyRuleMayMatchBeneath,
} from "../../utils/permissions/filesystem.js";
import { count } from "../../utils/collections.js";
import { isNormalizedCdCommand, isPlainPathToken } from "./bashPermissions.js";
import {
  stripWrappersFromArgvForPaths,
  checkPathConstraints,
  getReadPathsForAstCommand,
} from "./pathValidation.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { getDirectoryChangeBuiltin } from "../../utils/powershell/parser.js";
import { spawnEnvKeysForSession, sessionEnvVarNameSet } from "../../utils/shell/shellEnvSnapshot.js";
import { getFsImplementation, safeResolvePath } from "../../utils/fsOperations.js";
import { BashTool } from "./BashTool.js";
import { containsVulnerableUncPath } from "../../utils/shell/readOnlyCommandValidation.js";
import { isSentinelInode } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:1190605-1191075 placement
/**
 * 对单纯的 "cd 路径" 命令（无环境变量/重定向、显式相对或绝对路径、不含 .. 或通配）校验路径在允许的工作目录内，返回解析后的路径或 null。
 */
function resolveSimpleCdTarget(e, cwd, r) {
  if (!e) return null;
  if (e.envVars.length > 0 || e.redirects.length > 0) return null;
  if (e.argv.length !== 2 || e.argv[0] !== "cd") return null;
  let normalized = e.argv[1];
  if (containsAnyPlaceholder(normalized)) return null;
  if (normalized.startsWith("-")) return null;
  if (!isExplicitRelativeOrAbsolutePath(normalized)) return null;
  if (!isAbsolute(normalized) && normalized.split(/[\\/]/).includes("..")) return null;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(normalized, cwd)) return null;
  if (/[*?[\]]/.test(normalized)) return null;
  let { allowed, resolvedPath } = validatePath(normalized, cwd, r, "read");
  if (!allowed) return null;
  if (!pathInAllowedWorkingPath(resolvedPath, r, [resolvedPath])) return null;
  return resolvedPath;
}
//@ chunk-e6aww6q8.js:1191075-1191490 placement
/**
 * 判断命令中的 cd 是否只切换到当前目录（只有一个 cd、无环境变量与重定向、目标与当前目录文件身份相同）。
 */
async function isCdToCurrentDir(astCommandsByIdx, subcommands, filePath) {
  let fileIdentity = await getFileIdentity_4(filePath);
  if (fileIdentity === null) return false;
  if (count(subcommands, (S) => isNormalizedCdCommand(S)) > 1) return false;
  let y = false;
  for (let idx = 0; idx < subcommands.length; idx++) {
    if (!isNormalizedCdCommand(subcommands[idx])) continue;
    y = true;
    let w = astCommandsByIdx[idx];
    if (!w) return false;
    if (w.envVars.length > 0 || w.redirects.length > 0) return false;
    if (w.argv.length !== 2 || w.argv[0] !== "cd") return false;
    if (containsAnyPlaceholder(w.argv[1])) return false;
    let L = getPlatform() === "windows" ? parseCdTarget(subcommands[idx]) : w.argv[1];
    if (L === null) return false;
    if (!(await isSameDirPath(L, filePath, fileIdentity))) return false;
  }
  return y;
}
//@ chunk-e6aww6q8.js:1191490-1191728 placement
/**
 * 按文本判断命令中的 cd 是否只切换到当前目录（只允许一个 cd）。
 */
async function isCdTextToCurrentDir(e, filePath) {
  let fileIdentity = await getFileIdentity_4(filePath);
  if (fileIdentity === null) return false;
  if (count(e, (y) => isNormalizedCdCommand(y.trim())) > 1) return false;
  let h = false;
  for (let y of e) {
    let trimmed = y.trim();
    if (!isNormalizedCdCommand(trimmed)) continue;
    h = true;
    let cdTarget = parseCdTarget(trimmed);
    if (cdTarget === null) return false;
    if (!(await isSameDirPath(cdTarget, filePath, fileIdentity))) return false;
  }
  return h;
}
//@ chunk-e6aww6q8.js:1191728-1192212 placement
/**
 * 从 "cd 目标" 文本中解析目标路径（支持完整引号），含空白、引号、反斜杠、shell 元字符或控制字符时返回 null。
 */
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
//@ chunk-e6aww6q8.js:1192212-1193672 placement
/**
 * 检查 cd/pushd/popd 命令：目标目录的读权限与拒绝规则。
 */
function checkCdCommand(commands, cwd, toolPermissionContext) {
  let s = new Set([cwd]);
  let h = cwd;
  let y;
  let S = [];
  let w = false;
  for (let L of commands) {
    let G = stripWrappersFromArgvForPaths(L.argv);
    let replaced = G[0]?.replace(/^.*[\\/]/, "");
    if (replaced === "cd" || replaced === "chdir" || replaced === "pushd" || replaced === "popd") {
      let filtered = G.slice(1).filter((Ae) => Ae !== "--" && (Ae === "-" || !Ae.startsWith("-")));
      let Se =
        filtered.length === 1
          ? filtered[0]
          : filtered.length === 0 && (replaced === "cd" || replaced === "chdir")
            ? "~"
            : undefined;
      let filtered_2 = G.slice(1).filter(
        (Ae) => Ae !== "--" && Ae !== "-" && Ae.startsWith("-") && !/^-[PLe@]+$/.test(Ae),
      );
      if ((replaced === "pushd" || replaced === "popd") && filtered_2.length === 1 && filtered_2[0] === "-n")
        continue;
      let we =
        replaced !== "popd" &&
        filtered_2.length === 0 &&
        Se !== undefined &&
        Se !== "-" &&
        !/^[+-]\d+$/.test(Se) &&
        !containsAnyPlaceholder(Se) &&
        !/[*?[\]$`]/.test(Se) &&
        !(Se.startsWith("~") && Se !== "~" && !Se.startsWith("~/")) &&
        !L.envVars.some((envVar) => containsAnyPlaceholder(envVar.value));
      let Ee =
        filtered_2.length === 0 &&
        (replaced === "popd"
          ? filtered.length === 0 && S.length > 0
            ? {
                dir: S.pop(),
              }
            : undefined
          : Se === "-" && y !== undefined
            ? {
                dir: y,
              }
            : undefined);
      if (Ee) [y, h] = [h, Ee.dir];
      else if (we) {
        if (replaced === "pushd") S.push(h);
        y = h;
        s.add(resolve_2(cwd, expandTildeWithHome(Se)));
        if (h !== undefined) {
          h = resolve_2(h, expandTildeWithHome(Se));
          s.add(h);
        }
      } else {
        if (replaced === "pushd") S.push(h);
        w = true;
        y = h;
        h = undefined;
      }
      if (h === undefined && (Ee || we)) w = true;
      continue;
    }
    for (let Z of s) {
      let Se = checkPathConstraints(
        {
          command: L.text,
        },
        Z,
        toolPermissionContext,
        false,
        L.redirects,
        [L],
      );
      if (Se.behavior === "deny" && Se.decisionReason?.type === "rule") return Se;
    }
    if (w)
      for (let Z of getReadPathsForAstCommand(L)) {
        let Se = denyRuleMatchingAnywhere(Z, toolPermissionContext, "read");
        if (Se !== null)
          return {
            behavior: "deny",
            message: `${G[0]} reads '${Z}' after a cd whose target cannot be resolved, and a deny rule (${Se.ruleValue.ruleContent ?? Se.ruleValue.toolName}) names that file under a directory it may run in`,
            decisionReason: {
              type: "rule",
              rule: Se,
            },
          };
      }
  }
  return null;
}
//@ chunk-e6aww6q8.js:1193672-1194665 placement
/**
 * 判断开头的 cd/pushd 是否可能让后续命令读到规则外的内容（CDPATH、目标或其下的拒绝规则、后续参数中的相对路径相对两个目录都需允许）；返回 true 表示需谨慎处理。
 */
function cdMayChangeReadScope(commands, cwd, context, toolUseContext) {
  if (getPlatform() === "windows") return true;
  let [h, ...y] = commands.map((command) => ({
    cmd: command,
    argv: stripWrappersFromArgvForPaths(command.argv),
  }));
  let S = h && getDirectoryChangeBuiltin(h.argv);
  if (h === undefined || S === undefined || S === "popd") return true;
  let filtered = h.argv.slice(1).filter((arg) => arg !== "--");
  let target = filtered[0];
  if (
    h.cmd.envVars.length > 0 ||
    filtered.length !== 1 ||
    target === undefined ||
    containsAnyPlaceholder(target) ||
    /^[-+~]|[$`*?[\]{}\\\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)/.test(target)
  )
    return true;
  let G = !isAbsolute(target) && target !== "." && !target.startsWith("./");
  if (G && spawnEnvKeysForSession(sessionEnvVarNameSet(toolUseContext))?.has("CDPATH") !== false) return true;
  let resolvedTarget = resolve_2(cwd, target);
  if (!pathInAllowedWorkingPath(resolvedTarget, context, [resolvedTarget])) return true;
  try {
    if (!getFsImplementation().statSync(resolvedTarget).isDirectory()) return true;
  } catch {
    return true;
  }
  let Z = (searchRoot) => readDenyRuleMayMatchBeneath(searchRoot, context) !== null;
  if (Z(cwd) || Z(resolvedTarget) || (G && Z(resolve_2(homedir(), target)))) return true;
  for (let { cmd, argv } of y) {
    if (
      cmd.hasUnquotedGlob ||
      cmd.envVars.length > 0 ||
      getDirectoryChangeBuiltin(argv) !== undefined ||
      argv.some((arg) => containsAnyPlaceholder(arg) || /(^|[\\/])\.\.([\\/]|$)/.test(arg))
    )
      return true;
    for (let arg of argv.slice(1))
      for (let Ee of getArgPathCandidates(arg)) {
        if (Ee === "") continue;
        if (/[*?[\]{}\\~]/.test(Ee) || /(^|[\\/=])\.\.([\\/]|$)/.test(Ee)) return true;
        for (let Ae of [cwd, resolvedTarget])
          if (!validatePath(Ee, Ae, context, "read").allowed || Z(resolve_2(Ae, Ee))) return true;
      }
  }
  return false;
}
//@ chunk-e6aww6q8.js:1194665-1195521 placement
/**
 * 判断 "cd 目录 && 只读命令…" 是否可视为只读：cd 目标规范且允许，后续命令无环境变量、只重定向到 /dev/null、为只读命令，且其路径参数相对两个目录都被允许。
 */
function isReadOnlyAfterCd(commands, cwd, r, toolUseContext) {
  let [h, ...y] = commands;
  let S = h?.argv[1];
  if (
    getPlatform() === "windows" ||
    h === undefined ||
    S === undefined ||
    y.length === 0 ||
    h.argvSourceLiteral !== true ||
    h.text !== `cd ${S}` ||
    !isPlainPathToken(S)
  )
    return false;
  let simpleCdTarget = resolveSimpleCdTarget(h, cwd, r);
  if (simpleCdTarget === null) return false;
  let mapped = [cwd, simpleCdTarget].map((G) => safeResolvePath(getFsImplementation(), G));
  if (!mapped.every((G) => G.isCanonical)) return false;
  return y.every((G) => {
    let q = G.carveOutMayDesyncQuoteScan !== true && G.argvUnquotedGlob?.length === G.argv.length;
    return (
      G.envVars.length === 0 &&
      G.argvSourceLiteral === true &&
      G.redirects.every(
        ({ op, target, targetSourceLiteral }) =>
          targetSourceLiteral === true &&
          (op === ">&" ? /^\d+$/.test(target) : (op === ">" || op === ">>") && target === "/dev/null"),
      ) &&
      BashTool.isReadOnly(
        {
          command: G.text,
        },
        toolUseContext,
      ) &&
      G.argv.every(
        (arg, Se) =>
          getDirectoryChangeBuiltin([arg]) === undefined &&
          !/(^|[\\/])xargs$/.test(arg) &&
          !/[{}]/.test(arg) &&
          !containsAnyPlaceholder(arg) &&
          (isAbsolute(arg) || !/[*?[]/.test(arg) || (q && G.argvUnquotedGlob?.[Se] === false)) &&
          getArgPathCandidates(arg).every(
            (ke) => ke === "" || mapped.every((we) => validatePath(ke, we.resolvedPath, r, "read").allowed),
          ),
      )
    );
  });
}
//@ chunk-e6aww6q8.js:1195635-1195872 placement
function getArgPathCandidates(e) {
  let n = new Set([e]);
  if (/^-[^-]/.test(e)) for (let idx = 2; idx <= e.length; idx++) n.add(e.slice(idx));
  let r = e;
  for (;;) {
    let s = r.startsWith("@") ? r.slice(1) : r.includes("=") ? r.slice(r.indexOf("=") + 1) : r;
    n.add(s);
    if (s === r) break;
    r = s;
  }
  return [...n];
}
//@ chunk-e6aww6q8.js:1195872-1195961 placement = resolveCwdReentry (1)
/**
 * （旧版名配错）路径是否是绝对路径或以 ./ ../ . .. 开头的显式路径。
 */
function isExplicitRelativeOrAbsolutePath(normalized) {
  return (
    isAbsolute(normalized) ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized === "." ||
    normalized === ".."
  );
}
//@ chunk-e6aww6q8.js:1195961-1196457 placement
/**
 * 判断 cd 目标是否就是当前目录：拒绝选项、变量、通配、UNC 路径与越界的 ..，再比较文件身份。
 */
async function isSameDirPath(normalized, n, fileIdentity) {
  if (normalized.startsWith("-")) return false;
  if (!isExplicitRelativeOrAbsolutePath(normalized)) return false;
  if (
    normalized.includes("$") ||
    normalized.includes("`") ||
    /[*?[]/.test(normalized) ||
    (getPlatform() !== "windows" && normalized.includes("\\")) ||
    (getPlatform() === "windows" && normalized.includes("%"))
  )
    return false;
  if (containsVulnerableUncPath(normalized) || (getPlatform() === "windows" && /^[\\/]{2}/.test(normalized)))
    return false;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(normalized, n)) return false;
  {
    let y = isAbsolute(normalized);
    let S = false;
    for (let w of normalized.split(/[\\/]/)) {
      if (w === "" || w === ".") continue;
      if (w === "..") {
        if (!y || S) return false;
        continue;
      }
      S = true;
    }
  }
  let filePath = isAbsolute(normalized) ? normalized : resolve_2(n, normalized);
  let fileIdentity_2 = await getFileIdentity_4(filePath);
  if (fileIdentity_2 === null) return false;
  return fileIdentity_2 === fileIdentity;
}
//@ chunk-e6aww6q8.js:1196457-1196939 placement
/**
 * 检查 Windows 相对路径中的 .. 不会越过相对根（结合当前目录深度计算）。
 */
function staysWithinRelativeRoot(e, n) {
  let r = e;
  let s;
  let match = /^[A-Za-z]:[\\/]/.exec(e);
  if (match) {
    r = e.slice(match[0].length);
    s = 0;
  } else if (/^[\\/]/.test(e) || e.includes("\\")) return false;
  else {
    if (/^[\\/]{2}/.test(n)) return false;
    s = 0;
    for (let w of n.replace(/^[A-Za-z]:/, "").split(/[\\/]/)) {
      if (w === "" || w === ".") continue;
      s += w === ".." ? -1 : 1;
    }
  }
  let y = !match;
  let S = false;
  for (let w of r.split(/[\\/]/)) {
    if (w === "" || w === ".") continue;
    if (w === "..") {
      if (s === 0) return false;
      s -= 1;
      S = true;
      continue;
    }
    if (y && S) return false;
    if (w.includes(":") || /[ .]$/.test(w)) return false;
    s += 1;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1196939-1197312 placement = getFileIdentity (1)
async function getFileIdentity_4(filePath) {
  if (getPlatform() === "windows") {
    let parts = filePath.split(/[\\/]/);
    for (let idx = 0; idx < parts.length; idx++) {
      let h = parts[idx];
      if (h === "." || h === "..") continue;
      if (/[ .]$/.test(h)) return null;
      if (h.includes(":") && !(idx === 0 && /^[A-Za-z]:$/.test(h))) return null;
    }
    let r = await stat(filePath, {
      bigint: true,
    }).catch(() => null);
    if (r === null || isSentinelInode(r.ino)) return null;
    return `${r.dev}:${r.ino}`;
  }
  return await realpath(filePath).catch(() => null);
}
export {
  cdMayChangeReadScope,
  isReadOnlyAfterCd,
  isCdTextToCurrentDir,
  checkCdCommand,
  resolveSimpleCdTarget,
  isCdToCurrentDir,
};
