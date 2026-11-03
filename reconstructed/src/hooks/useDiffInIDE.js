/**
 * hooks/useDiffInIDE.ts
 *
 * 在 IDE 中显示 diff：打开 diff 标签、等待保存/拒绝/关闭消息、计算编辑并清理标签。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDiffInIDE.ts
 * pieces: chunk-s4bxxzsw.js (12)
 * attribution: fingerprint 7, layout 5
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { basename, basename as basename_2 } from "path";
import { getPatchFromContents } from "../utils/diff.js";
import { logError } from "../utils/log.js";
import { getEditsForPatch, getPatchForEdits } from "../tools/FileEditTool/utils.js";
import { expandPath, isNotebookPath } from "../utils/path.js";
import { readFileChecked, bde, Cj } from "../utils/fileRead.js";
import { isENOENT, AbortError, isAbortError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { getPlatform } from "../utils/platform.js";
import { env } from "../utils/env.js";
import { WindowsToWSLConverter } from "../utils/idePathConversion.js";
import {
  callIdeRpc,
  hasAccessToIDEExtensionDiffFeature as hasAccessToIDEExtensionDiffFeature_2,
  hasAccessToIDEExtensionDiffFeature_2 as hasAccessToIDEExtensionDiffFeature_2_2,
} from "../utils/ide.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { FileEditTool } from "../tools/FileEditTool/FileEditTool.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { Qn } from "../utils/pathClassification.js";
import { isWslUncPath, n_ } from "../utils/networkPaths.js";
import { rnt } from "../utils/settings/settingsReview.js";
import { Cf } from "../bridge/deviceRegistration.js";
import { getGlobalConfig } from "../utils/config.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { logEvent } from "../services/analytics/index.js";
import { resetDenialStreakAfterUserApproval } from "../utils/permissions/permissions.js";

//@ chunk-s4bxxzsw.js:27106-27331 fingerprint = computeEditsFromContents (1)
function computeEditsFromContents(filePath, oldContent, newContent, editMode) {
  let singleHunk = editMode === "single",
    patch = getPatchFromContents({
      filePath: filePath,
      oldContent: oldContent,
      newContent: newContent,
      singleHunk: singleHunk,
    });
  if (patch.length === 0) return [];
  if (singleHunk && patch.length > 1)
    logError(Error(`Unexpected number of hunks: ${patch.length}. Expected 1 hunk.`));
  return getEditsForPatch(patch);
}
//@ chunk-s4bxxzsw.js:27331-28595 fingerprint = showDiffInIDE (0.919)
async function showDiffInIDE(e, r, n, s, y) {
  let R = !1,
    oldFilePath = expandPath(e),
    oldContent = "";
  try {
    oldContent = (await readFileChecked(oldFilePath)).content;
  } catch (error) {
    if (!isENOENT(error) && !bde(error)) throw error;
  }
  function cleanup() {
    if (n.abortController.signal.aborted || y()) throw new AbortError();
  }
  cleanup();
  async function k() {
    if (R) return;
    R = !0;
    try {
      await closeTabInIDE(s, ideClient);
    } catch (error) {
      logForDebugging(
        `Failed to close diff tab in IDE: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
    }
    (process.off("beforeExit", k), n.abortController.signal.removeEventListener("abort", k));
  }
  (n.abortController.signal.addEventListener("abort", k), process.on("beforeExit", k));
  let ideClient = hasAccessToIDEExtensionDiffFeature(n.options.mcpClients);
  try {
    let { updatedFile: updatedFile } = getPatchForEdits({
      filePath: oldFilePath,
      fileContents: oldContent,
      edits: r,
    });
    if (!ideClient || ideClient.type !== "connected") throw Error("IDE client not available");
    let ideOldPath = oldFilePath,
      ideRunningInWindows = ideClient.config.ideRunningInWindows === !0;
    if (getPlatform() === "wsl" && ideRunningInWindows && env.WSL_DISTRO_NAME)
      ((ideOldPath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toIDEPath(oldFilePath)), cleanup());
    let rpcResult = await callIdeRpc(
        "openDiff",
        { old_file_path: ideOldPath, new_file_path: ideOldPath, new_file_contents: updatedFile, tab_name: s },
        ideClient,
      ),
      data = Array.isArray(rpcResult) ? rpcResult : [rpcResult];
    if (isSaveMessage(data)) return (k(), { oldContent: oldContent, newContent: data[1].text, saved: !0 });
    else if (isClosedMessage(data))
      return (k(), { oldContent: oldContent, newContent: updatedFile, saved: !1 });
    else if (isRejectedMessage(data))
      return (k(), { oldContent: oldContent, newContent: oldContent, saved: !1 });
    throw Error("Not accepted");
  } catch (error) {
    if (!isAbortError(error))
      logForDebugging(
        `Failed to show diff in IDE: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
    throw (k(), error);
  }
}
//@ chunk-s4bxxzsw.js:28595-28910 fingerprint = closeTabInIDE (0.67)
async function closeTabInIDE(tabName, ideClient) {
  try {
    if (!ideClient || ideClient.type !== "connected") throw Error("IDE client not available");
    (await callIdeRpc("close_tab", { tab_name: tabName }, ideClient), logFeatureOk("ide_close_diff_tab"));
  } catch (error) {
    (logForDebugging(
      `Failed to close diff tab in IDE: ${error instanceof Error ? error.message : String(error)}`,
      { level: "error" },
    ),
      logFeatureSad("ide_close_diff_tab", "ide_close_diff_tab_failed"));
  }
}
//@ chunk-s4bxxzsw.js:28910-29062 fingerprint = isClosedMessage (1)
function isClosedMessage(data) {
  return (
    Array.isArray(data) &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    "type" in data[0] &&
    data[0].type === "text" &&
    "text" in data[0] &&
    data[0].text === "TAB_CLOSED"
  );
}
//@ chunk-s4bxxzsw.js:29062-29217 fingerprint = isRejectedMessage (1)
function isRejectedMessage(data) {
  return (
    Array.isArray(data) &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    "type" in data[0] &&
    data[0].type === "text" &&
    "text" in data[0] &&
    data[0].text === "DIFF_REJECTED"
  );
}
//@ chunk-s4bxxzsw.js:29217-29332 fingerprint = isSaveMessage (1)
function isSaveMessage(data) {
  return (
    Array.isArray(data) &&
    data[0]?.type === "text" &&
    data[0].text === "FILE_SAVED" &&
    typeof data[1].text === "string"
  );
}
//@ chunk-s4bxxzsw.js:29332-29379 layout
var Bt = /^[A-Za-z0-9][A-Za-z0-9 ._+()-]{0,63}$/;
//@ chunk-s4bxxzsw.js:29379-29447 layout
function zo(e) {
  if (Bt.test(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("nonconforming");
}
/**
 * 把 Edit 或 Write 的工具输入转换为 {filePath, edits}；Write 读取旧文件作为 old_string。
 */
