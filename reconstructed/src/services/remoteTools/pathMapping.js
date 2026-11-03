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
import path, { win32, win32 as win32_2, posix, posix as posix_2 } from "path";
import { isDeepStrictEqual } from "util";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { $r } from "../../bridge/deviceRegistration.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { unsupportedFieldMessage } from "./hostRefusals.js";
import { isNotebookPath, B8 } from "../../utils/path.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { isSystemVolumePath } from "../../utils/permissions/protectedDirs.js";
import { foldCase } from "../../utils/networkPaths.js";

//@ chunk-gqez588q.js:611-645 placement
var cNt = new Set([
  BASH_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
]);
//@ chunk-gqez588q.js:645-696 placement
var RTe = { approvalAttested: !1, modeDecidedByHost: !1 };
/**
 * 合并两份服务策略，取更严格的一方（沙箱必需、禁止后台、固定 cwd、清除凭证环境变量、较小的超时上限）。
 */
//@ chunk-gqez588q.js:696-1060 placement
function mergeServingPolicy(base, override) {
  if (!override) return base;
  return {
    ...base,
    sandbox: base.sandbox === "required" || override.sandbox === "required" ? "required" : "tool_default",
    background:
      base.background === "forbidden" || override.background === "forbidden" ? "forbidden" : "tool_default",
    pinCwd: base.pinCwd || override.pinCwd === !0,
    scrubCredentialEnv: base.scrubCredentialEnv || override.scrubCredentialEnv === !0,
    maxTimeoutMs: C(base.maxTimeoutMs, override.maxTimeoutMs),
  };
}
//@ chunk-gqez588q.js:1060-1139 placement
function C(n, e) {
  if (e === void 0 || e <= 0) return n;
  return n === void 0 ? e : Math.min(n, e);
}
/**
 * 远程调用路径映射常量：禁止嵌套远程执行的拒绝文字、模拟 sed 编辑键、字段改名缓存。
 */
//@ chunk-gqez588q.js:1139-1266 placement
var NESTED_REMOTE_REFUSAL =
    "nested remote execution is not supported: a served call cannot name another machine.",
  SIMULATED_SED_EDIT_KEY = "_simulatedSedEdit",
  renamedFieldCache = new Map();
//@ chunk-gqez588q.js:1266-1290 placement
function Lrn() {
  return renamedFieldCache;
}
/**
 * 按映射表把输入字段改名（去掉与新名冲突的原字段）。
 */
//@ chunk-gqez588q.js:1290-1457 placement
function renameInputFields(n, e) {
  if (e.size === 0) return n;
  let r = new Set(e.values());
  return Object.fromEntries(
    Object.entries(n)
      .filter(([i]) => !r.has(i))
      .map(([i, t]) => [e.get(i) ?? i, t]),
  );
}
/**
 * 把输出中的字段名按映射表改回原名。
 */
//@ chunk-gqez588q.js:1457-1572 placement
function unrenameOutputFields(n, e) {
  if (e.size === 0) return n;
  let r = new Map([...e].map(([i, t]) => [t, i]));
  return identityMap(n, (i, t) => r.get(t) ?? t);
}
/**
 * 去掉值等于目标机器名的目标字段，剩余为空时返回 undefined。
 */
//@ chunk-gqez588q.js:1572-1682 placement
function stripTargetField(n, e) {
  if (n === void 0) return;
  let r = n[$r] === e ? Uo(n, [$r]) : n;
  return Object.keys(r).length === 0 ? void 0 : r;
}
/**
 * 输入里带有目标字段（嵌套远程）或不支持的字段时返回拒绝说明。
 */
//@ chunk-gqez588q.js:1682-1808 placement
function unsupportedFieldRefusal(input, fields, targetName) {
  if ($r in input) return NESTED_REMOTE_REFUSAL;
  let found = fields.find((t) => Boolean(input[t]));
  return found === void 0 ? void 0 : unsupportedFieldMessage({ field: found, targetName: targetName });
}
//@ chunk-gqez588q.js:1808-1850 placement
function uNt(n, e) {
  return Uo(n, [SIMULATED_SED_EDIT_KEY, ...e]);
}
/**
 * 只保留第二个对象中在第一个对象里也存在的键。
 */
//@ chunk-gqez588q.js:1850-1961 placement
function pickKnownFields(n, e) {
  return Object.fromEntries(
    Object.keys(e)
      .filter((r) => Object.hasOwn(n, r))
      .map((r) => [r, e[r]]),
  );
}
/**
 * 远程写/编辑文件前，从本地读取记录中取出该文件（映射到同步目录后）的完整读取基线。
 */
