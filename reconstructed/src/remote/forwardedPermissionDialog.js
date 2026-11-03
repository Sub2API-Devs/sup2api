/**
 * remote/forwardedPermissionDialog.ts
 *
 * 2.1.316 新增。转发来的权限对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
 */
import { relative } from "path";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { INVALID_TOOL_NAME_TEXT } from "../utils/deepFreezePlainData.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { record, string, unknown } from "../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-18hwfzwa.js:226114-226118 placement
init_react_production();
//@ chunk-18hwfzwa.js:226118-226480 placement
/**
 * 转发来的权限请求无法在本终端展示时的三段文案：概括、短版、等待用户按 esc 的完整版。
 */
var REMOTE_PERMISSION_UNSHOWABLE_TEXTS =
  "The session asked a permission question that this terminal cannot show. If it still waits, esc stops its turn.";
var REMOTE_PERMISSION_UNSHOWABLE_SHORT =
  "The session asked a permission question that this terminal cannot show.";
var REMOTE_PERMISSION_UNSHOWABLE_WAITING =
  "The remote session is waiting for an answer to a permission question that this terminal cannot show. Nothing else can answer it. Press esc to stop the turn.";
//@ chunk-18hwfzwa.js:226480-226568 placement
function getStubToolForForwardedPermission(toolName, toolRegistry) {
  let D = typeof toolName === "string" ? toolName : INVALID_TOOL_NAME_TEXT;
  let tool = findTool(toolRegistry, D);
  if (tool) return tool;
  return makeStubToolForPermissionUI(D);
}
//@ chunk-18hwfzwa.js:226568-226591 placement
var MAX_PREVIEW_PARAM_LENGTH = 200000;
var MAX_PREVIEW_PARAM_ENTRIES = 1e4;
//@ chunk-18hwfzwa.js:226591-227988 placement
function makeStubToolForPermissionUI(h) {
  function x(D) {
    throw Error(`Stub tool ${h}.${D} called \u2014 stub exists only for permission UI rendering.`);
  }
  return {
    name: h,
    isMcp: h.startsWith("mcp__"),
    isReadOnly: () => false,
    isConcurrencySafe: () => false,
    isEnabled: () => false,
    inputSchema: record(string(), unknown()),
    maxResultSizeChars: 0,
    userFacingName: () => h,
    description: async () => "",
    prompt: async () => x("prompt"),
    call: async () => x("call"),
    checkPermissions: async () => x("checkPermissions"),
    toAutoClassifierInput: () => "",
    mapToolResultToToolResultBlockParam: (D, toolUseId) => ({
      type: "tool_result",
      tool_use_id: toolUseId,
      content: "",
    }),
    renderToolUseMessage: (D) => {
      let entries = Object.entries(D);
      if (entries.length === 0) return "";
      if (entries.length > 3) throw Error("stub preview cannot render all parameters completely");
      for (let [ke, Re] of entries)
        if (
          ke.length > MAX_PREVIEW_PARAM_LENGTH ||
          (typeof Re === "string" && Re.length > MAX_PREVIEW_PARAM_LENGTH) ||
          (Array.isArray(Re) && Re.length > MAX_PREVIEW_PARAM_ENTRIES) ||
          (typeof Re === "object" &&
            Re !== null &&
            !Array.isArray(Re) &&
            Object.keys(Re).length > MAX_PREVIEW_PARAM_ENTRIES)
        )
          throw Error("stub preview cannot render an over-bound parameter");
      let ee = uniqueDisplayNames(entries.map(([ke]) => ke));
      return entries
        .map(([ke, Re]) => {
          let Be = typeof Re === "string" ? null : jsonStringify(Re);
          if (Be !== null && Be.length > MAX_PREVIEW_PARAM_LENGTH)
            throw Error("stub preview cannot render an over-bound parameter");
          let He = typeof Re === "string" ? stripUnsafeChars(Re) : Be;
          if (markBrokenSequences(He) !== He || markBrokenSequences(ke) !== ke)
            throw Error("stub preview cannot render a parameter whose display would drop code points");
          let We = typeof Re === "string" ? jsonStringify(markBrokenSequences(He)) : sanitizeForDisplay(Be);
          return `${ee.get(ke) ?? jsonStringify(sanitizeForDisplay(ke))}: ${We}`;
        })
        .join(", ");
    },
  };
}
//@ chunk-18hwfzwa.js:228022-229560 placement
/**
 * 把云会话/远端 worker 发来的 can_use_tool 请求还原成本地权限对话框：找到同名工具或生成 stub 工具，渲染参数，无法渲染时提示 "deny unless expected"。
 */
