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
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPolicyVerdictAbsent } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { truncateToWidth } from "../format.js";
import { logForDebugging } from "../debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:1938185-1938207 placement
var Cpn = 2000,
  kon = 1500;
//@ chunk-e6aww6q8.js:1938207-1938351 placement
function truncateFirstSessionMessage(e) {
  if (e.length <= Cpn) return e;
  let n = (r) => `
[\u2026 ${r} characters omitted \u2026]
`;
  return truncateMiddle(e, kon, Cpn - kon - n(e.length).length, n);
}
//@ chunk-e6aww6q8.js:1938351-1938397 placement
var Ttr = DoctorLazy(() => u({ title: o(), branch_name: o() }));
//@ chunk-e6aww6q8.js:1938397-1939213 placement
async function checkSessionTitlePolicyTaint(e, n, r) {
  let s = isPolicyVerdictAbsent()
      ? "no organization policy verdict held"
      : hasComplianceTaint("hipaa")
        ? "HIPAA taint in effect for this process"
        : hasComplianceTaint("zdr")
          ? "ZDR taint in effect"
          : void 0,
    h = { title: truncateToWidth(e, 75), branchName: "claude/task" };
  if (s !== void 0)
    return (logForDebugging(`Session name request not sent (${s}); using the default title and branch`), h);
  try {
    let post = await apiClient.post(
      "/api/organizations/:orgUUID/dust/generate_title_and_branch",
      { first_session_message: truncateFirstSessionMessage(e) },
      {
        auth: "teleport-org",
        headers: { "anthropic-beta": OAUTH_BETA_HEADER },
        timeout: 15000,
        signal: n,
        credentials: r,
        isBackground: !0,
      },
    );
    if (!post.ok)
      return (
        logForDebugging(`Session name request not sent (${post.reason}); using the default title and branch`),
        h
      );
    let parse = Ttr().parse(post.data);
    return { title: parse.title || h.title, branchName: parse.branch_name || h.branchName };
  } catch (error) {
    return (
      logForDebugging(`Error generating title and branch: ${errorMessage(error)}`, { level: "error" }),
      h
    );
  }
}

export { checkSessionTitlePolicyTaint, Cpn, truncateFirstSessionMessage };
