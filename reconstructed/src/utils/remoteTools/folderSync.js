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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
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
} from "path";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Ger, Wer } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { $r } from "../../bridge/deviceRegistration.js";

//@ chunk-e6aww6q8.js:1439950-1440034 placement
function L8n(e) {
  return e?.folder_relation === "separate_copy" && e.project_sync === "off";
}
//@ chunk-e6aww6q8.js:1440034-1440077 placement
var C9t = new SessionRootSlot(() => ({ engine: "no_engine" }));
//@ chunk-e6aww6q8.js:1440077-1440133 placement
function kYs(e) {
  return C9t.peek(e)?.engine ?? "no_engine";
}
//@ chunk-e6aww6q8.js:1440133-1440170 placement
function pUo(e, n) {
  C9t.of(e).engine = n;
}
//@ chunk-e6aww6q8.js:1440170-1440254 placement
function H8n(e) {
  return e?.project_sync === "two_way" || e?.project_sync === "upload_only";
}
/**
 * 没有同步引擎时把宿主描述的项目同步标为 off。
 */
//@ chunk-e6aww6q8.js:1440254-1440365 placement
function withProjectSyncOff(e, n) {
  return n === "no_engine" && H8n(e) ? { ...Uo(e, "sync_root", "folder_relation"), project_sync: "off" } : e;
}
/**
 * 文件在本地缺失时，提示可用远程机器上用户自己的项目副本读取。
 */
//@ chunk-e6aww6q8.js:1440365-1441401 placement
function separateCopyHint(e, n, r) {
  let s = Ger(r.session);
  if (!isRemoteToolForwardingEnabledCached() || r.remoteCall !== void 0 || (s !== null && s !== "kept"))
    return "";
  let h = relative_24(Wer(r.session), n);
  if (h === "" || h.startsWith("..") || isAbsolute_31(h)) return "";
  let mapped = r.toolState
      .get(ToolHostRegistry)
      .hosts()
      .filter((Z) => Z.kind === "remote" && (Z.source === "session" || Z.source === "bridge"))
      .map((Z) => ({ ...Z, description: withProjectSyncOff(Z.description, "no_engine") }))
      .map((Z) => Z),
    filtered = mapped.filter(
      (Z) =>
        Z.status === "online" &&
        Z.protocol.kind !== "incompatible" &&
        (Z.servedTools.has(e.name) || Z.servedTools.has(BASH_TOOL_NAME)),
    ),
    L =
      filtered.find((Z) => H8n(Z.description)) ??
      (mapped.length === 1 ? filtered.find((Z) => L8n(Z.description)) : void 0);
  if (L === void 0) return "";
  let G = `${h.replaceAll("\\", "/")} in its project folder (named in the attached-machines note)`,
    q = L.servedTools.has(e.name)
      ? `${e.name} with "${$r}": "${L.name}" on ${G}`
      : `${BASH_TOOL_NAME} with "${$r}": "${L.name}" (ls, cat, rg) on ${G}`;
  return ` ${L.name} holds the user's own separate copy of this project (nothing is synced between it and this session's checkout, and it may be at a different commit); if the file exists only in that copy, use ${q}.`;
}

export { separateCopyHint, pUo, kYs, H8n, withProjectSyncOff, L8n };
