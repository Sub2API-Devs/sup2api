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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
function renameInputFields(input, renameMap) {
  if (renameMap.size === 0) return input;
  let renamed = new Set(renameMap.values());
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !renamed.has(key))
      .map(([key, value]) => [renameMap.get(key) ?? key, value]),
  );
}
//@ chunk-gqez588q.js:1457-1572 placement
/**
 * 把输出中的字段名按映射表改回原名。
 */
function unrenameOutputFields(output, wireArguments) {
  if (wireArguments.size === 0) return output;
  let originalName = new Map([...wireArguments].map(([original, renamed]) => [renamed, original]));
  return identityMap(output, (value, key) => originalName.get(key) ?? key);
}
//@ chunk-gqez588q.js:1572-1682 placement
/**
 * 去掉值等于目标机器名的目标字段，剩余为空时返回 undefined。
 */
function stripTargetField(input, targetName) {
  if (input === undefined) return;
  let stripped =
    input[HOST_TOOL_INPUT_FIELD] === targetName ? omitAlias(input, [HOST_TOOL_INPUT_FIELD]) : input;
  return Object.keys(stripped).length === 0 ? undefined : stripped;
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
function withoutEditKeys(input, extraKeys) {
  return omitAlias(input, [SIMULATED_SED_EDIT_KEY, ...extraKeys]);
}
//@ chunk-gqez588q.js:1850-1961 placement
/**
 * 只保留第二个对象中在第一个对象里也存在的键。
 */
function pickKnownFields(evaluatedInput, source) {
  return Object.fromEntries(
    Object.keys(source)
      .filter((key) => Object.hasOwn(evaluatedInput, key))
      .map((key) => [key, source[key]]),
  );
}
//@ chunk-gqez588q.js:2085-2373 placement
/**
 * 远程写/编辑文件前，从本地读取记录中取出该文件（映射到同步目录后）的完整读取基线。
 */
function readBaselineForRemoteWrite(context) {
  if (context.tool.name !== FILE_WRITE_TOOL_NAME && context.tool.name !== FILE_EDIT_TOOL_NAME) return;
  let filePath = context.input.file_path;
  if (typeof filePath !== "string" || isNotebookPath(filePath)) return;
  let localPath = mirroredLocalPath(filePath, context.description, context.sessionDir());
  if (localPath === undefined) return;
  let fileState = context.readFileState.get(localPath);
  return fileState !== undefined && !fileState.isPartialView && (fileState.offset ?? 1) <= 1
    ? fileState.readBaseline
    : undefined;
}
//@ chunk-gqez588q.js:2373-2757 placement
/**
 * 把远程机器上的绝对路径（含 ~）映射到本会话同步目录下的对应路径，仅当该机器项目为双向/仅上传同步且路径位于同步根内时。
 */
function mirroredLocalPath(remotePath, description, sessionDir, pathImpl = path) {
  if (
    description === undefined ||
    (description.project_sync !== "two_way" && description.project_sync !== "upload_only")
  )
    return;
  let pathLib = description.platform === "win32" ? win32 : posix;
  let expandedPath =
    description.home_dir !== undefined && (remotePath === "~" || remotePath.startsWith("~/"))
      ? pathLib.join(description.home_dir, remotePath.slice(2))
      : remotePath;
  let syncRoot = syncRootOf(description, pathLib);
  if (!pathLib.isAbsolute(expandedPath) || !pathLib.isAbsolute(syncRoot)) return;
  let relativePath = pathLib.relative(syncRoot, expandedPath);
  if (!isContainedRelative(pathLib, relativePath)) return;
  let joined = posix.join(sessionDir, ...relativePath.split(pathLib.sep));
  return isContainedRelative(pathImpl, pathImpl.relative(sessionDir, joined)) ? joined : undefined;
}
//@ chunk-gqez588q.js:2757-2886 placement
function syncRootOf(description, pathLib) {
  return description.sync_root !== undefined &&
    pathLib.isAbsolute(description.sync_root) &&
    isPathWithin(pathLib, description.sync_root, description.working_dir)
    ? description.sync_root
    : description.working_dir;
}
//@ chunk-gqez588q.js:2886-2960 placement
function isContainedRelative(pathLib, relativePath) {
  return (
    relativePath !== "" && relativePath.split(pathLib.sep)[0] !== ".." && !pathLib.isAbsolute(relativePath)
  );
}
//@ chunk-gqez588q.js:2960-3022 placement
function isPathWithin(pathLib, syncRoot, workingDir) {
  let relativePath = pathLib.relative(syncRoot, workingDir);
  return relativePath === "" || isContainedRelative(pathLib, relativePath);
}
//@ chunk-gqez588q.js:3022-3138 placement
/**
 * 比较两组输入在规范化与默认值意义下是否相同。
 */
function sameInputsModuloDefaults(left, right, platform) {
  return (
    definedEntries(left).every(([key, value]) =>
      isDeepStrictEqual(
        normalizeFileInput(key, value, platform),
        normalizeFileInput(key, right[key], platform),
      ),
    ) && definedEntries(right).every(([key, value]) => left[key] !== undefined || value === false)
  );
}
//@ chunk-gqez588q.js:3138-3235 placement
function normalizeFileInput(key, value, platform) {
  return key === "file_path" && typeof value === "string" && platform === "darwin"
    ? value.normalize("NFC")
    : value;
}
//@ chunk-gqez588q.js:3235-3301 placement
function definedEntries(object) {
  return Object.entries(object).filter(([, value]) => value !== undefined);
}
//@ chunk-gqez588q.js:3301-3338 placement (2.1.88 match: getUnameSR, 0.793)
function getUnameSR(platform) {
  return platform === "win32" ? win32 : posix;
}
//@ chunk-gqez588q.js:3338-3764 placement
/**
 * 从机器描述中提取路径事实：工作目录、主目录、镜像目录、平台，以及副本来源目录。
 */
function remoteDirFacts(description) {
  let pathLib = getUnameSR(description.platform);
  let copyOf = description.copy_of;
  return pathLib.isAbsolute(description.working_dir)
    ? {
        workingDir: description.working_dir,
        homeDir:
          description.home_dir !== undefined && pathLib.isAbsolute(description.home_dir)
            ? description.home_dir
            : undefined,
        mirroredDir: syncRootOf(description, pathLib),
        platform: description.platform,
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
  let facts = description === undefined ? undefined : remoteDirFacts(description);
  if (facts === undefined)
    return {
      kind: "no_announced_dir",
    };
  if (facts.platform === "win32")
    return {
      kind: "windows_machine",
    };
  return getPlatform() === "windows"
    ? {
        kind: "windows_session",
      }
    : {
        kind: "in_announced_dir",
        dir: facts.workingDir,
      };
}
//@ chunk-gqez588q.js:4003-4123 placement
/**
 * 把输入的 file_path 解析为远程机器上的绝对路径。
 */
function resolveRemoteFilePathInput(input, dirFacts) {
  let filePath = input.file_path;
  if (typeof filePath !== "string") return input;
  let remotePath = resolveRemotePath(filePath, dirFacts);
  return remotePath === undefined
    ? input
    : {
        ...input,
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
  let normalized = normalizeWin32DrivePath(trimmed, unameSR);
  if (unameSR.isAbsolute(normalized)) return unameSR.normalize(normalized);
  let driveLetter = unameSR === win32 ? driveLetterOf(normalized) : undefined;
  return driveLetter !== undefined && driveLetter !== driveLetterOf(dirFacts.workingDir)
    ? undefined
    : unameSR.resolve(dirFacts.workingDir, normalized);
}
//@ chunk-gqez588q.js:4456-4527 placement
function driveLetterOf(pathText) {
  let match = /^[a-z]:/i.exec(pathText);
  return match === null ? undefined : normalizeCaseForComparison(match[0]);
}
//@ chunk-gqez588q.js:4527-4667 placement
function normalizeWin32DevicePath(path, workingDir) {
  let replaced = path.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, "");
  return /^\\(?!\\)/.test(replaced) ? win32.resolve(workingDir, replaced) : replaced;
}
//@ chunk-gqez588q.js:4667-4898 placement
function stripMacVolumePrefix(path, volumeName) {
  let parts = isSystemVolumePath(path).split("/");
  if (foldCase_2(parts[1] ?? "") === "volumes" && foldCase_2(parts[2] ?? "") === volumeName)
    return stripMacVolumePrefix(["", ...parts.slice(3)].join("/") || "/", volumeName);
  return ["tmp", "var", "etc"].includes(foldCase_2(parts[1] ?? ""))
    ? ["", "private", ...parts.slice(1)].join("/")
    : parts.join("/");
}
//@ chunk-gqez588q.js:4898-5023 placement
function macPathVariants(path) {
  let stripped = stripMacVolumePrefix(path, "macintosh hd");
  let [firstSegment, volumeSegment = ""] = stripped.split("/").slice(1, 3).map(foldCase_2);
  return firstSegment === "volumes" && volumeSegment !== ""
    ? [stripped, stripMacVolumePrefix(stripped, volumeSegment)]
    : [stripped];
}
//@ chunk-gqez588q.js:5023-5144 placement
function stripProcRoot(path) {
  let match = /^\/proc\/(?:self|thread-self)\/root(?=\/|$)/.exec(path);
  return match === null ? path : stripProcRoot(path.slice(match[0].length) || "/");
}
//@ chunk-gqez588q.js:5144-5204 placement
function normalizeWin32DrivePath(path, unameSR) {
  return unameSR === win32 && /^\/[a-z]\//i.test(path) ? posixPathToWindowsPath(path) : path;
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
