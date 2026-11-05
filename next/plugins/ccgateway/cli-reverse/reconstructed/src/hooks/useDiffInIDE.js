/**
 * hooks/useDiffInIDE.ts
 *
 * 在 IDE 中显示 diff：打开 diff 标签、等待保存/拒绝/关闭消息、计算编辑并清理标签。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDiffInIDE.ts
 * pieces: chunk-g4tsxwy3.js (12)
 * attribution: fingerprint 7, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-g4tsxwy3.js:27278-27503 fingerprint (2.1.88 match: computeEditsFromContents, 1)
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
//@ chunk-g4tsxwy3.js:27503-28767 fingerprint (2.1.88 match: showDiffInIDE, 0.917)
async function showDiffInIDE(file_path, edits, toolUseContext, tabName, isCleanedUp) {
  let isCleanedUp_2 = false;
  let oldFilePath = expandPath(file_path);
  let oldContent = "";
  try {
    oldContent = (await readFileChecked(oldFilePath)).content;
  } catch (e) {
    if (!isENOENT(e) && !isNotRegularFileError(e)) throw e;
  }
  function cleanup() {
    if (toolUseContext.abortController.signal.aborted || isCleanedUp()) throw new AbortError();
  }
  cleanup();
  async function cleanup_2() {
    if (isCleanedUp_2) return;
    isCleanedUp_2 = true;
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
//@ chunk-g4tsxwy3.js:28767-29082 fingerprint (2.1.88 match: closeTabInIDE, 0.67)
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
//@ chunk-g4tsxwy3.js:29082-29234 fingerprint (2.1.88 match: isClosedMessage, 1)
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
//@ chunk-g4tsxwy3.js:29234-29389 fingerprint (2.1.88 match: isRejectedMessage, 1)
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
//@ chunk-g4tsxwy3.js:29389-29504 fingerprint (2.1.88 match: isSaveMessage, 1)
function isSaveMessage(data) {
  return (
    Array.isArray(data) &&
    data[0]?.type === "text" &&
    data[0].text === "FILE_SAVED" &&
    typeof data[1].text === "string"
  );
}
//@ chunk-g4tsxwy3.js:29504-29551 layout
var IDE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._+()-]{0,63}$/;
//@ chunk-g4tsxwy3.js:29551-29619 layout
function markIdeSafe(ideName) {
  if (IDE_NAME_RE.test(ideName)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(ideName);
  return lit("nonconforming");
}
//@ chunk-g4tsxwy3.js:29619-30133 layout (2.1.88 match: areFileEditsInputsEquivalent, 0.862)
/**
 * 把 Edit 或 Write 的工具输入转换为 {filePath, edits}；Write 读取旧文件作为 old_string。
 */
async function toolInputToFileEdits(input1, input2) {
  if (input1 === FileEditTool) {
    let parsedInput = FileEditTool.inputSchema.parse(input2);
    return {
      filePath: parsedInput.file_path,
      edits: [
        {
          old_string: parsedInput.old_string,
          new_string: parsedInput.new_string,
          replace_all: parsedInput.replace_all || false,
        },
      ],
    };
  }
  if (input1 === FileWriteTool) {
    let parsedInput = FileWriteTool.inputSchema.parse(input2);
    let absolutePath = expandPath(parsedInput.file_path);
    let fileContent = "";
    if (
      (!(isUncOrDevicePath(parsedInput.file_path) || isUncOrDevicePath(absolutePath)) ||
        isWslUncPath(parsedInput.file_path) ||
        isWslUncPath(absolutePath)) &&
      !isNetworkOrSpecialPath(parsedInput.file_path) &&
      !isNetworkOrSpecialPath(absolutePath)
    )
      try {
        fileContent = (await readFileChecked(absolutePath, MAX_SETTINGS_FILE_BYTES)).content;
      } catch (error) {
        if (isFileTooLargeError(error)) return null;
        if (!isENOENT(error) && !isNotRegularFileError(error)) throw error;
      }
    return {
      filePath: parsedInput.file_path,
      edits: [
        {
          old_string: fileContent,
          new_string: parsedInput.content,
          replace_all: false,
        },
      ],
    };
  }
  return null;
}
//@ chunk-g4tsxwy3.js:30133-30332 layout (2.1.88 match: getEditsForPatch, 0.885)
/**
 * 把编辑结果写回 Edit/Write 工具输入（Edit 改 old/new/replace_all，Write 改 content）。
 */
