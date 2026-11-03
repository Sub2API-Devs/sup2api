/**
 * services/remoteTools/remoteToolResult.ts
 *
 * 2.1.316 新增：远程工具结果的呈现：完成标注、截断说明、未验证结果、输出落盘位置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtv8x2hx.js (23)
 * attribution: placement 23
 */
import { isRanOutcome, REMOTE_TOOL_SERVING_LIMITS } from "../../remote/tools/protocolConstants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { formatFileSize } from "../../utils/format.js";
import { outputFilterHint, FL } from "../../tools/shared/textSearchTools.js";
import {
  formatHostNotes,
  REMOTE_RESULT_TEXT_CAP,
  fgo,
  CTr,
  contentToText,
  sanitizeForPrompt,
} from "./resultConversion.js";
import { replayedOutcomeNote, deliveredAfterReconnectNote, ranOnHeader } from "./transportMessages.js";
import { $r } from "../../bridge/deviceRegistration.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";

//@ chunk-dtv8x2hx.js:62603-62895 placement
function buildRemoteToolResultBlock(tool, outcome, toolUseId) {
  let r = isRanOutcome(outcome.disposition),
    s = r && outcome.envelope === "present",
    u = outcome.isError || !r,
    p = Tn(tool, outcome),
    i =
      p === void 0
        ? {
            type: "tool_result",
            tool_use_id: toolUseId,
            content: s ? outcome.content : remoteResultText(outcome),
            ...(u && { is_error: !0 }),
          }
        : { ...tool.mapToolResultToToolResultBlockParam(p, toolUseId), ...(u && { is_error: !0 }) };
  return appendResultLines(prependResultLine(i, Ke(tool, outcome)), formatTruncatedResult(tool, outcome));
}
//@ chunk-dtv8x2hx.js:62895-62939 placement
function Ke(e, n) {
  return `${formatUnverifiedAnswer(n)}${rr(e, n)}`;
}
//@ chunk-dtv8x2hx.js:62939-62987 placement
function rr(e, n) {
  return extractShellOutput(e, n, "which follows");
}
//@ chunk-dtv8x2hx.js:62987-63040 placement
function It(e, n) {
  return extractShellOutput(e, n, "shown above").trim();
}
//@ chunk-dtv8x2hx.js:63040-63229 placement
function formatCompletedOnHost(e, n) {
  return (e.name === FILE_EDIT_TOOL_NAME || e.name === FILE_WRITE_TOOL_NAME) &&
    n.envelope === "present" &&
    isRanOutcome(n.disposition) &&
    !n.isError &&
    !n.truncated &&
    n.output === void 0
    ? `(completed on ${n.host.name}; diff not shown)`
    : "";
}
//@ chunk-dtv8x2hx.js:63229-63664 placement
function extractShellOutput(e, n, o) {
  if (n.spilled === void 0 || !isRanOutcome(n.disposition)) return "";
  let r = remoteStructuredOutput(e, n),
    s = typeof r === "object" && r !== null ? Reflect.get(r, "stdout") : void 0,
    u = typeof s === "string" ? s.replace(REMOTE_TOOL_SERVING_LIMITS, "") : "",
    byteLength = Buffer.byteLength(u);
  if (byteLength === 0 || n.spilled.bytes <= byteLength) return "";
  let i = n.host.name;
  return ` Output was ${formatFileSize(n.spilled.bytes)}; ${i} sent the first ${formatFileSize(byteLength)}, ${o}; the rest exists only on ${i} \u2014 re-run there with ${outputFilterHint(e.name)} if that is safe.`;
}
//@ chunk-dtv8x2hx.js:63664-64272 placement
function formatTruncatedResult(e, n) {
  let o = isRanOutcome(n.disposition) && n.envelope === "present",
    r = !o && Sn(n);
  return [
    ...formatHostNotes(n.notes, n.host.name),
    ...(n.truncated
      ? [(o ? formatLineCutNote(e, n) : void 0) ?? `(${n.host.name} truncated this result)`]
      : []),
    ...(n.cutHere && o
      ? [
          `(this session cut ${n.host.name}'s result to its own limits: ${REMOTE_RESULT_TEXT_CAP.toLocaleString("en-US")} characters of text, inline images up to ${fgo / 1048576} MiB, ${CTr} blocks)`,
        ]
      : []),
    ...(r || (n.cutHere === !0 && !o)
      ? [
          `(this session kept only the first ${Xe.toLocaleString("en-US")} characters of ${n.host.name}'s answer)`,
        ]
      : []),
    ...(isRanOutcome(n.disposition) ? formatSavedOutputNote(n, e) : []),
    ...describeDuplicateCall(n),
    ...(n.sessionNotes ?? []).map((s) => `(${s.text})`),
  ];
}
//@ chunk-dtv8x2hx.js:64272-64519 placement
function describeDuplicateCall(e) {
  if (e.delivery === "fresh" || e.disposition === "duplicate_call") return [];
  let n = isRanOutcome(e.disposition)
    ? e.isError
      ? "failed"
      : "completed"
    : e.disposition === "unrecognized"
      ? "failed"
      : "refused";
  return e.delivery === "replayed" ? [replayedOutcomeNote(e.servedAt, n)] : [deliveredAfterReconnectNote(n)];
}
/**
 * 标注"由某机器回答但无运行细节、未验证"。
 */