//@ chunk-gqez588q.js:2085-2373 placement
function readBaselineForRemoteWrite(n) {
  if (n.tool.name !== FILE_WRITE_TOOL_NAME && n.tool.name !== FILE_EDIT_TOOL_NAME) return;
  let file_path = n.input.file_path;
  if (typeof file_path !== "string" || isNotebookPath(file_path)) return;
  let r = mirroredLocalPath(file_path, n.description, n.sessionDir());
  if (r === void 0) return;
  let i = n.readFileState.get(r);
  return i !== void 0 && !i.isPartialView && (i.offset ?? 1) <= 1 ? i.readBaseline : void 0;
}
/**
 * 把远程机器上的绝对路径（含 ~）映射到本会话同步目录下的对应路径，仅当该机器项目为双向/仅上传同步且路径位于同步根内时。
 */
//@ chunk-gqez588q.js:2373-2757 placement
function mirroredLocalPath(remotePath, description, sessionDir, i = path) {
  if (
    description === void 0 ||
    (description.project_sync !== "two_way" && description.project_sync !== "upload_only")
  )
    return;
  let t = description.platform === "win32" ? win32_2 : posix_2,
    a =
      description.home_dir !== void 0 && (remotePath === "~" || remotePath.startsWith("~/"))
        ? t.join(description.home_dir, remotePath.slice(2))
        : remotePath,
    c = syncRootOf(description, t);
  if (!t.isAbsolute(a) || !t.isAbsolute(c)) return;
  let relativePath = t.relative(c, a);
  if (!y(t, relativePath)) return;
  let joined = posix_2.join(sessionDir, ...relativePath.split(t.sep));
  return y(i, i.relative(sessionDir, joined)) ? joined : void 0;
}
//@ chunk-gqez588q.js:2757-2886 placement
function syncRootOf(n, e) {
  return n.sync_root !== void 0 && e.isAbsolute(n.sync_root) && j(e, n.sync_root, n.working_dir)
    ? n.sync_root
    : n.working_dir;
}
//@ chunk-gqez588q.js:2886-2960 placement
function y(n, e) {
  return e !== "" && e.split(n.sep)[0] !== ".." && !n.isAbsolute(e);
}
//@ chunk-gqez588q.js:2960-3022 placement
function j(n, e, r) {
  let relativePath = n.relative(e, r);
  return relativePath === "" || y(n, relativePath);
}
/**
 * 比较两组输入在规范化与默认值意义下是否相同。
 */
//@ chunk-gqez588q.js:3022-3138 placement
function sameInputsModuloDefaults(n, e, r) {
  return (
    S(n).every(([i, t]) => isDeepStrictEqual(v(i, t, r), v(i, e[i], r))) &&
    S(e).every(([i, t]) => n[i] !== void 0 || t === !1)
  );
}
//@ chunk-gqez588q.js:3138-3235 placement
function v(n, e, r) {
  return n === "file_path" && typeof e === "string" && r === "darwin" ? e.normalize("NFC") : e;
}
//@ chunk-gqez588q.js:3235-3301 placement
function S(n) {
  return Object.entries(n).filter(([, e]) => e !== void 0);
}
//@ chunk-gqez588q.js:3301-3338 placement = getUnameSR (0.793)
function getUnameSR(n) {
  return n === "win32" ? win32 : posix;
}
/**
 * 从机器描述中提取路径事实：工作目录、主目录、镜像目录、平台，以及副本来源目录。
 */
//@ chunk-gqez588q.js:3338-3764 placement
function remoteDirFacts(n) {
  let e = getUnameSR(n.platform),
    copy_of = n.copy_of;
  return e.isAbsolute(n.working_dir)
    ? {
        workingDir: n.working_dir,
        homeDir: n.home_dir !== void 0 && e.isAbsolute(n.home_dir) ? n.home_dir : void 0,
        mirroredDir: syncRootOf(n, e),
        platform: n.platform,
        ...(copy_of !== void 0 &&
          getUnameSR(copy_of.platform).isAbsolute(copy_of.dir) && {
            copyOf: {
              workingDir: copy_of.dir,
              homeDir:
                copy_of.home_dir !== void 0 && getUnameSR(copy_of.platform).isAbsolute(copy_of.home_dir)
                  ? copy_of.home_dir
                  : void 0,
              mirroredDir: copy_of.dir,
              platform: copy_of.platform,
            },
          }),
      }
    : void 0;
}
/**
 * 判断远程目录类别：无公布目录、Windows 机器、Windows 会话或位于公布目录中。
 */