async function buildForwardedPermissionDialog(h) {
  let tool = h.tool;
  let D = {
    ...h,
    description: typeof h.description === "string" ? h.description : "",
  };
  let L = typeof h.input === "object" && h.input !== null && !Array.isArray(h.input);
  let ee = {
    ...D,
    hasExternalRacer: true,
  };
  if (!L)
    return {
      dialog: PERMISSION_PROMPT_DIALOG,
      descriptor: {
        ...buildPermissionPromptPayload(ee),
        toolUseRenderFailed: true,
        renderedToolUseMessage: "parameters could not be rendered \u2014 deny unless expected",
      },
    };
  let ke = classifyBashCommand(tool);
  let Re = ke?.dialog.kind === BROWSER_PERMISSION_CARD.kind && h.permissionResult.defaultToNo === true;
  if (ke !== undefined && !Re)
    return {
      dialog: ke.dialog,
      descriptor: ke.build(ee),
    };
  if (isFileTool(tool)) {
    let toolInputPath = getToolInputPath(tool, h.input);
    if (toolInputPath !== null) {
      let He =
        h.remoteWorkspace === true && isFileWriteOrEditTool(tool) && !h.signal?.aborted
          ? lookupForwardedTool({
              lookup: h.heldServedCall,
              tool,
              toolUseId: h.toolUseID,
              input: h.input,
              filePath: toolInputPath,
            })
          : undefined;
      let We = async () =>
        buildFilePermissionDescriptor({
          ...D,
          filePath: toolInputPath,
          remoteWorkspace: h.remoteWorkspace === true,
          remoteOldContent:
            h.remoteWorkspace === true && isAutoDenyKind(tool) && !h.signal?.aborted
              ? await readRemoteFileForPreview(toolInputPath)
              : undefined,
        });
      let ze = () =>
        buildFilePermissionDescriptor({
          ...D,
          filePath: toolInputPath,
          remoteWorkspace: true,
          remoteOldContent: undefined,
        });
      try {
        let { descriptor, outcome } =
          He === undefined
            ? {
                descriptor: hasHostField(h.input) ? await ze() : await We(),
                outcome: undefined,
              }
            : He.preview === "local"
              ? await localPreviewForHeldCall({
                  args: D,
                  filePath: toolInputPath,
                  startCwd: He.startCwd,
                })
              : {
                  descriptor: await ze(),
                  outcome: He,
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
            ...buildPermissionPromptPayload(ee),
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
        ...D,
        classifierState: "none",
        toolPermissionContext: h.toolPermissionContext,
      }),
    };
  return {
    dialog: PERMISSION_PROMPT_DIALOG,
    descriptor: buildPermissionPromptPayload(ee),
  };
}
//@ chunk-18hwfzwa.js:229560-229598 placement
function isFileWriteOrEditTool(tool) {
  return tool === FileWriteTool || tool === FileEditTool;
}
//@ chunk-18hwfzwa.js:229598-229892 placement
function lookupForwardedTool(h) {
  if (h.lookup === undefined || !hasHostField(h.input) || !isViolinWoodEnabledCached()) return;
  try {
    let x = h.lookup({
      toolUseId: h.toolUseId,
      toolName: h.tool.name,
      input: h.input,
    });
    return x.held
      ? {
          preview: "local",
          startCwd: x.startCwd,
        }
      : {
          preview: "remote",
          reason: x.reason,
        };
  } catch (error) {
    logError(error);
    return {
      preview: "remote",
      reason: "lookup_error",
    };
  }
}
//@ chunk-18hwfzwa.js:229892-230676 placement
async function localPreviewForHeldCall(h) {
  let x = expandPath(h.filePath, String(h.startCwd));
  let D = {
    ...h.args,
    input: {
      ...h.args.input,
      file_path: x,
    },
  };
  try {
    return {
      descriptor: {
        ...(await buildFilePermissionDescriptor({
          ...D,
          filePath: x,
          remoteWorkspace: false,
        })),
        input: h.args.input,
        subtitle: stripInvisibleChars_3(relative(h.startCwd, x)),
        workingDir: h.startCwd,
      },
      outcome: {
        preview: "local",
        startCwd: h.startCwd,
      },
    };
  } catch (error) {
    logForDebugging(
      `buildForwardedPermissionDialog: local preview of a held call failed: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    let ee = {
      ...(await buildFilePermissionDescriptor({
        ...D,
        filePath: x,
        remoteWorkspace: true,
        remoteOldContent: undefined,
      })),
      input: h.args.input,
    };
    let errnoCode = getErrnoCode(error);
    return {
      descriptor:
        ee.content.kind === "no-changes" && errnoCode !== undefined
          ? {
              ...ee,
              content: {
                kind: "no-changes",
                message: `This machine could not read the file (${errnoCode}) \u2014 approving will attempt the write anyway.`,
              },
            }
          : ee,
      outcome: {
        preview: "remote",
        reason: "local_read_failed",
      },
    };
  }
}
//@ chunk-18hwfzwa.js:230676-230819 placement
function logServedPreview(tool, outcome) {
  logEvent("tengu_remote_tool_served_preview", {
    tool: sanitizeToolNameForAnalytics(tool.name),
    preview: fromEnum(outcome.preview),
    reason: fromEnumOpt(outcome.preview === "remote" ? outcome.reason : undefined),
  });
}
//@ chunk-18hwfzwa.js:230819-230831 placement
var REMOTE_READ_FILE_TIMEOUT_MS = 1e4;
//@ chunk-18hwfzwa.js:230831-231263 placement
async function readRemoteFileForPreview(toolInputPath) {
  if (!hasRemoteCap("fileRead")) return;
  try {
    let x = await withTimeout(
      getRemoteCaps().sendControlRequest({
        subtype: "read_file",
        path: toolInputPath,
        max_bytes: REMOTE_READ_MAX_BYTES,
      }),
      REMOTE_READ_FILE_TIMEOUT_MS,
      "remote read_file timed out",
    );
    if (x.truncated === true) return;
    return x.contents;
  } catch (error) {
    let D = error instanceof Error ? error.message : String(error);
    if (D.includes("ENOENT") || D.includes("no such file")) return null;
    logForDebugging(`buildForwardedPermissionDialog: remote read_file failed for ${toolInputPath}: ${D}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-18hwfzwa.js:231263-231302 placement
function isPermissionRuleSource(source) {
  return PERMISSION_RULE_SOURCES.includes(source);
}
//@ chunk-18hwfzwa.js:231302-231334 placement
function toPrintablePermissionText(h) {
  return stripNonPrintable(stripAnsi(h));
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