function applyFirstEditToToolInput(tool, input, editsFromContents) {
  let firstEdit = editsFromContents[0];
  if (!firstEdit) return input;
  if (tool === FileEditTool)
    return {
      ...input,
      old_string: firstEdit.old_string,
      new_string: firstEdit.new_string,
      replace_all: firstEdit.replace_all || false,
    };
  if (tool === FileWriteTool)
    return {
      ...input,
      content: firstEdit.new_string,
    };
  return input;
}
//@ chunk-g4tsxwy3.js:30332-30833 layout
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
  let fileEdits = await toolInputToFileEdits(tool, input);
  if (fileEdits === null) return null;
  let absolutePath = expandPath(fileEdits.filePath);
  if (
    ((isUncOrDevicePath(fileEdits.filePath) || isUncOrDevicePath(absolutePath)) &&
      !(isWslUncPath(fileEdits.filePath) || isWslUncPath(absolutePath))) ||
    isNetworkOrSpecialPath(fileEdits.filePath) ||
    isNetworkOrSpecialPath(absolutePath)
  )
    return null;
  if (isNotebookPath(fileEdits.filePath) || isNotebookPath(absolutePath)) return null;
  let ideClient = hasAccessToIDEExtensionDiffFeature(mcpClients);
  if (!ideClient) return null;
  return {
    ideName: hasAccessToIDEExtensionDiffFeature_2_2(mcpClients) ?? "IDE",
    ideClient,
    filePath: fileEdits.filePath,
    edits: fileEdits.edits,
  };
}
//@ chunk-g4tsxwy3.js:30833-32677 fingerprint (2.1.88 match: useDiffInIDE, 0.364)
function useDiffInIDE(params) {
  if (params.permissionResult.localDisplayOnly === true)
    return {
      closeTab: () => {},
    };
  if (params.ctx.toolUseContext.forRemoteExecution === true || hasHostField(params.input))
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
  } = params;
  let { filePath, edits, ideName, ideClient } = eligibility;
  let sliced = randomUUID().slice(0, 6);
  let tabName = `\u273B [Claude Code] ${basename(filePath)} (${sliced}) \u29C9`;
  let isClosed = false;
  function showDiff() {
    if (isClosed) return;
    isClosed = true;
    closeTabInIDE(tabName, ideClient).catch((error) => {
      logForDebugging(`closeTabInIDE failed: ${error}`, {
        level: "error",
      });
    });
  }
  let diffFields = {
    ideName: markIdeSafe(ideName),
    toolName: sanitizeToolNameForAnalytics(tool.name),
    editCount: edits.length,
  };
  logEvent("tengu_ext_will_show_diff", {});
  showDiffInIDE(filePath, edits, ctx.toolUseContext, tabName, () => isClosed)
    .then(({ oldContent, newContent, saved }) => {
      let editsFromContents = computeEditsFromContents(filePath, oldContent, newContent, "single");
      let eventFields = {
        ...diffFields,
        isNewFile: oldContent === "",
      };
      if (editsFromContents.length === 0) {
        if (isClosed || !claim()) return;
        showDiff();
        logEvent("tengu_ext_diff_rejected", eventFields);
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
      if (isClosed || !claim()) return;
      showDiff();
      if (permissionResult.denialLimitFallback !== undefined) {
        resetDenialStreakAfterUserApproval(ctx.toolUseContext);
        logFeatureOk("permission_auto_mode_denial_fallback", {
          autoDenied: false,
        });
      }
      let updatedInput = applyFirstEditToToolInput(tool, input, editsFromContents);
      logEvent("tengu_ext_diff_accepted", eventFields);
      logFeatureOk("ide_diff_view");
      notifyBridge({
        behavior: "allow",
        updatedInput,
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
        ctx.handleUserAllow(updatedInput, [], {
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
      if (isClosed || ctx.toolUseContext.abortController.signal.aborted) return;
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
