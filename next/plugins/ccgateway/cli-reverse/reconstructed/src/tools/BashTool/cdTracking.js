/**
 * tools/BashTool/cdTracking.ts
 *
 * 2.1.316 新增：cd/pushd/popd 的权限检查与目录跟踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../utils/collections.js";
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

//@ chunk-5xgkngpb.js:1186719-1187189 placement
/**
 * 对单纯的 "cd 路径" 命令（无环境变量/重定向、显式相对或绝对路径、不含 .. 或通配）校验路径在允许的工作目录内，返回解析后的路径或 null。
 */
function resolveSimpleCdTarget(command, root, permissionContext) {
  if (!command) return null;
  if (command.envVars.length > 0 || command.redirects.length > 0) return null;
  if (command.argv.length !== 2 || command.argv[0] !== "cd") return null;
  let targetPath = command.argv[1];
  if (containsAnyPlaceholder(targetPath)) return null;
  if (targetPath.startsWith("-")) return null;
  if (!isExplicitRelativeOrAbsolutePath(targetPath)) return null;
  if (!isAbsolute(targetPath) && targetPath.split(/[\\/]/).includes("..")) return null;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(targetPath, root)) return null;
  if (/[*?[\]]/.test(targetPath)) return null;
  let { allowed, resolvedPath } = validatePath(targetPath, root, permissionContext, "read");
  if (!allowed) return null;
  if (!pathInAllowedWorkingPath(resolvedPath, permissionContext, [resolvedPath])) return null;
  return resolvedPath;
}
//@ chunk-5xgkngpb.js:1187189-1187604 placement
/**
 * 判断命令中的 cd 是否只切换到当前目录（只有一个 cd、无环境变量与重定向、目标与当前目录文件身份相同）。
 */
async function isCdToCurrentDir(astCommandsByIdx, subcommands, cwd) {
  let fileIdentity = await getFileIdentity_4(cwd);
  if (fileIdentity === null) return false;
  if (countWhere(subcommands, (subcommand) => isNormalizedCdCommand(subcommand)) > 1) return false;
  let hasCd = false;
  for (let idx = 0; idx < subcommands.length; idx++) {
    if (!isNormalizedCdCommand(subcommands[idx])) continue;
    hasCd = true;
    let astCommand = astCommandsByIdx[idx];
    if (!astCommand) return false;
    if (astCommand.envVars.length > 0 || astCommand.redirects.length > 0) return false;
    if (astCommand.argv.length !== 2 || astCommand.argv[0] !== "cd") return false;
    if (containsAnyPlaceholder(astCommand.argv[1])) return false;
    let cdTarget = getPlatform() === "windows" ? parseCdTarget(subcommands[idx]) : astCommand.argv[1];
    if (cdTarget === null) return false;
    if (!(await isSameDirPath(cdTarget, cwd, fileIdentity))) return false;
  }
  return hasCd;
}
//@ chunk-5xgkngpb.js:1187604-1187842 placement
/**
 * 按文本判断命令中的 cd 是否只切换到当前目录（只允许一个 cd）。
 */
async function isCdTextToCurrentDir(subcommands, cwd) {
  let fileIdentity = await getFileIdentity_4(cwd);
  if (fileIdentity === null) return false;
  if (countWhere(subcommands, (subcommand) => isNormalizedCdCommand(subcommand.trim())) > 1) return false;
  let hasCd = false;
  for (let subcommand of subcommands) {
    let subcommand_2 = subcommand.trim();
    if (!isNormalizedCdCommand(subcommand_2)) continue;
    hasCd = true;
    let cdTarget = parseCdTarget(subcommand_2);
    if (cdTarget === null) return false;
    if (!(await isSameDirPath(cdTarget, cwd, fileIdentity))) return false;
  }
  return hasCd;
}
//@ chunk-5xgkngpb.js:1187842-1188326 placement
/**
 * 从 "cd 目标" 文本中解析目标路径（支持完整引号），含空白、引号、反斜杠、shell 元字符或控制字符时返回 null。
 */
