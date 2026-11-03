/**
 * services/remoteTools/pathMapping.ts
 *
 * 2.1.316 新增。远程工具的路径映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gqez588q.js (31)
 * attribution: placement 31
 */
import path, { win32, posix } from "path";
import { isDeepStrictEqual } from "util";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { unsupportedFieldMessage } from "./hostRefusals.js";
import { isNotebookPath, posixPathToWindowsPath } from "../../utils/path.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { isSystemVolumePath } from "../../utils/permissions/protectedDirs.js";
import { foldCase_2 } from "../../utils/networkPaths.js";

//@ chunk-gqez588q.js:611-645 placement
/**
 * 输入含路径、在远程执行前需要路径映射的工具集合。
 */
var PATH_SENSITIVE_TOOLS = new Set([
  BASH_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
]);
//@ chunk-gqez588q.js:645-696 placement
/**
 * 默认的路径服务策略。
 */
var DEFAULT_SERVING_POLICY = {
  approvalAttested: false,
  modeDecidedByHost: false,
};
//@ chunk-gqez588q.js:696-1060 placement
/**
 * 合并两份服务策略，取更严格的一方（沙箱必需、禁止后台、固定 cwd、清除凭证环境变量、较小的超时上限）。
 */
function mergeServingPolicy(base, override) {
  if (!override) return base;
  return {
    ...base,
    sandbox: base.sandbox === "required" || override.sandbox === "required" ? "required" : "tool_default",
    background:
      base.background === "forbidden" || override.background === "forbidden" ? "forbidden" : "tool_default",
    pinCwd: base.pinCwd || override.pinCwd === true,
    scrubCredentialEnv: base.scrubCredentialEnv || override.scrubCredentialEnv === true,
    maxTimeoutMs: minTimeout(base.maxTimeoutMs, override.maxTimeoutMs),
  };
}
//@ chunk-gqez588q.js:1060-1139 placement
function minTimeout(maxTimeoutMs, maxTimeoutMs_2) {
  if (maxTimeoutMs_2 === undefined || maxTimeoutMs_2 <= 0) return maxTimeoutMs;
  return maxTimeoutMs === undefined ? maxTimeoutMs_2 : Math.min(maxTimeoutMs, maxTimeoutMs_2);
}
//@ chunk-gqez588q.js:1139-1266 placement
/**
 * 远程调用路径映射常量：禁止嵌套远程执行的拒绝文字、模拟 sed 编辑键、字段改名缓存。
 */
var NESTED_REMOTE_REFUSAL =
  "nested remote execution is not supported: a served call cannot name another machine.";
var SIMULATED_SED_EDIT_KEY = "_simulatedSedEdit";
var renamedFieldCache = new Map();
//@ chunk-gqez588q.js:1266-1290 placement
/**
 * 按字段名缓存的改名映射。
 */
function renamedFieldCacheMap() {
  return renamedFieldCache;
}
//@ chunk-gqez588q.js:1290-1457 placement
/**
 * 按映射表把输入字段改名（去掉与新名冲突的原字段）。
 */
function renameInputFields(n, e) {
  if (e.size === 0) return n;
  let r = new Set(e.values());
  return Object.fromEntries(
    Object.entries(n)
      .filter(([key]) => !r.has(key))
      .map(([key, value]) => [e.get(key) ?? key, value]),
  );
}
//@ chunk-gqez588q.js:1457-1572 placement
/**
 * 把输出中的字段名按映射表改回原名。
 */
function unrenameOutputFields(n, wireArguments) {
  if (wireArguments.size === 0) return n;
  let r = new Map([...wireArguments].map(([i, t]) => [t, i]));
  return identityMap(n, (i, t) => r.get(t) ?? t);
}
//@ chunk-gqez588q.js:1572-1682 placement
/**
 * 去掉值等于目标机器名的目标字段，剩余为空时返回 undefined。
 */
function stripTargetField(n, targetName) {
  if (n === undefined) return;
  let r = n[HOST_TOOL_INPUT_FIELD] === targetName ? Uo(n, [HOST_TOOL_INPUT_FIELD]) : n;
  return Object.keys(r).length === 0 ? undefined : r;
}
//@ chunk-gqez588q.js:1682-1808 placement
/**
 * 输入里带有目标字段（嵌套远程）或不支持的字段时返回拒绝说明。
 */
function unsupportedFieldRefusal(input, fields, targetName) {
  if (HOST_TOOL_INPUT_FIELD in input) return NESTED_REMOTE_REFUSAL;
  let found = fields.find((field) => Boolean(input[field]));
  return found === undefined
    ? undefined
    : unsupportedFieldMessage({
        field: found,
        targetName,
      });
}
//@ chunk-gqez588q.js:1808-1850 placement
/**
 * 去掉编辑专用键后的输入副本。
 */
function withoutEditKeys(n, e) {
  return Uo(n, [SIMULATED_SED_EDIT_KEY, ...e]);
}
//@ chunk-gqez588q.js:1850-1961 placement
/**
 * 只保留第二个对象中在第一个对象里也存在的键。
 */
