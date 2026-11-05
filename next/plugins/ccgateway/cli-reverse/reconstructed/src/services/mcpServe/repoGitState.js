/**
 * services/mcpServe/repoGitState.ts
 *
 * 2.1.316 新增：mcp serve 读取仓库 git 状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  record,
  stringSchema,
  array,
  discriminatedUnion,
  literal,
  booleanSchema,
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

//@ chunk-xrwmcqkn.js:46092-46578 placement
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
  objectSchema({
    branches: record(
      stringSchema().max(MAX_BRANCH_NAME_CHARS),
      stringSchema().max(MAX_REF_CHARS).nullable(),
    ).refine(isBranchesMapSmallEnough),
    events: array(
      discriminatedUnion("subtype", [
        objectSchema({
          subtype: literal("code_change_published"),
          url: stringSchema().max(MAX_REPO_URL_CHARS),
          action: SDKSystemCodeChangePublishedMessageSchema().shape.action.unwrap(),
          branch: stringSchema().refine(isSafeBranchName).optional(),
        }),
        objectSchema({
          subtype: literal("vcs_state_changed"),
          kind: SDKSystemVcsStateChangedMessageSchema().shape.kind,
          cwd: stringSchema().max(MAX_CWD_CHARS).regex(SAFE_ABSOLUTE_PATH_RE),
          branch: stringSchema().refine(isSafeBranchName).optional(),
        }),
      ])
        .nullable()
        .catch(null),
    ).max(MAX_EVENTS),
    cut: booleanSchema().optional(),
  }),
);
//@ chunk-xrwmcqkn.js:46578-47467 placement
async function serveReadRepoGitState(input, signal, { callerGone }) {
  let checkouts = [...getRepoCheckouts()];
  let cut = checkouts.length > MAX_BRANCHES;
  let branchEntries = [];
  for (let [branchName, checkout] of checkouts.slice(0, MAX_BRANCHES)) {
    if (branchName.length > MAX_BRANCH_NAME_CHARS) {
      cut = true;
      continue;
    }
    let cwd = resolveCheckoutPath(checkout);
    if (cwd === null) continue;
    let gitDir = await refreshGitDir(cwd);
    if (gitDir !== null) {
      let gitHead = await readGitHead(gitDir);
      branchEntries.push([
        branchName,
        gitHead?.type === "branch" && isSafeBranchName(gitHead.name) ? gitHead.name : null,
      ]);
    }
  }
  await settlePendingPrLinks();
  signal.throwIfAborted();
  callerGone?.throwIfAborted();
  let events = [];
  for (let notification of drainTaskNotifications()) {
    if (notification.type !== "system") continue;
    if (notification.subtype === "code_change_published")
      events.push({
        subtype: notification.subtype,
        url: notification.url,
        action: notification.action,
        ...(notification.branch !== undefined && {
          branch: notification.branch,
        }),
      });
    else if (notification.subtype === "vcs_state_changed") {
      if (notification.cwd.length > MAX_CWD_CHARS || !SAFE_ABSOLUTE_PATH_RE.test(notification.cwd)) {
        cut = true;
        continue;
      }
      events.push({
        subtype: notification.subtype,
        kind: notification.kind,
        cwd: notification.cwd,
        ...("branch" in notification &&
          notification.branch !== undefined &&
          isSafeBranchName(notification.branch) && {
            branch: notification.branch,
          }),
      });
    }
  }
  cut ||= events.length > MAX_EVENTS;
  let sliced = events.slice(-MAX_EVENTS);
  return {
    summary: `${branchEntries.length} checkouts, ${sliced.length} events`,
    output: {
      branches: Object.fromEntries(branchEntries),
      events: sliced,
      ...(cut && {
        cut,
      }),
    },
  };
}
//@ chunk-xrwmcqkn.js:47467-47515 placement
/**
 * 判断分支表条数是否在上限内。
 */
function isBranchesMapSmallEnough(branches) {
  return Object.keys(branches).length <= MAX_BRANCHES;
}
export { READREPOGITSTATE, serveReadRepoGitState };
