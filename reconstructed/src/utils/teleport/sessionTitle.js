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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPolicyVerdictAbsent } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { truncateToWidth } from "../format.js";
import { logForDebugging } from "../debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:1938185-1938207 placement
/**
 * 标题消息上限（2000），保留头部 1500 字符。
 */
var MAX_TITLE_MESSAGE_CHARS = 2000;
var TITLE_HEAD_CHARS = 1500;
//@ chunk-e6aww6q8.js:1938207-1938351 placement
function truncateFirstSessionMessage(e) {
  if (e.length <= MAX_TITLE_MESSAGE_CHARS) return e;
  let n = (r) => `
[\u2026 ${r} characters omitted \u2026]
`;
  return truncateMiddle(
    e,
    TITLE_HEAD_CHARS,
    MAX_TITLE_MESSAGE_CHARS - TITLE_HEAD_CHARS - n(e.length).length,
    n,
  );
}
//@ chunk-e6aww6q8.js:1938351-1938397 placement
var sessionTitleResponseSchema = DoctorLazy(() =>
  u({
    title: string(),
    branch_name: string(),
  }),
);
//@ chunk-e6aww6q8.js:1938397-1939213 placement
async function checkSessionTitlePolicyTaint(e, signal, credentials) {
  let s = isPolicyVerdictAbsent()
    ? "no organization policy verdict held"
    : hasComplianceTaint("hipaa")
      ? "HIPAA taint in effect for this process"
      : hasComplianceTaint("zdr")
        ? "ZDR taint in effect"
        : undefined;
  let h = {
    title: truncateToWidth(e, 75),
    branchName: "claude/task",
  };
  if (s !== undefined) {
    logForDebugging(`Session name request not sent (${s}); using the default title and branch`);
    return h;
  }
  try {
    let y = await apiClient.post(
      "/api/organizations/:orgUUID/dust/generate_title_and_branch",
      {
        first_session_message: truncateFirstSessionMessage(e),
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
    if (!y.ok) {
      logForDebugging(`Session name request not sent (${y.reason}); using the default title and branch`);
      return h;
    }
    let S = sessionTitleResponseSchema().parse(y.data);
    return {
      title: S.title || h.title,
      branchName: S.branch_name || h.branchName,
    };
  } catch (error) {
    logForDebugging(`Error generating title and branch: ${errorMessage(error)}`, {
      level: "error",
    });
    return h;
  }
}
export { checkSessionTitlePolicyTaint, MAX_TITLE_MESSAGE_CHARS, truncateFirstSessionMessage };
