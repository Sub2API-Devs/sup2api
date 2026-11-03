/**
 * services/mcpServe/repoGitState.ts
 *
 * 2.1.316 新增：mcp serve 读取仓库 git 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  record,
  string,
  array,
  discriminatedUnion,
  literal,
  M,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_REPO_URL_CHARS } from "../../utils/detectRepository.js";
import {
  SDKSystemCodeChangePublishedMessageSchema,
  SDKSystemVcsStateChangedMessageSchema,
} from "../../entrypoints/sdk/coreSchemas.js";
import { isSafeBranchName, settlePendingPrLinks } from "../../tools/shared/gitOperationTracking.js";
import { getRepoCheckouts, resolveCheckoutPath } from "../../utils/git/repoCheckouts.js";
import { refreshGitDir, readGitHead } from "../../utils/git/gitFilesystem.js";
import { drainTaskNotifications } from "../../utils/task/taskNotifications.js";

//@ chunk-wy9dbk5f.js:50401-50887 placement
/**
 * 读取 git 状态结果的 schema。
 */
var READREPOGITSTATE = "ReadRepoGitState";
var MAX_BRANCHES = 32;
var MAX_EVENTS = 64;
var MAX_BRANCH_NAME_CHARS = 256;
var MAX_CWD_CHARS = 4096;
var MAX_REF_CHARS = 255;
var SAFE_ABSOLUTE_PATH_RE = /^\/[^\p{C}\p{Zl}\p{Zp}]*$/u;
var readRepoGitStateResultSchema = DoctorLazy(() =>
  u({
    branches: record(string().max(MAX_BRANCH_NAME_CHARS), string().max(MAX_REF_CHARS).nullable()).refine(
      isBranchesMapSmallEnough,
    ),
    events: array(
      discriminatedUnion("subtype", [
        u({
          subtype: literal("code_change_published"),
          url: string().max(MAX_REPO_URL_CHARS),
          action: SDKSystemCodeChangePublishedMessageSchema().shape.action.unwrap(),
          branch: string().refine(isSafeBranchName).optional(),
        }),
        u({
          subtype: literal("vcs_state_changed"),
          kind: SDKSystemVcsStateChangedMessageSchema().shape.kind,
          cwd: string().max(MAX_CWD_CHARS).regex(SAFE_ABSOLUTE_PATH_RE),
          branch: string().refine(isSafeBranchName).optional(),
        }),
      ])
        .nullable()
        .catch(null),
    ).max(MAX_EVENTS),
    cut: M().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:50887-51776 placement
async function serveReadRepoGitState(e, r, { callerGone }) {
  let s = [...getRepoCheckouts()];
  let a = s.length > MAX_BRANCHES;
  let c = [];
  for (let [h, S] of s.slice(0, MAX_BRANCHES)) {
    if (h.length > MAX_BRANCH_NAME_CHARS) {
      a = true;
      continue;
    }
    let checkoutPath = resolveCheckoutPath(S);
    if (checkoutPath === null) continue;
    let b = await refreshGitDir(checkoutPath);
    if (b !== null) {
      let gitHead = await readGitHead(b);
      c.push([h, gitHead?.type === "branch" && isSafeBranchName(gitHead.name) ? gitHead.name : null]);
    }
  }
  await settlePendingPrLinks();
  r.throwIfAborted();
  callerGone?.throwIfAborted();
  let y = [];
  for (let h of drainTaskNotifications()) {
    if (h.type !== "system") continue;
    if (h.subtype === "code_change_published")
      y.push({
        subtype: h.subtype,
        url: h.url,
        action: h.action,
        ...(h.branch !== undefined && {
          branch: h.branch,
        }),
      });
    else if (h.subtype === "vcs_state_changed") {
      if (h.cwd.length > MAX_CWD_CHARS || !SAFE_ABSOLUTE_PATH_RE.test(h.cwd)) {
        a = true;
        continue;
      }
      y.push({
        subtype: h.subtype,
        kind: h.kind,
        cwd: h.cwd,
        ...("branch" in h &&
          h.branch !== undefined &&
          isSafeBranchName(h.branch) && {
            branch: h.branch,
          }),
      });
    }
  }
  a ||= y.length > MAX_EVENTS;
  let sliced = y.slice(-MAX_EVENTS);
  return {
    summary: `${c.length} checkouts, ${sliced.length} events`,
    output: {
      branches: Object.fromEntries(c),
      events: sliced,
      ...(a && {
        cut: a,
      }),
    },
  };
}
//@ chunk-wy9dbk5f.js:51776-51824 placement
/**
 * 判断分支表条数是否在上限内。
 */
function isBranchesMapSmallEnough(e) {
  return Object.keys(e).length <= MAX_BRANCHES;
}
export { READREPOGITSTATE, serveReadRepoGitState };