function pickKnownFields(evaluatedInput, e) {
  return Object.fromEntries(
    Object.keys(e)
      .filter((key) => Object.hasOwn(evaluatedInput, key))
      .map((key) => [key, e[key]]),
  );
}
//@ chunk-gqez588q.js:2085-2373 placement
/**
 * 远程写/编辑文件前，从本地读取记录中取出该文件（映射到同步目录后）的完整读取基线。
 */
function readBaselineForRemoteWrite(n) {
  if (n.tool.name !== FILE_WRITE_TOOL_NAME && n.tool.name !== FILE_EDIT_TOOL_NAME) return;
  let filePath = n.input.file_path;
  if (typeof filePath !== "string" || isNotebookPath(filePath)) return;
  let r = mirroredLocalPath(filePath, n.description, n.sessionDir());
  if (r === undefined) return;
  let i = n.readFileState.get(r);
  return i !== undefined && !i.isPartialView && (i.offset ?? 1) <= 1 ? i.readBaseline : undefined;
}
//@ chunk-gqez588q.js:2373-2757 placement
/**
 * 把远程机器上的绝对路径（含 ~）映射到本会话同步目录下的对应路径，仅当该机器项目为双向/仅上传同步且路径位于同步根内时。
 */
function mirroredLocalPath(remotePath, description, sessionDir, i = path) {
  if (
    description === undefined ||
    (description.project_sync !== "two_way" && description.project_sync !== "upload_only")
  )
    return;
  let t = description.platform === "win32" ? win32 : posix;
  let a =
    description.home_dir !== undefined && (remotePath === "~" || remotePath.startsWith("~/"))
      ? t.join(description.home_dir, remotePath.slice(2))
      : remotePath;
  let c = syncRootOf(description, t);
  if (!t.isAbsolute(a) || !t.isAbsolute(c)) return;
  let relativePath = t.relative(c, a);
  if (!isContainedRelative(t, relativePath)) return;
  let joined = posix.join(sessionDir, ...relativePath.split(t.sep));
  return isContainedRelative(i, i.relative(sessionDir, joined)) ? joined : undefined;
}
//@ chunk-gqez588q.js:2757-2886 placement
function syncRootOf(n, e) {
  return n.sync_root !== undefined && e.isAbsolute(n.sync_root) && isPathWithin(e, n.sync_root, n.working_dir)
    ? n.sync_root
    : n.working_dir;
}
//@ chunk-gqez588q.js:2886-2960 placement
function isContainedRelative(n, e) {
  return e !== "" && e.split(n.sep)[0] !== ".." && !n.isAbsolute(e);
}
//@ chunk-gqez588q.js:2960-3022 placement
function isPathWithin(n, syncRoot, workingDir) {
  let relativePath = n.relative(syncRoot, workingDir);
  return relativePath === "" || isContainedRelative(n, relativePath);
}
//@ chunk-gqez588q.js:3022-3138 placement
/**
 * 比较两组输入在规范化与默认值意义下是否相同。
 */
function sameInputsModuloDefaults(n, e, r) {
  return (
    definedEntries(n).every(([i, t]) =>
      isDeepStrictEqual(normalizeFileInput(i, t, r), normalizeFileInput(i, e[i], r)),
    ) && definedEntries(e).every(([i, t]) => n[i] !== undefined || t === false)
  );
}
//@ chunk-gqez588q.js:3138-3235 placement
function normalizeFileInput(n, e, r) {
  return n === "file_path" && typeof e === "string" && r === "darwin" ? e.normalize("NFC") : e;
}
//@ chunk-gqez588q.js:3235-3301 placement
function definedEntries(n) {
  return Object.entries(n).filter(([, value]) => value !== undefined);
}
//@ chunk-gqez588q.js:3301-3338 placement = getUnameSR (0.793)
function getUnameSR(platform) {
  return platform === "win32" ? win32 : posix;
}
//@ chunk-gqez588q.js:3338-3764 placement
/**
 * 从机器描述中提取路径事实：工作目录、主目录、镜像目录、平台，以及副本来源目录。
 */
function remoteDirFacts(n) {
  let unameSR = getUnameSR(n.platform);
  let copyOf = n.copy_of;
  return unameSR.isAbsolute(n.working_dir)
    ? {
        workingDir: n.working_dir,
        homeDir: n.home_dir !== undefined && unameSR.isAbsolute(n.home_dir) ? n.home_dir : undefined,
        mirroredDir: syncRootOf(n, unameSR),
        platform: n.platform,
        ...(copyOf !== undefined &&
          getUnameSR(copyOf.platform).isAbsolute(copyOf.dir) && {
            copyOf: {
              workingDir: copyOf.dir,
              homeDir:
                copyOf.home_dir !== undefined && getUnameSR(copyOf.platform).isAbsolute(copyOf.home_dir)
                  ? copyOf.home_dir
                  : undefined,
              mirroredDir: copyOf.dir,
              platform: copyOf.platform,
            },
          }),
      }
    : undefined;
}
//@ chunk-gqez588q.js:3764-4003 placement
/**
 * 判断远程目录类别：无公布目录、Windows 机器、Windows 会话或位于公布目录中。
 */