//@ chunk-dtv8x2hx.js:64519-65593 placement
function formatUnverifiedAnswer(e) {
  let n = e.host.name;
  if (e.envelope !== "present")
    return `[answered by ${n} without run details \u2014 unverified; whether the command ran there is unknown, so check before re-running it]`;
  switch (e.disposition) {
    case void 0:
    case "ran":
    case "approved_by_session":
      return ranOnHeader(n, e.spelledDirectory, e.permittedBy, e.isError);
    case "hook_blocked":
      return `[blocked on ${n} before it ran (hook or deny rule) \u2014 not run]`;
    case "denied_by_rule":
    case "denied_by_user":
    case "ask_refused_no_surface":
      return `[refused on ${n} \u2014 not run]`;
    case "validation_failed":
      return `[rejected on ${n} \u2014 not run]`;
    case "duplicate_call":
      return `[not re-run on ${n}]`;
    case "denied_by_session":
      return `[refused on ${n} \u2014 not run]`;
    case "asked_in_session":
      return `[waiting on a permission decision for ${n} \u2014 not run]`;
    case "ask_expired":
      return `[permission ask for ${n} ended unanswered \u2014 not run]`;
    case "unrecognized":
      return `[answered by ${n} with an outcome this version of Claude Code does not recognise \u2014 whether the command ran there is unknown, so check before re-running it]`;
  }
}
//@ chunk-dtv8x2hx.js:65593-65870 placement
function remoteStructuredOutput(e, n) {
  if (!isRanOutcome(n.disposition)) return;
  if (n.output !== void 0) return n.output;
  if (n.isError || !FL(e) || !ar(n.content)) return;
  let o = contentToText(n.content),
    r = e.outputSchema?.safeParse({
      stdout: n.envelope === "present" ? o : sanitizeForPrompt(o, Xe),
      stderr: "",
      interrupted: !1,
    });
  return r?.success ? r.data : void 0;
}
//@ chunk-dtv8x2hx.js:65870-65915 placement
function Tn(e, n) {
  return FL(e) ? remoteStructuredOutput(e, n) : void 0;
}
//@ chunk-dtv8x2hx.js:65915-65988 placement
function ar(e) {
  return typeof e === "string" || e.every((n) => n.type === "text");
}
//@ chunk-dtv8x2hx.js:65988-66106 placement
function toolUseErrorResult(e, n) {
  return {
    type: "tool_result",
    tool_use_id: n,
    content: `<tool_use_error>${e}</tool_use_error>`,
    is_error: !0,
  };
}
//@ chunk-dtv8x2hx.js:66106-66322 placement
function appendResultLines(e, n) {
  if (n.length === 0) return e;
  let joined = n.join(`
`),
    { content: content } = e;
  if (content === void 0 || content === "") return { ...e, content: joined };
  return typeof content === "string"
    ? {
        ...e,
        content: `${content}
${joined}`,
      }
    : { ...e, content: [...content, { type: "text", text: joined }] };
}
//@ chunk-dtv8x2hx.js:66322-66498 placement
function prependResultLine(e, n) {
  let { content: content } = e;
  if (content === void 0 || content === "") return { ...e, content: n };
  return typeof content === "string"
    ? {
        ...e,
        content: `${n}
${content}`,
      }
    : { ...e, content: [{ type: "text", text: n }, ...content] };
}
//@ chunk-dtv8x2hx.js:66498-66547 placement
var Et = "<tool_use_error>",
  Mt = "</tool_use_error>";