//@ chunk-gqez588q.js:3764-4003 placement
function remoteDirKind(n) {
  let e = n === void 0 ? void 0 : remoteDirFacts(n);
  if (e === void 0) return { kind: "no_announced_dir" };
  if (e.platform === "win32") return { kind: "windows_machine" };
  return getPlatform() === "windows"
    ? { kind: "windows_session" }
    : { kind: "in_announced_dir", dir: e.workingDir };
}
/**
 * 把输入的 file_path 解析为远程机器上的绝对路径。
 */
//@ chunk-gqez588q.js:4003-4123 placement
function resolveRemoteFilePathInput(n, e) {
  let file_path = n.file_path;
  if (typeof file_path !== "string") return n;
  let i = resolveRemotePath(file_path, e);
  return i === void 0 ? n : { ...n, file_path: i };
}
/**
 * 解析远程路径：处理 ~、空路径与相对路径，Windows 上拒绝其他盘符的相对路径。
 */
//@ chunk-gqez588q.js:4123-4456 placement
function resolveRemotePath(path, dirFacts) {
  let r = getUnameSR(dirFacts.platform),
    trimmed = path.trim();
  if (trimmed === "~" || trimmed.startsWith("~/"))
    return dirFacts.homeDir === void 0 ? void 0 : r.join(dirFacts.homeDir, trimmed.slice(2));
  if (trimmed === "") return r.normalize(dirFacts.workingDir);
  let t = p(trimmed, r);
  if (r.isAbsolute(t)) return r.normalize(t);
  let a = r === win32 ? g(t) : void 0;
  return a !== void 0 && a !== g(dirFacts.workingDir) ? void 0 : r.resolve(dirFacts.workingDir, t);
}
//@ chunk-gqez588q.js:4456-4527 placement
function g(n) {
  let match = /^[a-z]:/i.exec(n);
  return match === null ? void 0 : normalizeCaseForComparison(match[0]);
}
//@ chunk-gqez588q.js:4527-4667 placement
function normalizeWin32DevicePath(n, e) {
  let replaced = n.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, "");
  return /^\\(?!\\)/.test(replaced) ? win32.resolve(e, replaced) : replaced;
}
//@ chunk-gqez588q.js:4667-4898 placement
function stripMacVolumePrefix(n, e) {
  let parts = isSystemVolumePath(n).split("/");
  if (foldCase(parts[1] ?? "") === "volumes" && foldCase(parts[2] ?? "") === e)
    return stripMacVolumePrefix(["", ...parts.slice(3)].join("/") || "/", e);
  return ["tmp", "var", "etc"].includes(foldCase(parts[1] ?? ""))
    ? ["", "private", ...parts.slice(1)].join("/")
    : parts.join("/");
}
//@ chunk-gqez588q.js:4898-5023 placement
function macPathVariants(n) {
  let e = stripMacVolumePrefix(n, "macintosh hd"),
    [r, i = ""] = e.split("/").slice(1, 3).map(foldCase);
  return r === "volumes" && i !== "" ? [e, stripMacVolumePrefix(e, i)] : [e];
}
//@ chunk-gqez588q.js:5023-5144 placement
function stripProcRoot(n) {
  let match = /^\/proc\/(?:self|thread-self)\/root(?=\/|$)/.exec(n);
  return match === null ? n : stripProcRoot(n.slice(match[0].length) || "/");
}
//@ chunk-gqez588q.js:5144-5204 placement
function p(n, e) {
  return e === win32 && /^\/[a-z]\//i.test(n) ? B8(n) : n;
}

export {
  unsupportedFieldRefusal,
  uNt,
  stripTargetField,
  renameInputFields,
  SIMULATED_SED_EDIT_KEY,
  pickKnownFields,
  unrenameOutputFields,
  Lrn,
  mergeServingPolicy,
  RTe,
  remoteDirKind,
  remoteDirFacts,
  resolveRemoteFilePathInput,
  readBaselineForRemoteWrite,
  sameInputsModuloDefaults,
  cNt,
  normalizeWin32DevicePath,
  macPathVariants,
  stripProcRoot,
  getUnameSR,
  p,
  resolveRemotePath,
  g,
};
