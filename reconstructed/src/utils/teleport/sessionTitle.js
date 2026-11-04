/**
 * utils/teleport/sessionTitle.ts
 *
 * 2.1.316 新增：会话标题
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { truncateMiddle } from "../stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPolicyVerdictAbsent } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { truncateToWidth } from "../format.js";
import { logForDebugging } from "../debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { errorMessage } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1938185-1938207 placement
/**
 * 标题消息上限（2000），保留头部 1500 字符。
 */
var MAX_TITLE_MESSAGE_CHARS = 2000;
var TITLE_HEAD_CHARS = 1500;
//@ chunk-e6aww6q8.js:1938207-1938351 placement
function truncateFirstSessionMessage(message) {
  if (message.length <= MAX_TITLE_MESSAGE_CHARS) return message;
  let suffixFor = (omitted) => `
[\u2026 ${omitted} characters omitted \u2026]
`;
  return truncateMiddle(
    message,
    TITLE_HEAD_CHARS,
    MAX_TITLE_MESSAGE_CHARS - TITLE_HEAD_CHARS - suffixFor(message.length).length,
    suffixFor,
  );
}
//@ chunk-e6aww6q8.js:1938351-1938397 placement
var sessionTitleResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1938351", () => {
  sessionTitleResponseSchema = DoctorLazy(() =>
    objectSchema({
      title: stringSchema(),
      branch_name: stringSchema(),
    }),
  );
});
//@ chunk-e6aww6q8.js:1938397-1939213 placement
async function checkSessionTitlePolicyTaint(options, signal, credentials) {
  let verdict = isPolicyVerdictAbsent()
    ? "no organization policy verdict held"
    : hasComplianceTaint("hipaa")
      ? "HIPAA taint in effect for this process"
      : hasComplianceTaint("zdr")
        ? "ZDR taint in effect"
        : undefined;
  let reason = {
    title: truncateToWidth(options, 75),
    branchName: "claude/task",
  };
  if (verdict !== undefined) {
    logForDebugging(`Session name request not sent (${verdict}); using the default title and branch`);
    return reason;
  }
  try {
    let titleResponse = await apiClient.post(
      "/api/organizations/:orgUUID/dust/generate_title_and_branch",
      {
        first_session_message: truncateFirstSessionMessage(options),
      },
      {
        auth: "teleport-org",
        headers: {
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        timeout: 15000,
        signal,
        credentials,
        isBackground: true,
      },
    );
    if (!titleResponse.ok) {
      logForDebugging(
        `Session name request not sent (${titleResponse.reason}); using the default title and branch`,
      );
      return reason;
    }
    let titlePayload = sessionTitleResponseSchema().parse(titleResponse.data);
    return {
      title: titlePayload.title || reason.title,
      branchName: titlePayload.branch_name || reason.branchName,
    };
  } catch (error) {
    logForDebugging(`Error generating title and branch: ${errorMessage(error)}`, {
      level: "error",
    });
    return reason;
  }
}
export { checkSessionTitlePolicyTaint, MAX_TITLE_MESSAGE_CHARS, truncateFirstSessionMessage };
