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
import { relative, relative as relative_2, relative as relative_3 } from "path";
import { j } from "../../vendor/react/cjs/react.production.js";
import { y3e } from "../utils/deepFreezePlainData.js";
import { qS } from "../services/api/deferredToolsState.js";
import { pe, o, oe } from "../../vendor/zod/v4/classic/schemas.js";
import {
  uniqueDisplayNames,
  stripUnsafeChars,
  markBrokenSequences,
  mat,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { PERMISSION_PROMPT_DIALOG } from "../utils/agentContext.js";
import {
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  C0s,
  FILE_PERMISSION_CARD,
  BASH_PERMISSION_CARD,
  buildBashPermissionPayload,
} from "../components/permissions/permissionCardKinds.js";
import { classifyBashCommand } from "../utils/permissions/bashClassifier.js";
import { Cf } from "../bridge/deviceRegistration.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { FileEditTool } from "../tools/FileEditTool/FileEditTool.js";
import { isViolinWoodEnabledCached } from "../services/analytics/violinGates.js";
import { logError } from "../utils/log.js";
import { expandPath } from "../utils/path.js";
import { hr } from "../utils/invisibleChars.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, getErrnoCode } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { _C, Jn } from "./remoteMode.js";
import { withTimeout } from "../utils/sleep.js";
import { REMOTE_READ_MAX_BYTES } from "../services/remoteTools/remoteFileRead.js";
import { PERMISSION_RULE_SOURCES } from "../utils/permissions/permissions.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { Yn } from "../utils/stripAnsi.js";

//@ chunk-18hwfzwa.js:226114-226118 placement
j();
//@ chunk-18hwfzwa.js:226118-226480 placement
var REMOTE_PERMISSION_UNSHOWABLE_TEXTS =
    "The session asked a permission question that this terminal cannot show. If it still waits, esc stops its turn.",
  rUe = "The session asked a permission question that this terminal cannot show.",
  sUe =
    "The remote session is waiting for an answer to a permission question that this terminal cannot show. Nothing else can answer it. Press esc to stop the turn.";
//@ chunk-18hwfzwa.js:226480-226568 placement
function aUe(h, x) {
  let D = typeof h === "string" ? h : y3e,
    L = qS(x, D);
  if (L) return L;
  return makeStubToolForPermissionUI(D);
}
//@ chunk-18hwfzwa.js:226568-226591 placement
var tae = 200000,
  iUe = 1e4;
//@ chunk-18hwfzwa.js:226591-227988 placement
function makeStubToolForPermissionUI(h) {
  function x(D) {
    throw Error(`Stub tool ${h}.${D} called \u2014 stub exists only for permission UI rendering.`);
  }
  return {
    name: h,
    isMcp: h.startsWith("mcp__"),
    isReadOnly: () => !1,
    isConcurrencySafe: () => !1,
    isEnabled: () => !1,
    inputSchema: pe(o(), oe()),
    maxResultSizeChars: 0,
    userFacingName: () => h,
    description: async () => "",
    prompt: async () => x("prompt"),
    call: async () => x("call"),
    checkPermissions: async () => x("checkPermissions"),
    toAutoClassifierInput: () => "",
    mapToolResultToToolResultBlockParam: (D, L) => ({ type: "tool_result", tool_use_id: L, content: "" }),
    renderToolUseMessage: (D) => {
      let entries = Object.entries(D);
      if (entries.length === 0) return "";
      if (entries.length > 3) throw Error("stub preview cannot render all parameters completely");
      for (let [ke, Re] of entries)
        if (
          ke.length > tae ||
          (typeof Re === "string" && Re.length > tae) ||
          (Array.isArray(Re) && Re.length > iUe) ||
          (typeof Re === "object" && Re !== null && !Array.isArray(Re) && Object.keys(Re).length > iUe)
        )
          throw Error("stub preview cannot render an over-bound parameter");
      let ee = uniqueDisplayNames(entries.map(([ke]) => ke));
      return entries
        .map(([ke, Re]) => {
          let Be = typeof Re === "string" ? null : jsonStringify(Re);
          if (Be !== null && Be.length > tae)
            throw Error("stub preview cannot render an over-bound parameter");
          let He = typeof Re === "string" ? stripUnsafeChars(Re) : Be;
          if (markBrokenSequences(He) !== He || markBrokenSequences(ke) !== ke)
            throw Error("stub preview cannot render a parameter whose display would drop code points");
          let We = typeof Re === "string" ? jsonStringify(markBrokenSequences(He)) : mat(Be);
          return `${ee.get(ke) ?? jsonStringify(mat(ke))}: ${We}`;
        })
        .join(", ");
    },
  };
}
/**
 * 把云会话/远端 worker 发来的 can_use_tool 请求还原成本地权限对话框：找到同名工具或生成 stub 工具，渲染参数，无法渲染时提示 "deny unless expected"。
 */
//@ chunk-18hwfzwa.js:228022-229560 placement
async function buildForwardedPermissionDialog(h) {
  let tool = h.tool,
    D = { ...h, description: typeof h.description === "string" ? h.description : "" },
    L = typeof h.input === "object" && h.input !== null && !Array.isArray(h.input),
    ee = { ...D, hasExternalRacer: !0 };
  if (!L)
    return {
      dialog: PERMISSION_PROMPT_DIALOG,
      descriptor: {
        ...buildPermissionPromptPayload(ee),
        toolUseRenderFailed: !0,
        renderedToolUseMessage: "parameters could not be rendered \u2014 deny unless expected",
      },
    };
  let ke = classifyBashCommand(tool),
    Re = ke?.dialog.kind === BROWSER_PERMISSION_CARD.kind && h.permissionResult.defaultToNo === !0;
  if (ke !== void 0 && !Re) return { dialog: ke.dialog, descriptor: ke.build(ee) };
  if (isFileTool(tool)) {
    let Be = getToolInputPath(tool, h.input);
    if (Be !== null) {
      let He =
          h.remoteWorkspace === !0 && XFt(tool) && !h.signal?.aborted
            ? lookupForwardedTool({
                lookup: h.heldServedCall,
                tool: tool,
                toolUseId: h.toolUseID,
                input: h.input,
                filePath: Be,
              })
            : void 0,
        We = async () =>
          buildFilePermissionDescriptor({
            ...D,
            filePath: Be,
            remoteWorkspace: h.remoteWorkspace === !0,
            remoteOldContent:
              h.remoteWorkspace === !0 && C0s(tool) && !h.signal?.aborted
                ? await readRemoteFileForPreview(Be)
                : void 0,
          }),
        ze = () =>
          buildFilePermissionDescriptor({
            ...D,
            filePath: Be,
            remoteWorkspace: !0,
            remoteOldContent: void 0,
          });
      try {
        let { descriptor: descriptor, outcome: outcome } =
          He === void 0
            ? { descriptor: Cf(h.input) ? await ze() : await We(), outcome: void 0 }
            : He.preview === "local"
              ? await localPreviewForHeldCall({ args: D, filePath: Be, startCwd: He.startCwd })
              : { descriptor: await ze(), outcome: He };
        if (outcome !== void 0) logServedPreview(tool, outcome);
        return { dialog: FILE_PERMISSION_CARD, descriptor: descriptor };
      } catch {
        return {
          dialog: PERMISSION_PROMPT_DIALOG,
          descriptor: {
            ...buildPermissionPromptPayload(ee),
            toolUseRenderFailed: !0,
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
  return { dialog: PERMISSION_PROMPT_DIALOG, descriptor: buildPermissionPromptPayload(ee) };
}
//@ chunk-18hwfzwa.js:229560-229598 placement
function XFt(h) {
  return h === FileWriteTool || h === FileEditTool;
}
//@ chunk-18hwfzwa.js:229598-229892 placement
function lookupForwardedTool(h) {
  if (h.lookup === void 0 || !Cf(h.input) || !isViolinWoodEnabledCached()) return;
  try {
    let lookup = h.lookup({ toolUseId: h.toolUseId, toolName: h.tool.name, input: h.input });
    return lookup.held
      ? { preview: "local", startCwd: lookup.startCwd }
      : { preview: "remote", reason: lookup.reason };
  } catch (error) {
    return (logError(error), { preview: "remote", reason: "lookup_error" });
  }
}
//@ chunk-18hwfzwa.js:229892-230676 placement
async function localPreviewForHeldCall(h) {
  let x = expandPath(h.filePath, String(h.startCwd)),
    D = { ...h.args, input: { ...h.args.input, file_path: x } };
  try {
    return {
      descriptor: {
        ...(await buildFilePermissionDescriptor({ ...D, filePath: x, remoteWorkspace: !1 })),
        input: h.args.input,
        subtitle: hr(relative(h.startCwd, x)),
        workingDir: h.startCwd,
      },
      outcome: { preview: "local", startCwd: h.startCwd },
    };
  } catch (error) {
    logForDebugging(
      `buildForwardedPermissionDialog: local preview of a held call failed: ${errorMessage(error)}`,
      { level: "error" },
    );
    let ee = {
        ...(await buildFilePermissionDescriptor({
          ...D,
          filePath: x,
          remoteWorkspace: !0,
          remoteOldContent: void 0,
        })),
        input: h.args.input,
      },
      ke = getErrnoCode(error);
    return {
      descriptor:
        ee.content.kind === "no-changes" && ke !== void 0
          ? {
              ...ee,
              content: {
                kind: "no-changes",
                message: `This machine could not read the file (${ke}) \u2014 approving will attempt the write anyway.`,
              },
            }
          : ee,
      outcome: { preview: "remote", reason: "local_read_failed" },
    };
  }
}
//@ chunk-18hwfzwa.js:230676-230819 placement
function logServedPreview(h, x) {
  logEvent("tengu_remote_tool_served_preview", {
    tool: sanitizeToolNameForAnalytics(h.name),
    preview: fromEnum(x.preview),
    reason: fromEnumOpt(x.preview === "remote" ? x.reason : void 0),
  });
}
//@ chunk-18hwfzwa.js:230819-230831 placement
var n0t = 1e4;
//@ chunk-18hwfzwa.js:230831-231263 placement
async function readRemoteFileForPreview(h) {
  if (!_C("fileRead")) return;
  try {
    let x = await withTimeout(
      Jn().sendControlRequest({ subtype: "read_file", path: h, max_bytes: REMOTE_READ_MAX_BYTES }),
      n0t,
      "remote read_file timed out",
    );
    if (x.truncated === !0) return;
    return x.contents;
  } catch (error) {
    let D = error instanceof Error ? error.message : String(error);
    if (D.includes("ENOENT") || D.includes("no such file")) return null;
    logForDebugging(`buildForwardedPermissionDialog: remote read_file failed for ${h}: ${D}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-18hwfzwa.js:231263-231302 placement
function i0t(h) {
  return PERMISSION_RULE_SOURCES.includes(h);
}
//@ chunk-18hwfzwa.js:231302-231334 placement
function UH(h) {
  return stripNonPrintable(Yn(h));
}

export { UH, aUe, buildForwardedPermissionDialog, i0t, sUe, rUe, REMOTE_PERMISSION_UNSHOWABLE_TEXTS };
