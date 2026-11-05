/**
 * services/mcpServe/uploadRules.ts
 *
 * 2.1.316 新增。mcp serve 的文件上传调用读取仓库权限规则（repo rules），读不到时拒绝并记 repo_rules_read_failed。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yxp63rfa.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readRepoRulesForRequest } from "./repoPermissionRules.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { composeRepoDenyAskRules } from "../../utils/permissions/repoRules.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";

//@ chunk-yxp63rfa.js:374-402 placement
var REPO_RULES_UNREAD = "repo_rules_unread";
//@ chunk-yxp63rfa.js:402-495 placement
/**
 * mcp serve 的文件上传调用读取仓库权限规则（repo rules），读不到时拒绝并记 repo_rules_read_failed。
 */
function uploadRulesForRequest(request, context) {
  let rulesRead = readRepoRulesForRequest(request, context.meta);
  return rulesRead instanceof Promise
    ? rulesRead.then((repoRules) => permissionContextWithRepoRules(repoRules, context))
    : permissionContextWithRepoRules(rulesRead, context);
}
//@ chunk-yxp63rfa.js:495-728 placement
/**
 * 把仓库规则并入启动权限上下文
 */
function permissionContextWithRepoRules(rulesRead, context) {
  if (rulesRead.refused !== undefined) {
    (rulesRead.refused.cause === "repo_rules_read_failed" ? logFeatureBad : logFeatureSad)(
      "mcp_serve_file_call",
      rulesRead.refused.cause,
    );
    return REPO_RULES_UNREAD;
  }
  return rulesRead.repoRules === undefined
    ? context.launchPermissionContext
    : buildUploadPermissionContext(context.launchPermissionContext, rulesRead.repoRules, context);
}
//@ chunk-yxp63rfa.js:728-861 placement
function buildUploadPermissionContext(launchPermissionContext, mergeOptions, { session }) {
  let launchRules = launchPermissionContext ?? getEmptyToolPermissionContext();
  return {
    ...launchRules,
    ...composeRepoDenyAskRules(
      {
        alwaysDenyRules: {},
        alwaysAskRules: {},
      },
      launchRules,
      getSessionProject(session).originalCwd,
      mergeOptions,
      "upload",
    ),
  };
}
export { REPO_RULES_UNREAD, uploadRulesForRequest };
