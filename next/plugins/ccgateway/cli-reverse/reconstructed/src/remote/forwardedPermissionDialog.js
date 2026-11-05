/**
 * remote/forwardedPermissionDialog.ts
 *
 * 2.1.316 新增。转发来的权限对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { relative } from "path";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { INVALID_TOOL_NAME_TEXT } from "../components/permissions/consentRows.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { record, stringSchema, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import {
  uniqueDisplayNames,
  stripUnsafeChars,
  markBrokenSequences,
  sanitizeForDisplay,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { PERMISSION_PROMPT_DIALOG } from "../utils/agentContext.js";
import {
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  isAutoDenyKind,
  FILE_PERMISSION_CARD,
  BASH_PERMISSION_CARD,
  buildBashPermissionPayload,
} from "../components/permissions/permissionCardKinds.js";
import { classifyBashCommand } from "../utils/permissions/bashClassifier.js";
import { hasHostField } from "../bridge/deviceRegistration.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { FileEditTool } from "../tools/FileEditTool/FileEditTool.js";
import { isViolinWoodEnabledCached } from "../services/analytics/violinGates.js";
import { logError } from "../utils/log.js";
import { expandPath } from "../utils/path.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../utils/invisibleChars.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, getErrnoCode } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { hasRemoteCap, getRemoteCaps } from "./remoteMode.js";
import { withTimeout } from "../utils/sleep.js";
import { REMOTE_READ_MAX_BYTES } from "../services/remoteTools/remoteFileRead.js";
import { PERMISSION_RULE_SOURCES } from "../utils/permissions/permissions.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:231153-231157 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:231153", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:231157-231519 placement
/**
 * 转发来的权限请求无法在本终端展示时的三段文案：概括、短版、等待用户按 esc 的完整版。
 */
var REMOTE_PERMISSION_UNSHOWABLE_TEXTS =
  "The session asked a permission question that this terminal cannot show. If it still waits, esc stops its turn.";
var REMOTE_PERMISSION_UNSHOWABLE_SHORT =
  "The session asked a permission question that this terminal cannot show.";
var REMOTE_PERMISSION_UNSHOWABLE_WAITING =
  "The remote session is waiting for an answer to a permission question that this terminal cannot show. Nothing else can answer it. Press esc to stop the turn.";
//@ chunk-czq1j3j2.js:231519-231607 placement
function getStubToolForForwardedPermission(toolName, toolRegistry) {
  let resolvedName = typeof toolName === "string" ? toolName : INVALID_TOOL_NAME_TEXT;
  let tool = findTool(toolRegistry, resolvedName);
  if (tool) return tool;
  return makeStubToolForPermissionUI(resolvedName);
}
//@ chunk-czq1j3j2.js:231607-231630 placement
var MAX_PREVIEW_PARAM_LENGTH = 200000;
var MAX_PREVIEW_PARAM_ENTRIES = 1e4;
//@ chunk-czq1j3j2.js:231630-233027 placement
function makeStubToolForPermissionUI(toolName) {
  function throwStubCalled(method) {
    throw Error(
      `Stub tool ${toolName}.${method} called \u2014 stub exists only for permission UI rendering.`,
    );
  }
  return {
    name: toolName,
    isMcp: toolName.startsWith("mcp__"),
    isReadOnly: () => false,
    isConcurrencySafe: () => false,
    isEnabled: () => false,
    inputSchema: record(stringSchema(), unknown()),
    maxResultSizeChars: 0,
    userFacingName: () => toolName,
    description: async () => "",
    prompt: async () => throwStubCalled("prompt"),
    call: async () => throwStubCalled("call"),
    checkPermissions: async () => throwStubCalled("checkPermissions"),
    toAutoClassifierInput: () => "",
    mapToolResultToToolResultBlockParam: (result, toolUseId) => ({
      type: "tool_result",
      tool_use_id: toolUseId,
      content: "",
    }),
    renderToolUseMessage: (input) => {
      let entries = Object.entries(input);
      if (entries.length === 0) return "";
      if (entries.length > 3) throw Error("stub preview cannot render all parameters completely");
      for (let [key, value] of entries)
        if (
          key.length > MAX_PREVIEW_PARAM_LENGTH ||
          (typeof value === "string" && value.length > MAX_PREVIEW_PARAM_LENGTH) ||
          (Array.isArray(value) && value.length > MAX_PREVIEW_PARAM_ENTRIES) ||
          (typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            Object.keys(value).length > MAX_PREVIEW_PARAM_ENTRIES)
        )
          throw Error("stub preview cannot render an over-bound parameter");
      let uniqueNames = uniqueDisplayNames(entries.map(([key]) => key));
      return entries
        .map(([key, value]) => {
          let json = typeof value === "string" ? null : jsonStringify(value);
          if (json !== null && json.length > MAX_PREVIEW_PARAM_LENGTH)
            throw Error("stub preview cannot render an over-bound parameter");
          let displayText = typeof value === "string" ? stripUnsafeChars(value) : json;
          if (markBrokenSequences(displayText) !== displayText || markBrokenSequences(key) !== key)
            throw Error("stub preview cannot render a parameter whose display would drop code points");
          let renderedValue =
            typeof value === "string"
              ? jsonStringify(markBrokenSequences(displayText))
              : sanitizeForDisplay(json);
          return `${uniqueNames.get(key) ?? jsonStringify(sanitizeForDisplay(key))}: ${renderedValue}`;
        })
        .join(", ");
    },
  };
}
//@ chunk-czq1j3j2.js:233061-234599 placement
/**
 * 把云会话/远端 worker 发来的 can_use_tool 请求还原成本地权限对话框：找到同名工具或生成 stub 工具，渲染参数，无法渲染时提示 "deny unless expected"。
 */