//@ chunk-s4bxxzsw.js:29447-29961 layout = areFileEditsInputsEquivalent (0.861)
async function toolInputToFileEdits(input1, input2) {
  if (input1 === FileEditTool) {
    let parse = FileEditTool.inputSchema.parse(input2);
    return {
      filePath: parse.file_path,
      edits: [
        { old_string: parse.old_string, new_string: parse.new_string, replace_all: parse.replace_all || !1 },
      ],
    };
  }
  if (input1 === FileWriteTool) {
    let parse = FileWriteTool.inputSchema.parse(input2),
      s = expandPath(parse.file_path),
      fileContent = "";
    if (
      (!(Qn(parse.file_path) || Qn(s)) || isWslUncPath(parse.file_path) || isWslUncPath(s)) &&
      !n_(parse.file_path) &&
      !n_(s)
    )
      try {
        fileContent = (await readFileChecked(s, rnt)).content;
      } catch (error) {
        if (Cj(error)) return null;
        if (!isENOENT(error) && !bde(error)) throw error;
      }
    return {
      filePath: parse.file_path,
      edits: [{ old_string: fileContent, new_string: parse.content, replace_all: !1 }],
    };
  }
  return null;
}
/**
 * 把编辑结果写回 Edit/Write 工具输入（Edit 改 old/new/replace_all，Write 改 content）。
 */
//@ chunk-s4bxxzsw.js:29961-30160 layout = getEditsForPatch (0.884)
function applyFirstEditToToolInput(e, r, n) {
  let s = n[0];
  if (!s) return r;
  if (e === FileEditTool)
    return { ...r, old_string: s.old_string, new_string: s.new_string, replace_all: s.replace_all || !1 };
  if (e === FileWriteTool) return { ...r, content: s.new_string };
  return r;
}
/**
 * 判断这次文件编辑/写入是否能在 IDE 中显示 diff：需 IDE 扩展支持、diffTool 为 auto、路径不受保护且不是 notebook；可以则返回 IDE 名、客户端、路径与编辑列表。
 */
