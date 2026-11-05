/**
 * commands/review/ultrareviewRun.ts
 *
 * ultrareview 本地进程运行器：起子进程读 launch 记录轮询 session id、解析 JSON 发现、按超时/中断给出 outcome 与账单提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tmywcb5b.js (10)
 * attribution: placement 10
 */
import { readFile } from "fs/promises";
import { INVISIBLE_CHAR_CLASSES } from "../../utils/sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema, numberSchema, array, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { printableName, stripAnsiAndControls, stripAnsiSequences } from "../../utils/printableName.js";
import { safeParseJSON } from "../../utils/json.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { toWellFormedString } from "../../utils/stringUtils.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { redactUrlsInMessage } from "../../utils/redaction/urlRedaction.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { clientWaitMinutes } from "./ultrareviewPreconditions.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { getRemoteHostSessionCount } from "../insights.js";
import { sleep } from "../../utils/sleep.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { parseReviewErrorPayload } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";

//@ chunk-tmywcb5b.js:788-1075 placement
/**
 * 发现项里路径/文本的截断上限 100000。
 */
var MAX_STDERR_CHARS = 1e5;
var WORD_PATTERN = /[^\s'"`<>]+/g;
var regExp = new RegExp(`(?![\\n\\t\\u200c\\u200d\\ufe0f])[\\p{Cc}\\p{Cf}${INVISIBLE_CHAR_CLASSES}]`, "gu");
var MIN_LINE = 1;
var reviewFindingsSchema = DoctorLazy(() => {
  let textField = stringSchema().transform(normalizeText).optional().catch(undefined);
  let lineField = numberSchema().optional().catch(undefined);
  return array(
    objectSchema({
      file_path: textField,
      start_line: lineField,
      end_line: lineField,
      severity: textField,
      pr_comment: textField,
      reasoning: textField,
    }),
  );
});
//@ chunk-tmywcb5b.js:1075-1205 placement
/**
 * 把输出按上限截断并在空白处收口，再脱敏。
 */
function truncateForReport(text, limit) {
  let sliced = text.slice(0, MAX_STDERR_CHARS);
  return printableName(
    redactText(
      text.length <= MAX_STDERR_CHARS
        ? text
        : sliced.slice(
            0,
            Math.max(
              sliced.lastIndexOf(" "),
              sliced.lastIndexOf(`
`),
            ) + 1,
          ),
    ),
    limit,
  );
}
//@ chunk-tmywcb5b.js:1205-1240 placement
/**
 * 脱敏并对 URL 做收口。
 */
function redactText(text) {
  return redactUrls(stripAnsiAndControls(redactUrls(text)));
}
//@ chunk-tmywcb5b.js:1240-1296 placement
function parseFindings(stdout) {
  return reviewFindingsSchema().safeParse(safeParseJSON(stdout, false)).data ?? null;
}
//@ chunk-tmywcb5b.js:1296-1349 placement
/**
 * 把值序列化成缩进 JSON 并写入位置。
 */
function writeJsonFile(path, value) {
  return writeFileAtomic(
    path,
    `${jsonStringify(value, null, 2)}
`,
    384,
  );
}
//@ chunk-tmywcb5b.js:1349-1436 placement
function normalizeText(text) {
  return stripAnsiSequences(toWellFormedString(text))
    .replace(
      /\r\n?|[\x85\u2028\u2029]/g,
      `
`,
    )
    .replace(regExp, "");
}
//@ chunk-tmywcb5b.js:1436-1515 placement
function redactUrls(text) {
  return redactSecrets(redactUrlsInMessage(text).replace(WORD_PATTERN, redactWordUrl)).replaceAll(
    "://[REDACTED]@",
    "://",
  );
}
//@ chunk-tmywcb5b.js:1515-1918 placement
/**
 * URL 中凭据段的收口显示（避免打印整段用户信息）。
 */
function redactWordUrl(word) {
  let replaced = word.replace(/^\/\//, "");
  let separator = /^\\|(?:^|\W)[A-Za-z]:\\/.test(replaced) ? replaced.indexOf("\\") : replaced.indexOf("/");
  let urlPart = separator === -1 ? replaced : replaced.slice(0, separator);
  let max = Math.max(urlPart.lastIndexOf("@"), [...urlPart.matchAll(/%(?:25)*40/g)].at(-1)?.index ?? -1);
  let colon = [...urlPart.slice(0, Math.max(max, 0)).matchAll(/:|%(?:25)*3a/gi)].at(-1)?.index ?? -1;
  return colon === -1 ||
    urlPart[colon + 1] === "@" ||
    /\bmailto$/i.test(urlPart.slice(0, colon)) ||
    urlPart.startsWith("@sha256:", max)
    ? word
    : `\u2026${replaced.slice(max)}`;
}
//@ chunk-tmywcb5b.js:1918-2144 placement
/**
 * 等待分钟数与超时上限、被停止/启动失败/无原因结束的文案。
 */
var LAUNCH_TIMEOUT_SLACK_MIN = 10;
var MAX_STDOUT_BYTES = 67108864;
var PUBLISHED_ERROR_CHARS = 500;
var POLL_MS = 2000;
var STOPPED_WAITING_LINE = "This command stopped waiting.";
var LAUNCH_FAILED_PREFIX = "Ultrareview could not launch:";
var ENDED_WITHOUT_REASON =
  "The local process for this review ended without saying why. If the review had already launched, it will be billed.";
//@ chunk-tmywcb5b.js:2144-3989 placement
/**
 * 运行 ultrareview 子进程：轮询 launch 记录里的 session id、解析 JSON 发现，按中断/超时给出 outcome 与账单提示。
 */
async function runUltrareview(cwd, base, launchRecordPath, signal, onSessionId) {
  let { cmd, prefixArgs } = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  let waitMinutes = clientWaitMinutes();
  let now = Date.now();
  let child = execFileNoThrowWithCwd(
    cmd,
    [...prefixArgs, "ultrareview", base, "--trust-workspace", "--json", "--timeout", String(waitMinutes)],
    {
      cwd,
      env: {
        ...getRemoteHostSessionCount(undefined, {
          userLocale: true,
        }),
        CLAUDE_CODE_ULTRAREVIEW_LAUNCH_RECORD: launchRecordPath,
      },
      abortSignal: signal,
      timeout: (waitMinutes + LAUNCH_TIMEOUT_SLACK_MIN) * 60 * 1000,
      preserveOutputOnError: true,
      maxBuffer: MAX_STDOUT_BYTES,
      stdin: "ignore",
      toolCgroupClass: "agent",
      waitForExitAfterKill: true,
    },
  );
  let abortController = new AbortController();
  child.finally(() => abortController.abort());
  let sessionId = null;
  let pollAborted = false;
  while (sessionId === null && !pollAborted) {
    pollAborted = abortController.signal.aborted;
    sessionId = truncateForReport(await readFile(launchRecordPath, "utf8").catch(() => "")) || null;
    if (sessionId === null && !pollAborted) await sleep(POLL_MS, abortController.signal);
  }
  if (sessionId !== null) onSessionId(sessionId);
  let { stdout, stderr, exitCode, timedOut } = await child;
  let findings = parseFindings(stdout);
  if (findings !== null)
    return {
      session_id: sessionId,
      minutes: Math.round((Date.now() - now) / 60000),
      findings,
      outcome: "reviewed",
      outcome_detail: "",
    };
  let billingHint =
    sessionId === null
      ? " If the review had already launched, it will be billed."
      : ` The review may still be running in the cloud, and it is billed. Its session id, for tracing it or its bill, is ${sessionId}.`;
  let baseResult = {
    session_id: sessionId,
    minutes: null,
    findings: [],
  };
  if (signal.aborted)
    return {
      ...baseResult,
      outcome: "pending",
      outcome_detail: `The run was stopped.${billingHint}`,
    };
  if (timedOut)
    return {
      ...baseResult,
      outcome: "timed_out",
      outcome_detail: `No result came in time.${billingHint}`,
    };
  let lines = stripAnsi(stderr).trimEnd().split(`
`);
  let sliced = lines.slice(lines.findLastIndex((line) => line.startsWith("Ultrareview ")));
  if (sliced.some((line) => line.startsWith(STOPPED_WAITING_LINE)))
    return {
      ...baseResult,
      outcome: "timed_out",
      outcome_detail: `${truncateForReport(sliced[0] ?? "", PUBLISHED_ERROR_CHARS).replace(/\.$/, "")}.${billingHint}`,
    };
  let error = parseReviewErrorPayload(stdout)?.error;
  let detail = truncateForReport(error ?? sliced.join(" "), PUBLISHED_ERROR_CHARS);
  if (sessionId !== null || error !== undefined) {
    let isFailure = detail !== "" && (error !== undefined || (exitCode !== undefined && exitCode <= 128));
    return {
      ...baseResult,
      outcome: isFailure || sessionId === null ? "failed" : "timed_out",
      outcome_detail: isFailure
        ? detail
        : `The local process for this review ended without saying why.${billingHint}`,
    };
  }
  return exitCode !== undefined && sliced[0]?.startsWith(LAUNCH_FAILED_PREFIX)
    ? {
        ...baseResult,
        outcome: "not_started",
        outcome_detail: detail,
      }
    : {
        ...baseResult,
        outcome: "failed",
        outcome_detail:
          exitCode !== undefined && detail !== ""
            ? `${detail.replace(/\.$/, "")}.${billingHint}`
            : ENDED_WITHOUT_REASON,
      };
}
export {
  LAUNCH_FAILED_PREFIX,
  STOPPED_WAITING_LINE,
  truncateForReport,
  MIN_LINE,
  writeJsonFile,
  runUltrareview,
  ENDED_WITHOUT_REASON,
  redactText,
};