async function buildForwardedPermissionDialog(args) {
  let tool = args.tool;
  let withText = {
    ...args,
    description: typeof args.description === "string" ? args.description : "",
  };
  let inputIsObject = typeof args.input === "object" && args.input !== null && !Array.isArray(args.input);
  let withRacer = {
    ...withText,
    hasExternalRacer: true,
  };
  if (!inputIsObject)
    return {
      dialog: PERMISSION_PROMPT_DIALOG,
      descriptor: {
        ...buildPermissionPromptPayload(withRacer),
        toolUseRenderFailed: true,
        renderedToolUseMessage: "parameters could not be rendered \u2014 deny unless expected",
      },
    };
  let bashClassification = classifyBashCommand(tool);
  let isBrowserDenied =
    bashClassification?.dialog.kind === BROWSER_PERMISSION_CARD.kind &&
    args.permissionResult.defaultToNo === true;
  if (bashClassification !== undefined && !isBrowserDenied)
    return {
      dialog: bashClassification.dialog,
      descriptor: bashClassification.build(withRacer),
    };
  if (isFileTool(tool)) {
    let toolInputPath = getToolInputPath(tool, args.input);
    if (toolInputPath !== null) {
      let heldCall =
        args.remoteWorkspace === true && isFileWriteOrEditTool(tool) && !args.signal?.aborted
          ? lookupForwardedTool({
              lookup: args.heldServedCall,
              tool,
              toolUseId: args.toolUseID,
              input: args.input,
              filePath: toolInputPath,
            })
          : undefined;
      let buildRemoteFileDescriptor = async () =>
        buildFilePermissionDescriptor({
          ...withText,
          filePath: toolInputPath,
          remoteWorkspace: args.remoteWorkspace === true,
          remoteOldContent:
            args.remoteWorkspace === true && isAutoDenyKind(tool) && !args.signal?.aborted
              ? await readRemoteFileForPreview(toolInputPath)
              : undefined,
        });
      let buildPlainFileDescriptor = () =>
        buildFilePermissionDescriptor({
          ...withText,
          filePath: toolInputPath,
          remoteWorkspace: true,
          remoteOldContent: undefined,
        });
      try {
        let { descriptor, outcome } =
          heldCall === undefined
            ? {
                descriptor: hasHostField(args.input)
                  ? await buildPlainFileDescriptor()
                  : await buildRemoteFileDescriptor(),
                outcome: undefined,
              }
            : heldCall.preview === "local"
              ? await localPreviewForHeldCall({
                  args: withText,
                  filePath: toolInputPath,
                  startCwd: heldCall.startCwd,
                })
              : {
                  descriptor: await buildPlainFileDescriptor(),
                  outcome: heldCall,
                };
        if (outcome !== undefined) logServedPreview(tool, outcome);
        return {
          dialog: FILE_PERMISSION_CARD,
          descriptor,
        };
      } catch {
        return {
          dialog: PERMISSION_PROMPT_DIALOG,
          descriptor: {
            ...buildPermissionPromptPayload(withRacer),
            toolUseRenderFailed: true,
            renderedToolUseMessage: "parameters could not be rendered \u2014 deny unless expected",
          },
        };
      }
    }
  }
  if (tool === BashTool)
    return {
      dialog: BASH_PERMISSION_CARD,
      descriptor: buildBashPermissionPayload({
        ...withText,
        classifierState: "none",
        toolPermissionContext: args.toolPermissionContext,
      }),
    };
  return {
    dialog: PERMISSION_PROMPT_DIALOG,
    descriptor: buildPermissionPromptPayload(withRacer),
  };
}
//@ chunk-czq1j3j2.js:234599-234637 placement
function isFileWriteOrEditTool(tool) {
  return tool === FileWriteTool || tool === FileEditTool;
}
//@ chunk-czq1j3j2.js:234637-234931 placement
function lookupForwardedTool(args) {
  if (args.lookup === undefined || !hasHostField(args.input) || !isViolinWoodEnabledCached()) return;
  try {
    let held = args.lookup({
      toolUseId: args.toolUseId,
      toolName: args.tool.name,
      input: args.input,
    });
    return held.held
      ? {
          preview: "local",
          startCwd: held.startCwd,
        }
      : {
          preview: "remote",
          reason: held.reason,
        };
  } catch (error) {
    logError(error);
    return {
      preview: "remote",
      reason: "lookup_error",
    };
  }
}
//@ chunk-czq1j3j2.js:234931-235715 placement
async function localPreviewForHeldCall(args) {
  let expandedPath = expandPath(args.filePath, String(args.startCwd));
  let localArgs = {
    ...args.args,
    input: {
      ...args.args.input,
      file_path: expandedPath,
    },
  };
  try {
    return {
      descriptor: {
        ...(await buildFilePermissionDescriptor({
          ...localArgs,
          filePath: expandedPath,
          remoteWorkspace: false,
        })),
        input: args.args.input,
        subtitle: stripInvisibleChars_3(relative(args.startCwd, expandedPath)),
        workingDir: args.startCwd,
      },
      outcome: {
        preview: "local",
        startCwd: args.startCwd,
      },
    };
  } catch (error) {
    logForDebugging(
      `buildForwardedPermissionDialog: local preview of a held call failed: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    let remoteDescriptor = {
      ...(await buildFilePermissionDescriptor({
        ...localArgs,
        filePath: expandedPath,
        remoteWorkspace: true,
        remoteOldContent: undefined,
      })),
      input: args.args.input,
    };
    let errnoCode = getErrnoCode(error);
    return {
      descriptor:
        remoteDescriptor.content.kind === "no-changes" && errnoCode !== undefined
          ? {
              ...remoteDescriptor,
              content: {
                kind: "no-changes",
                message: `This machine could not read the file (${errnoCode}) \u2014 approving will attempt the write anyway.`,
              },
            }
          : remoteDescriptor,
      outcome: {
        preview: "remote",
        reason: "local_read_failed",
      },
    };
  }
}
//@ chunk-czq1j3j2.js:235715-235858 placement
function logServedPreview(tool, outcome) {
  logEvent("tengu_remote_tool_served_preview", {
    tool: sanitizeToolNameForAnalytics(tool.name),
    preview: fromEnum(outcome.preview),
    reason: fromEnumOpt(outcome.preview === "remote" ? outcome.reason : undefined),
  });
}
//@ chunk-czq1j3j2.js:235858-235870 placement
var REMOTE_READ_FILE_TIMEOUT_MS = 1e4;
//@ chunk-czq1j3j2.js:235870-236302 placement
async function readRemoteFileForPreview(toolInputPath) {
  if (!hasRemoteCap("fileRead")) return;
  try {
    let response = await withTimeout(
      getRemoteCaps().sendControlRequest({
        subtype: "read_file",
        path: toolInputPath,
        max_bytes: REMOTE_READ_MAX_BYTES,
      }),
      REMOTE_READ_FILE_TIMEOUT_MS,
      "remote read_file timed out",
    );
    if (response.truncated === true) return;
    return response.contents;
  } catch (error) {
    let errorText = error instanceof Error ? error.message : String(error);
    if (errorText.includes("ENOENT") || errorText.includes("no such file")) return null;
    logForDebugging(
      `buildForwardedPermissionDialog: remote read_file failed for ${toolInputPath}: ${errorText}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-czq1j3j2.js:236302-236341 placement
function isPermissionRuleSource(source) {
  return PERMISSION_RULE_SOURCES.includes(source);
}
//@ chunk-czq1j3j2.js:236341-236373 placement
function toPrintablePermissionText(text) {
  return stripNonPrintable(stripAnsi(text));
}
export {
  toPrintablePermissionText,
  getStubToolForForwardedPermission,
  buildForwardedPermissionDialog,
  isPermissionRuleSource,
  REMOTE_PERMISSION_UNSHOWABLE_WAITING,
  REMOTE_PERMISSION_UNSHOWABLE_SHORT,
  REMOTE_PERMISSION_UNSHOWABLE_TEXTS,
};