//@ chunk-s4bxxzsw.js:30160-30661 layout
async function getIdeDiffTarget(tool, input, context) {
  if (tool !== FileEditTool && tool !== FileWriteTool) return null;
  if (context.forRemoteExecution === !0) return null;
  if (Cf(input)) return null;
  let mcpClients = context.options.mcpClients;
  if (!hasAccessToIDEExtensionDiffFeature_2(mcpClients)) return null;
  if (getGlobalConfig().diffTool !== "auto") return null;
  let y = await toolInputToFileEdits(tool, input);
  if (y === null) return null;
  let R = expandPath(y.filePath);
  if (
    ((Qn(y.filePath) || Qn(R)) && !(isWslUncPath(y.filePath) || isWslUncPath(R))) ||
    n_(y.filePath) ||
    n_(R)
  )
    return null;
  if (isNotebookPath(y.filePath) || isNotebookPath(R)) return null;
  let C = hasAccessToIDEExtensionDiffFeature(mcpClients);
  if (!C) return null;
  return {
    ideName: hasAccessToIDEExtensionDiffFeature_2_2(mcpClients) ?? "IDE",
    ideClient: C,
    filePath: y.filePath,
    edits: y.edits,
  };
}
//@ chunk-s4bxxzsw.js:30661-32505 fingerprint = useDiffInIDE (0.36)
function useDiffInIDE(e) {
  if (e.permissionResult.localDisplayOnly === !0) return { closeTab: () => {} };
  if (e.ctx.toolUseContext.forRemoteExecution === !0 || Cf(e.input)) return { closeTab: () => {} };
  let {
      ctx: ctx,
      tool: tool,
      input: input,
      permissionResult: permissionResult,
      permissionPromptStartTimeMs: permissionPromptStartTimeMs,
      eligibility: eligibility,
      claim: claim,
      notifyBridge: notifyBridge,
      dismissAndTeardown: dismissAndTeardown,
      resolveOnce: resolveOnce,
    } = e,
    { filePath: filePath, edits: edits, ideName: ideName, ideClient: ideClient } = eligibility,
    sliced = randomUUID().slice(0, 6),
    E = `\u273B [Claude Code] ${basename_2(filePath)} (${sliced}) \u29C9`,
    V = !1;
  function showDiff() {
    if (V) return;
    ((V = !0),
      closeTabInIDE(E, ideClient).catch((M) => {
        logForDebugging(`closeTabInIDE failed: ${M}`, { level: "error" });
      }));
  }
  let q = {
    ideName: zo(ideName),
    toolName: sanitizeToolNameForAnalytics(tool.name),
    editCount: edits.length,
  };
  return (
    logEvent("tengu_ext_will_show_diff", {}),
    showDiffInIDE(filePath, edits, ctx.toolUseContext, E, () => V)
      .then(({ oldContent: oldContent, newContent: newContent, saved: saved }) => {
        let ke = computeEditsFromContents(filePath, oldContent, newContent, "single"),
          Q = { ...q, isNewFile: oldContent === "" };
        if (ke.length === 0) {
          if (V || !claim()) return;
          (showDiff(),
            logEvent("tengu_ext_diff_rejected", Q),
            logFeatureOk("ide_diff_view"),
            notifyBridge({ behavior: "deny", message: "User denied via IDE" }),
            dismissAndTeardown(),
            ctx.logDecision(
              { decision: "reject", source: { type: "user_reject", hasFeedback: !1 } },
              { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
            ),
            resolveOnce(ctx.cancelAndAbort(void 0)));
          return;
        }
        if (V || !claim()) return;
        if ((showDiff(), permissionResult.denialLimitFallback !== void 0))
          (resetDenialStreakAfterUserApproval(ctx.toolUseContext),
            logFeatureOk("permission_auto_mode_denial_fallback", { autoDenied: !1 }));
        let oe = applyFirstEditToToolInput(tool, input, ke);
        (logEvent("tengu_ext_diff_accepted", Q),
          logFeatureOk("ide_diff_view"),
          notifyBridge({ behavior: "allow", updatedInput: oe, updatedPermissions: [] }),
          dismissAndTeardown(),
          ctx.logDecision(
            { decision: "accept", source: { type: "user", permanent: !1 } },
            { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
          ),
          resolveOnce(
            ctx.handleUserAllow(oe, [], {
              permissionPromptStartTimeMs: permissionPromptStartTimeMs,
              decisionReason: permissionResult.decisionReason,
              matchedAskRule: permissionResult.matchedAskRule,
              surface:
                saved && (ideClient?.config.type === "sse-ide" || ideClient?.config.type === "ws-ide")
                  ? "ide"
                  : void 0,
            }),
          ));
      })
      .catch((M) => {
        if (V || ctx.toolUseContext.abortController.signal.aborted) return;
        (logForDebugging(`IDE diff view failed: ${M instanceof Error ? M.message : String(M)}`, {
          level: "error",
        }),
          logFeatureSad("ide_diff_view", "ide_diff_view_failed"));
      }),
    { closeTab: showDiff }
  );
}

export { getIdeDiffTarget, useDiffInIDE };
