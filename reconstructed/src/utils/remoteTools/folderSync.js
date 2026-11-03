/**
 * utils/remoteTools/folderSync.ts
 *
 * 2.1.316 新增：远程工具文件夹同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { relative, isAbsolute } from "path";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { taskCopyClearedAt, taskCwd } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";

//@ chunk-e6aww6q8.js:1439950-1440034 placement
/**
 * isSeparateCopyNoSync：独立副本且关闭项目同步。
 */
function isSeparateCopyNoSync(description) {
  return description?.folder_relation === "separate_copy" && description.project_sync === "off";
}
//@ chunk-e6aww6q8.js:1440034-1440077 placement
var folderSyncSlot = new SessionRootSlot(() => ({
  engine: "no_engine",
}));
//@ chunk-e6aww6q8.js:1440077-1440133 placement
/**
 * folderSyncEngine：目录同步引擎。
 */
function folderSyncEngine(session) {
  return folderSyncSlot.peek(session)?.engine ?? "no_engine";
}
//@ chunk-e6aww6q8.js:1440133-1440170 placement
/**
 * setFolderSyncEngine：设置目录同步引擎。
 */
function setFolderSyncEngine(rootSession, engine) {
  folderSyncSlot.of(rootSession).engine = engine;
}
//@ chunk-e6aww6q8.js:1440170-1440254 placement
/**
 * isSyncableProject：双向或仅上传的同步项目。
 */
function isSyncableProject(description) {
  return description?.project_sync === "two_way" || description?.project_sync === "upload_only";
}
//@ chunk-e6aww6q8.js:1440254-1440365 placement
/**
 * 没有同步引擎时把宿主描述的项目同步标为 off。
 */
function withProjectSyncOff(description, n) {
  return n === "no_engine" && isSyncableProject(description)
    ? {
        ...Uo(description, "sync_root", "folder_relation"),
        project_sync: "off",
      }
    : description;
}
//@ chunk-e6aww6q8.js:1440365-1441401 placement
/**
 * 文件在本地缺失时，提示可用远程机器上用户自己的项目副本读取。
 */
function separateCopyHint(e, n, r) {
  let s = taskCopyClearedAt(r.session);
  if (!isRemoteToolForwardingEnabledCached() || r.remoteCall !== undefined || (s !== null && s !== "kept"))
    return "";
  let h = relative(taskCwd(r.session), n);
  if (h === "" || h.startsWith("..") || isAbsolute(h)) return "";
  let mapped = r.toolState
    .get(ToolHostRegistry)
    .hosts()
    .filter((Z) => Z.kind === "remote" && (Z.source === "session" || Z.source === "bridge"))
    .map((Z) => ({
      ...Z,
      description: withProjectSyncOff(Z.description, "no_engine"),
    }))
    .map((Z) => Z);
  let filtered = mapped.filter(
    (Z) =>
      Z.status === "online" &&
      Z.protocol.kind !== "incompatible" &&
      (Z.servedTools.has(e.name) || Z.servedTools.has(BASH_TOOL_NAME)),
  );
  let L =
    filtered.find((Z) => isSyncableProject(Z.description)) ??
    (mapped.length === 1 ? filtered.find((Z) => isSeparateCopyNoSync(Z.description)) : undefined);
  if (L === undefined) return "";
  let G = `${h.replaceAll("\\", "/")} in its project folder (named in the attached-machines note)`;
  let q = L.servedTools.has(e.name)
    ? `${e.name} with "${HOST_TOOL_INPUT_FIELD}": "${L.name}" on ${G}`
    : `${BASH_TOOL_NAME} with "${HOST_TOOL_INPUT_FIELD}": "${L.name}" (ls, cat, rg) on ${G}`;
  return ` ${L.name} holds the user's own separate copy of this project (nothing is synced between it and this session's checkout, and it may be at a different commit); if the file exists only in that copy, use ${q}.`;
}
export {
  separateCopyHint,
  setFolderSyncEngine,
  folderSyncEngine,
  isSyncableProject,
  withProjectSyncOff,
  isSeparateCopyNoSync,
};