//@ chunk-dtv8x2hx.js:66547-66703 placement
function remoteResultText(e, n = Xe) {
  let o = contentToText(e.content),
    r = (e.isError || !isRanOutcome(e.disposition)) && o.startsWith(Et) && o.endsWith(Mt);
  return sanitizeForPrompt(r ? o.slice(Et.length, -Mt.length) : o, n);
}
//@ chunk-dtv8x2hx.js:66703-66765 placement
function Sn(e) {
  return remoteResultText(e, Number.MAX_SAFE_INTEGER).length > Xe;
}
//@ chunk-dtv8x2hx.js:66765-66777 placement
var Xe = 2000;
//@ chunk-dtv8x2hx.js:66777-67941 placement
function formatSavedOutputNote(e, n) {
  let o = e.host.name,
    r = `e.g. ${n.name} with ${$r}: "${o}"`;
  return e.hostLocal.map((s) => {
    switch (s) {
      case "saved_output_file":
        return `(the full output was saved to a file on ${o} that was not sent and cannot be read from here \u2014 re-run the command there with ${outputFilterHint(n.name)} if that is safe, ${r})`;
      case "background_task": {
        if (e.backgroundTaskId === void 0)
          return `(that command keeps running as a background task ON ${o}: its task id and output file exist there, not here, and this session is not notified when it finishes \u2014 check on it there, ${r})`;
        return `(that command keeps running as a background task ON ${o}: its ID and output file exist there, not here, and this session is not notified when it finishes. Its output file there (${FILE_READ_TOOL_NAME} with ${$r}: "${o}") shows what it has printed, not whether it is still running. To stop it, call ${TASKSTOP} with that ID and ${$r}: "${o}". Never check on it or stop it with pgrep, pkill or kill: with the sandbox on there, a later command cannot see or reach this process, or a server it started. To test such a server, do it inside the same command, or ask the user to turn the sandbox off for that folder.)`;
      }
    }
  });
}
//@ chunk-dtv8x2hx.js:67941-67971 placement
var cr = /^\s*(\d+)[\t:\u2192]/;
//@ chunk-dtv8x2hx.js:67971-68583 placement
function formatLineCutNote(e, n) {
  if (e.name !== FILE_READ_TOOL_NAME) return;
  let o = contentToText(n.content),
    match = REMOTE_TOOL_SERVING_LIMITS.exec(o);
  if (match === null) return;
  let s,
    u = 0,
    p,
    i = 0;
  for (let w of o.slice(0, match.index).split(`
`)) {
    let match = cr.exec(w);
    if (match === null) continue;
    let S = Number(match[1]);
    if (p !== void 0 && S === i + 1) i = S;
    else ((p = S), (i = S));
    if (s === void 0 || i - p > u - s) ((s = p), (u = i));
  }
  if (s === void 0 || u <= s) return;
  let h = n.host.name;
  return `(${h} cut this result at the most it sends in one answer: lines ${s}-${u - 1} arrived whole, line ${u} may be cut short, and the rest of the file is not in this result. The next page is ${FILE_READ_TOOL_NAME} with offset=${u} limit=${u - s} and ${$r}: "${h}"; ${GREP_TOOL_NAME} there finds a specific section.)`;
}
//@ chunk-dtv8x2hx.js:68583-68603 placement
var pr = 3000,
  fr = 2000;

export {
  fr,
  pr,
  remoteStructuredOutput,
  toolUseErrorResult,
  It,
  formatCompletedOnHost,
  formatTruncatedResult,
  Ke,
  buildRemoteToolResultBlock,
  Tn,
  remoteResultText,
  Sn,
};