function remoteDirKind(description) {
  let e = description === undefined ? undefined : remoteDirFacts(description);
  if (e === undefined)
    return {
      kind: "no_announced_dir",
    };
  if (e.platform === "win32")
    return {
      kind: "windows_machine",
    };
  return getPlatform() === "windows"
    ? {
        kind: "windows_session",
      }
    : {
        kind: "in_announced_dir",
        dir: e.workingDir,
      };
}
//@ chunk-gqez588q.js:4003-4123 placement
/**
 * 把输入的 file_path 解析为远程机器上的绝对路径。
 */
function resolveRemoteFilePathInput(n, dirFacts) {
  let filePath = n.file_path;
  if (typeof filePath !== "string") return n;
  let remotePath = resolveRemotePath(filePath, dirFacts);
  return remotePath === undefined
    ? n
    : {
        ...n,
        file_path: remotePath,
      };
}
//@ chunk-gqez588q.js:4123-4456 placement
/**
 * 解析远程路径：处理 ~、空路径与相对路径，Windows 上拒绝其他盘符的相对路径。
 */
function resolveRemotePath(path, dirFacts) {
  let unameSR = getUnameSR(dirFacts.platform);
  let trimmed = path.trim();
  if (trimmed === "~" || trimmed.startsWith("~/"))
    return dirFacts.homeDir === undefined ? undefined : unameSR.join(dirFacts.homeDir, trimmed.slice(2));
  if (trimmed === "") return unameSR.normalize(dirFacts.workingDir);
  let t = normalizeWin32DrivePath(trimmed, unameSR);
  if (unameSR.isAbsolute(t)) return unameSR.normalize(t);
  let a = unameSR === win32 ? driveLetterOf(t) : undefined;
  return a !== undefined && a !== driveLetterOf(dirFacts.workingDir)
    ? undefined
    : unameSR.resolve(dirFacts.workingDir, t);
}
//@ chunk-gqez588q.js:4456-4527 placement
function driveLetterOf(workingDir) {
  let match = /^[a-z]:/i.exec(workingDir);
  return match === null ? undefined : normalizeCaseForComparison(match[0]);
}
//@ chunk-gqez588q.js:4527-4667 placement
function normalizeWin32DevicePath(n, workingDir) {
  let replaced = n.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, "");
  return /^\\(?!\\)/.test(replaced) ? win32.resolve(workingDir, replaced) : replaced;
}
//@ chunk-gqez588q.js:4667-4898 placement
function stripMacVolumePrefix(n, e) {
  let parts = isSystemVolumePath(n).split("/");
  if (foldCase_2(parts[1] ?? "") === "volumes" && foldCase_2(parts[2] ?? "") === e)
    return stripMacVolumePrefix(["", ...parts.slice(3)].join("/") || "/", e);
  return ["tmp", "var", "etc"].includes(foldCase_2(parts[1] ?? ""))
    ? ["", "private", ...parts.slice(1)].join("/")
    : parts.join("/");
}
//@ chunk-gqez588q.js:4898-5023 placement
function macPathVariants(n) {
  let e = stripMacVolumePrefix(n, "macintosh hd");
  let [r, i = ""] = e.split("/").slice(1, 3).map(foldCase_2);
  return r === "volumes" && i !== "" ? [e, stripMacVolumePrefix(e, i)] : [e];
}
//@ chunk-gqez588q.js:5023-5144 placement
function stripProcRoot(n) {
  let match = /^\/proc\/(?:self|thread-self)\/root(?=\/|$)/.exec(n);
  return match === null ? n : stripProcRoot(n.slice(match[0].length) || "/");
}
//@ chunk-gqez588q.js:5144-5204 placement
function normalizeWin32DrivePath(n, unameSR) {
  return unameSR === win32 && /^\/[a-z]\//i.test(n) ? posixPathToWindowsPath(n) : n;
}
export {
  unsupportedFieldRefusal,
  withoutEditKeys,
  stripTargetField,
  renameInputFields,
  SIMULATED_SED_EDIT_KEY,
  pickKnownFields,
  unrenameOutputFields,
  renamedFieldCacheMap,
  mergeServingPolicy,
  DEFAULT_SERVING_POLICY,
  remoteDirKind,
  remoteDirFacts,
  resolveRemoteFilePathInput,
  readBaselineForRemoteWrite,
  sameInputsModuloDefaults,
  PATH_SENSITIVE_TOOLS,
  normalizeWin32DevicePath,
  macPathVariants,
  stripProcRoot,
  getUnameSR,
  normalizeWin32DrivePath,
  resolveRemotePath,
  driveLetterOf,
};
