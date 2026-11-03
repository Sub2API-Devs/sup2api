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
import { randomUUID } from "crypto";
import { basename } from "path";
import { getPatchFromContents } from "../utils/diff.js";
import { logError } from "../utils/log.js";
import { getEditsForPatch, getPatchForEdits } from "../tools/FileEditTool/utils.js";
import { expandPath, isNotebookPath } from "../utils/path.js";
import { readFileChecked, isNotRegularFileError, isFileTooLargeError } from "../utils/fileRead.js";
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
import { isUncOrDevicePath } from "../utils/pathClassification.js";
import { isWslUncPath, isNetworkOrSpecialPath } from "../utils/networkPaths.js";
import { MAX_SETTINGS_FILE_BYTES } from "../utils/settings/settingsReview.js";
import { hasHostField } from "../bridge/deviceRegistration.js";
import { getGlobalConfig } from "../utils/config.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { logEvent } from "../services/analytics/index.js";
import { resetDenialStreakAfterUserApproval } from "../utils/permissions/permissions.js";

//@ chunk-s4bxxzsw.js:27106-27331 fingerprint = computeEditsFromContents (1)
function computeEditsFromContents(filePath, oldContent, newContent, editMode) {
  let singleHunk = editMode === "single";
  let patch = getPatchFromContents({
    filePath,
    oldContent,
    newContent,
    singleHunk,
  });
  if (patch.length === 0) return [];
  if (singleHunk && patch.length > 1)
    logError(Error(`Unexpected number of hunks: ${patch.length}. Expected 1 hunk.`));
  return getEditsForPatch(patch);
}
//@ chunk-s4bxxzsw.js:27331-28595 fingerprint = showDiffInIDE (0.919)
async function showDiffInIDE(file_path, edits, toolUseContext, tabName, y) {
  let isCleanedUp = false;
  let oldFilePath = expandPath(file_path);
  let oldContent = "";
  try {
    oldContent = (await readFileChecked(oldFilePath)).content;
  } catch (e) {
    if (!isENOENT(e) && !isNotRegularFileError(e)) throw e;
  }
  function cleanup() {
    if (toolUseContext.abortController.signal.aborted || y()) throw new AbortError();
  }
  cleanup();
  async function cleanup_2() {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try {
      await closeTabInIDE(tabName, ideClient);
    } catch (e) {
      logForDebugging(`Failed to close diff tab in IDE: ${e instanceof Error ? e.message : String(e)}`, {
        level: "error",
      });
    }
    process.off("beforeExit", cleanup_2);
    toolUseContext.abortController.signal.removeEventListener("abort", cleanup_2);
  }
  toolUseContext.abortController.signal.addEventListener("abort", cleanup_2);
  process.on("beforeExit", cleanup_2);
  let ideClient = hasAccessToIDEExtensionDiffFeature(toolUseContext.options.mcpClients);
  try {
    let { updatedFile } = getPatchForEdits({
      filePath: oldFilePath,
      fileContents: oldContent,
      edits,
    });
    if (!ideClient || ideClient.type !== "connected") throw Error("IDE client not available");
    let ideOldPath = oldFilePath;
    let ideRunningInWindows = ideClient.config.ideRunningInWindows === true;
    if (getPlatform() === "wsl" && ideRunningInWindows && env.WSL_DISTRO_NAME) {
      ideOldPath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toIDEPath(oldFilePath);
      cleanup();
    }
    let rpcResult = await callIdeRpc(
      "openDiff",
      {
        old_file_path: ideOldPath,
        new_file_path: ideOldPath,
        new_file_contents: updatedFile,
        tab_name: tabName,
      },
      ideClient,
    );
    let data = Array.isArray(rpcResult) ? rpcResult : [rpcResult];
    if (isSaveMessage(data)) {
      cleanup_2();
      return {
        oldContent,
        newContent: data[1].text,
        saved: true,
      };
    } else if (isClosedMessage(data)) {
      cleanup_2();
      return {
        oldContent,
        newContent: updatedFile,
        saved: false,
      };
    } else if (isRejectedMessage(data)) {
      cleanup_2();
      return {
        oldContent,
        newContent: oldContent,
        saved: false,
      };
    }
    throw Error("Not accepted");
  } catch (error) {
    if (!isAbortError(error))
      logForDebugging(
        `Failed to show diff in IDE: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
    cleanup_2();
    throw error;
  }
}
//@ chunk-s4bxxzsw.js:28595-28910 fingerprint = closeTabInIDE (0.67)
async function closeTabInIDE(tabName, ideClient) {
  try {
    if (!ideClient || ideClient.type !== "connected") throw Error("IDE client not available");
    await callIdeRpc(
      "close_tab",
      {
        tab_name: tabName,
      },
      ideClient,
    );
    logFeatureOk("ide_close_diff_tab");
  } catch (error) {
    logForDebugging(
      `Failed to close diff tab in IDE: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    logFeatureSad("ide_close_diff_tab", "ide_close_diff_tab_failed");
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
var IDE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._+()-]{0,63}$/;
//@ chunk-s4bxxzsw.js:29379-29447 layout
function markIdeSafe(ideName) {
  if (IDE_NAME_RE.test(ideName)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(ideName);
  return lit("nonconforming");
}
//@ chunk-s4bxxzsw.js:29447-29961 layout = areFileEditsInputsEquivalent (0.861)
/**
 * 把 Edit 或 Write 的工具输入转换为 {filePath, edits}；Write 读取旧文件作为 old_string。
 */
async function toolInputToFileEdits(input1, input2) {
  if (input1 === FileEditTool) {
    let n = FileEditTool.inputSchema.parse(input2);
    return {
      filePath: n.file_path,
      edits: [
        {
          old_string: n.old_string,
          new_string: n.new_string,
          replace_all: n.replace_all || false,
        },
      ],
    };
  }
  if (input1 === FileWriteTool) {
    let n = FileWriteTool.inputSchema.parse(input2);
    let s = expandPath(n.file_path);
    let fileContent = "";
    if (
      (!(isUncOrDevicePath(n.file_path) || isUncOrDevicePath(s)) ||
        isWslUncPath(n.file_path) ||
        isWslUncPath(s)) &&
      !isNetworkOrSpecialPath(n.file_path) &&
      !isNetworkOrSpecialPath(s)
    )
      try {
        fileContent = (await readFileChecked(s, MAX_SETTINGS_FILE_BYTES)).content;
      } catch (error) {
        if (isFileTooLargeError(error)) return null;
        if (!isENOENT(error) && !isNotRegularFileError(error)) throw error;
      }
    return {
      filePath: n.file_path,
      edits: [
        {
          old_string: fileContent,
          new_string: n.content,
          replace_all: false,
        },
      ],
    };
  }
  return null;
}
//@ chunk-s4bxxzsw.js:29961-30160 layout = getEditsForPatch (0.884)
/**
 * 把编辑结果写回 Edit/Write 工具输入（Edit 改 old/new/replace_all，Write 改 content）。
 */
function applyFirstEditToToolInput(tool, r, editsFromContents) {
  let s = editsFromContents[0];
  if (!s) return r;
  if (tool === FileEditTool)
    return {
      ...r,
      old_string: s.old_string,
      new_string: s.new_string,
      replace_all: s.replace_all || false,
    };
  if (tool === FileWriteTool)
    return {
      ...r,
      content: s.new_string,
    };
  return r;
}
//@ chunk-s4bxxzsw.js:30160-30661 layout
/**
 * 判断这次文件编辑/写入是否能在 IDE 中显示 diff：需 IDE 扩展支持、diffTool 为 auto、路径不受保护且不是 notebook；可以则返回 IDE 名、客户端、路径与编辑列表。
 */
async function getIdeDiffTarget(tool, input, context) {
  if (tool !== FileEditTool && tool !== FileWriteTool) return null;
  if (context.forRemoteExecution === true) return null;
  if (hasHostField(input)) return null;
  let mcpClients = context.options.mcpClients;
  if (!hasAccessToIDEExtensionDiffFeature_2(mcpClients)) return null;
  if (getGlobalConfig().diffTool !== "auto") return null;
  let y = await toolInputToFileEdits(tool, input);
  if (y === null) return null;
  let R = expandPath(y.filePath);
  if (
    ((isUncOrDevicePath(y.filePath) || isUncOrDevicePath(R)) &&
      !(isWslUncPath(y.filePath) || isWslUncPath(R))) ||
    isNetworkOrSpecialPath(y.filePath) ||
    isNetworkOrSpecialPath(R)
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
  if (e.permissionResult.localDisplayOnly === true)
    return {
      closeTab: () => {},
    };
  if (e.ctx.toolUseContext.forRemoteExecution === true || hasHostField(e.input))
    return {
      closeTab: () => {},
    };
  let {
    ctx,
    tool,
    input,
    permissionResult,
    permissionPromptStartTimeMs,
    eligibility,
    claim,
    notifyBridge,
    dismissAndTeardown,
    resolveOnce,
  } = e;
  let { filePath, edits, ideName, ideClient } = eligibility;
  let sliced = randomUUID().slice(0, 6);
  let tabName = `\u273B [Claude Code] ${basename(filePath)} (${sliced}) \u29C9`;
  let V = false;
  function showDiff() {
    if (V) return;
    V = true;
    closeTabInIDE(tabName, ideClient).catch((error) => {
      logForDebugging(`closeTabInIDE failed: ${error}`, {
        level: "error",
      });
    });
  }
  let q = {
    ideName: markIdeSafe(ideName),
    toolName: sanitizeToolNameForAnalytics(tool.name),
    editCount: edits.length,
  };
  logEvent("tengu_ext_will_show_diff", {});
  showDiffInIDE(filePath, edits, ctx.toolUseContext, tabName, () => V)
    .then(({ oldContent, newContent, saved }) => {
      let editsFromContents = computeEditsFromContents(filePath, oldContent, newContent, "single");
      let Q = {
        ...q,
        isNewFile: oldContent === "",
      };
      if (editsFromContents.length === 0) {
        if (V || !claim()) return;
        showDiff();
        logEvent("tengu_ext_diff_rejected", Q);
        logFeatureOk("ide_diff_view");
        notifyBridge({
          behavior: "deny",
          message: "User denied via IDE",
        });
        dismissAndTeardown();
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: false,
            },
          },
          {
            permissionPromptStartTimeMs,
          },
        );
        resolveOnce(ctx.cancelAndAbort(undefined));
        return;
      }
      if (V || !claim()) return;
      showDiff();
      if (permissionResult.denialLimitFallback !== undefined) {
        resetDenialStreakAfterUserApproval(ctx.toolUseContext);
        logFeatureOk("permission_auto_mode_denial_fallback", {
          autoDenied: false,
        });
      }
      let oe = applyFirstEditToToolInput(tool, input, editsFromContents);
      logEvent("tengu_ext_diff_accepted", Q);
      logFeatureOk("ide_diff_view");
      notifyBridge({
        behavior: "allow",
        updatedInput: oe,
        updatedPermissions: [],
      });
      dismissAndTeardown();
      ctx.logDecision(
        {
          decision: "accept",
          source: {
            type: "user",
            permanent: false,
          },
        },
        {
          permissionPromptStartTimeMs,
        },
      );
      resolveOnce(
        ctx.handleUserAllow(oe, [], {
          permissionPromptStartTimeMs,
          decisionReason: permissionResult.decisionReason,
          matchedAskRule: permissionResult.matchedAskRule,
          surface:
            saved && (ideClient?.config.type === "sse-ide" || ideClient?.config.type === "ws-ide")
              ? "ide"
              : undefined,
        }),
      );
    })
    .catch((error) => {
      if (V || ctx.toolUseContext.abortController.signal.aborted) return;
      logForDebugging(`IDE diff view failed: ${error instanceof Error ? error.message : String(error)}`, {
        level: "error",
      });
      logFeatureSad("ide_diff_view", "ide_diff_view_failed");
    });
  return {
    closeTab: showDiff,
  };
}
export { getIdeDiffTarget, useDiffInIDE };