function parseCdTarget(subcommand) {
  let trimmed = subcommand.trim();
  if (!trimmed.startsWith("cd ")) return null;
  let trimmed_2 = trimmed.slice(3).trim();
  if (trimmed_2.length === 0) return null;
  let quoteChar = trimmed_2[0];
  if (quoteChar === '"' || quoteChar === "'") {
    if (trimmed_2.length < 2 || trimmed_2.at(-1) !== quoteChar) return null;
    let sliced = trimmed_2.slice(1, -1);
    if (sliced.includes(quoteChar)) return null;
    if (quoteChar === '"' && sliced.includes("\\") && getPlatform() !== "windows") return null;
    if (/[\x00-\x1f\x7f]/.test(sliced)) return null;
    return sliced;
  }
  if (/\s/.test(trimmed_2)) return null;
  if (/['"]/.test(trimmed_2)) return null;
  if (trimmed_2.includes("\\")) return null;
  if (/[<>|&;(){}]/.test(trimmed_2)) return null;
  return trimmed_2;
}
//@ chunk-5xgkngpb.js:1188326-1189796 placement
/**
 * 检查 cd/pushd/popd 命令：目标目录的读权限与拒绝规则。
 */
function checkCdCommand(commands, cwd, toolPermissionContext) {
  let candidateDirs = new Set([cwd]);
  let currentDir = cwd;
  let previousDir;
  let dirStack = [];
  let hasUnresolvedCd = false;
  for (let command of commands) {
    let argv = stripWrappersFromArgvForPaths(command.argv);
    let replaced = argv[0]?.replace(/^.*[\\/]/, "");
    if (replaced === "cd" || replaced === "chdir" || replaced === "pushd" || replaced === "popd") {
      let filtered = argv.slice(1).filter((arg) => arg !== "--" && (arg === "-" || !arg.startsWith("-")));
      let pathArg =
        filtered.length === 1
          ? filtered[0]
          : filtered.length === 0 && (replaced === "cd" || replaced === "chdir")
            ? "~"
            : undefined;
      let filtered_2 = argv
        .slice(1)
        .filter((arg) => arg !== "--" && arg !== "-" && arg.startsWith("-") && !/^-[PLe@]+$/.test(arg));
      if ((replaced === "pushd" || replaced === "popd") && filtered_2.length === 1 && filtered_2[0] === "-n")
        continue;
      let isSimpleTarget =
        replaced !== "popd" &&
        filtered_2.length === 0 &&
        pathArg !== undefined &&
        pathArg !== "-" &&
        !/^[+-]\d+$/.test(pathArg) &&
        !containsAnyPlaceholder(pathArg) &&
        !/[*?[\]$`]/.test(pathArg) &&
        !(pathArg.startsWith("~") && pathArg !== "~" && !pathArg.startsWith("~/")) &&
        !command.envVars.some((envVar) => containsAnyPlaceholder(envVar.value));
      let stackMove =
        filtered_2.length === 0 &&
        (replaced === "popd"
          ? filtered.length === 0 && dirStack.length > 0
            ? {
                dir: dirStack.pop(),
              }
            : undefined
          : pathArg === "-" && previousDir !== undefined
            ? {
                dir: previousDir,
              }
            : undefined);
      if (stackMove) [previousDir, currentDir] = [currentDir, stackMove.dir];
      else if (isSimpleTarget) {
        if (replaced === "pushd") dirStack.push(currentDir);
        previousDir = currentDir;
        candidateDirs.add(resolve_2(cwd, expandTildeWithHome(pathArg)));
        if (currentDir !== undefined) {
          currentDir = resolve_2(currentDir, expandTildeWithHome(pathArg));
          candidateDirs.add(currentDir);
        }
      } else {
        if (replaced === "pushd") dirStack.push(currentDir);
        hasUnresolvedCd = true;
        previousDir = currentDir;
        currentDir = undefined;
      }
      if (currentDir === undefined && (stackMove || isSimpleTarget)) hasUnresolvedCd = true;
      continue;
    }
    for (let baseDir of candidateDirs) {
      let pathResult = checkPathConstraints(
        {
          command: command.text,
        },
        baseDir,
        toolPermissionContext,
        false,
        command.redirects,
        [command],
      );
      if (pathResult.behavior === "deny" && pathResult.decisionReason?.type === "rule") return pathResult;
    }
    if (hasUnresolvedCd)
      for (let readPath of getReadPathsForAstCommand(command)) {
        let denyRule = denyRuleMatchingAnywhere(readPath, toolPermissionContext, "read");
        if (denyRule !== null)
          return {
            behavior: "deny",
            message: `${argv[0]} reads '${readPath}' after a cd whose target cannot be resolved, and a deny rule (${denyRule.ruleValue.ruleContent ?? denyRule.ruleValue.toolName}) names that file under a directory it may run in`,
            decisionReason: {
              type: "rule",
              rule: denyRule,
            },
          };
      }
  }
  return null;
}
//@ chunk-5xgkngpb.js:1189796-1190795 placement
/**
 * 判断开头的 cd/pushd 是否可能让后续命令读到规则外的内容（CDPATH、目标或其下的拒绝规则、后续参数中的相对路径相对两个目录都需允许）；返回 true 表示需谨慎处理。
 */
function cdMayChangeReadScope(commands, cwd, context, toolUseContext) {
  if (getPlatform() === "windows") return true;
  let [firstCommand, ...restCommands] = commands.map((command) => ({
    cmd: command,
    argv: stripWrappersFromArgvForPaths(command.argv),
  }));
  let cdBuiltin = firstCommand && getDirectoryChangeBuiltin(firstCommand.argv);
  if (firstCommand === undefined || cdBuiltin === undefined || cdBuiltin === "popd") return true;
  let filtered = firstCommand.argv.slice(1).filter((arg) => arg !== "--");
  let target = filtered[0];
  if (
    firstCommand.cmd.envVars.length > 0 ||
    filtered.length !== 1 ||
    target === undefined ||
    containsAnyPlaceholder(target) ||
    /^[-+~]|[$`*?[\]{}\\\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)/.test(target)
  )
    return true;
  let isRelativeTarget = !isAbsolute(target) && target !== "." && !target.startsWith("./");
  if (
    isRelativeTarget &&
    spawnEnvKeysForSession(sessionEnvVarNameSet(toolUseContext))?.has("CDPATH") !== false
  )
    return true;
  let resolvedTarget = resolve_2(cwd, target);
  if (!pathInAllowedWorkingPath(resolvedTarget, context, [resolvedTarget])) return true;
  try {
    if (!getFsImplementation().statSync(resolvedTarget).isDirectory()) return true;
  } catch {
    return true;
  }
  let mayMatchDeniedRead = (searchRoot) => readDenyRuleMayMatchBeneath(searchRoot, context) !== null;
  if (
    mayMatchDeniedRead(cwd) ||
    mayMatchDeniedRead(resolvedTarget) ||
    (isRelativeTarget && mayMatchDeniedRead(resolve_2(homedir(), target)))
  )
    return true;
  for (let { cmd, argv } of restCommands) {
    if (
      cmd.hasUnquotedGlob ||
      cmd.envVars.length > 0 ||
      getDirectoryChangeBuiltin(argv) !== undefined ||
      argv.some((arg) => containsAnyPlaceholder(arg) || /(^|[\\/])\.\.([\\/]|$)/.test(arg))
    )
      return true;
    for (let arg of argv.slice(1))
      for (let candidate of getArgPathCandidates(arg)) {
        if (candidate === "") continue;
        if (/[*?[\]{}\\~]/.test(candidate) || /(^|[\\/=])\.\.([\\/]|$)/.test(candidate)) return true;
        for (let baseDir of [cwd, resolvedTarget])
          if (
            !validatePath(candidate, baseDir, context, "read").allowed ||
            mayMatchDeniedRead(resolve_2(baseDir, candidate))
          )
            return true;
      }
  }
  return false;
}
//@ chunk-5xgkngpb.js:1190795-1191663 placement
/**
 * 判断 "cd 目录 && 只读命令…" 是否可视为只读：cd 目标规范且允许，后续命令无环境变量、只重定向到 /dev/null、为只读命令，且其路径参数相对两个目录都被允许。
 */
function isReadOnlyAfterCd(commands, cwd, permissionContext, toolUseContext) {
  let [cdCommand, ...restCommands] = commands;
  let cdTarget = cdCommand?.argv[1];
  if (
    getPlatform() === "windows" ||
    cdCommand === undefined ||
    cdTarget === undefined ||
    restCommands.length === 0 ||
    cdCommand.argvSourceLiteral !== true ||
    cdCommand.text !== `cd ${cdTarget}` ||
    !isPlainPathToken(cdTarget)
  )
    return false;
  let simpleCdTarget = resolveSimpleCdTarget(cdCommand, cwd, permissionContext);
  if (simpleCdTarget === null) return false;
  let mapped = [cwd, simpleCdTarget].map((dir) => safeResolvePath(getFsImplementation(), dir));
  if (!mapped.every((resolved) => resolved.isCanonical)) return false;
  return restCommands.every((command) => {
    let isGlobLiterate =
      command.carveOutMayDesyncQuoteScan !== true && command.argvUnquotedGlob?.length === command.argv.length;
    return (
      command.envVars.length === 0 &&
      command.argvSourceLiteral === true &&
      command.redirects.every(
        ({ op, target, targetSourceLiteral }) =>
          targetSourceLiteral === true &&
          (op === ">&" ? /^\d+$/.test(target) : (op === ">" || op === ">>") && target === "/dev/null"),
      ) &&
      BashTool.isReadOnly(
        {
          command: command.text,
        },
        toolUseContext,
      ) &&
      command.argv.every(
        (arg, argIdx) =>
          getDirectoryChangeBuiltin([arg]) === undefined &&
          !/(^|[\\/])xargs$/.test(arg) &&
          !/[{}]/.test(arg) &&
          !containsAnyPlaceholder(arg) &&
          (isAbsolute(arg) ||
            !/[*?[]/.test(arg) ||
            (isGlobLiterate && command.argvUnquotedGlob?.[argIdx] === false)) &&
          getArgPathCandidates(arg).every(
            (candidate) =>
              candidate === "" ||
              mapped.every(
                (basePath) =>
                  validatePath(candidate, basePath.resolvedPath, permissionContext, "read").allowed,
              ),
          ),
      )
    );
  });
}
//@ chunk-5xgkngpb.js:1191777-1192014 placement
function getArgPathCandidates(arg) {
  let candidates = new Set([arg]);
  if (/^-[^-]/.test(arg)) for (let idx = 2; idx <= arg.length; idx++) candidates.add(arg.slice(idx));
  let current = arg;
  for (;;) {
    let stripped = current.startsWith("@")
      ? current.slice(1)
      : current.includes("=")
        ? current.slice(current.indexOf("=") + 1)
        : current;
    candidates.add(stripped);
    if (stripped === current) break;
    current = stripped;
  }
  return [...candidates];
}
//@ chunk-5xgkngpb.js:1192014-1192103 placement (2.1.88 match: resolveCwdReentry, 1)
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
//@ chunk-5xgkngpb.js:1192103-1192599 placement
/**
 * 判断 cd 目标是否就是当前目录：拒绝选项、变量、通配、UNC 路径与越界的 ..，再比较文件身份。
 */
async function isSameDirPath(cdTarget, cwd, fileIdentity) {
  if (cdTarget.startsWith("-")) return false;
  if (!isExplicitRelativeOrAbsolutePath(cdTarget)) return false;
  if (
    cdTarget.includes("$") ||
    cdTarget.includes("`") ||
    /[*?[]/.test(cdTarget) ||
    (getPlatform() !== "windows" && cdTarget.includes("\\")) ||
    (getPlatform() === "windows" && cdTarget.includes("%"))
  )
    return false;
  if (containsVulnerableUncPath(cdTarget) || (getPlatform() === "windows" && /^[\\/]{2}/.test(cdTarget)))
    return false;
  if (getPlatform() === "windows" && !staysWithinRelativeRoot(cdTarget, cwd)) return false;
  {
    let isAbsoluteTarget = isAbsolute(cdTarget);
    let sawSegment = false;
    for (let segment of cdTarget.split(/[\\/]/)) {
      if (segment === "" || segment === ".") continue;
      if (segment === "..") {
        if (!isAbsoluteTarget || sawSegment) return false;
        continue;
      }
      sawSegment = true;
    }
  }
  let filePath = isAbsolute(cdTarget) ? cdTarget : resolve_2(cwd, cdTarget);
  let fileIdentity_2 = await getFileIdentity_4(filePath);
  if (fileIdentity_2 === null) return false;
  return fileIdentity_2 === fileIdentity;
}
//@ chunk-5xgkngpb.js:1192599-1193081 placement
/**
 * 检查 Windows 相对路径中的 .. 不会越过相对根（结合当前目录深度计算）。
 */
function staysWithinRelativeRoot(target, root) {
  let relativePart = target;
  let depth;
  let match = /^[A-Za-z]:[\\/]/.exec(target);
  if (match) {
    relativePart = target.slice(match[0].length);
    depth = 0;
  } else if (/^[\\/]/.test(target) || target.includes("\\")) return false;
  else {
    if (/^[\\/]{2}/.test(root)) return false;
    depth = 0;
    for (let segment of root.replace(/^[A-Za-z]:/, "").split(/[\\/]/)) {
      if (segment === "" || segment === ".") continue;
      depth += segment === ".." ? -1 : 1;
    }
  }
  let requiresContained = !match;
  let wentUp = false;
  for (let segment of relativePart.split(/[\\/]/)) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (depth === 0) return false;
      depth -= 1;
      wentUp = true;
      continue;
    }
    if (requiresContained && wentUp) return false;
    if (segment.includes(":") || /[ .]$/.test(segment)) return false;
    depth += 1;
  }
  return true;
}
//@ chunk-5xgkngpb.js:1193081-1193454 placement (2.1.88 match: getFileIdentity, 1)
async function getFileIdentity_4(filePath) {
  if (getPlatform() === "windows") {
    let parts = filePath.split(/[\\/]/);
    for (let idx = 0; idx < parts.length; idx++) {
      let segment = parts[idx];
      if (segment === "." || segment === "..") continue;
      if (/[ .]$/.test(segment)) return null;
      if (segment.includes(":") && !(idx === 0 && /^[A-Za-z]:$/.test(segment))) return null;
    }
    let stats = await stat(filePath, {
      bigint: true,
    }).catch(() => null);
    if (stats === null || isSentinelInode(stats.ino)) return null;
    return `${stats.dev}:${stats.ino}`;
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
