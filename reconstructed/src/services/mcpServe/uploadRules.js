/**
 * services/mcpServe/uploadRules.ts
 *
 * 2.1.316 新增。mcp serve 的文件上传调用读取仓库权限规则（repo rules），读不到时拒绝并记 repo_rules_read_failed。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-11e3jmt7.js (4)
 * attribution: placement 4
 */
import { readRepoRulesForRequest } from "./repoPermissionRules.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { composeRepoDenyAskRules } from "../../utils/permissions/repoRules.js";
import { xo } from "../../bootstrap/sessionSlices.js";

//@ chunk-11e3jmt7.js:374-402 placement
var REPO_RULES_UNREAD = "repo_rules_unread";
/**
 * mcp serve 的文件上传调用读取仓库权限规则（repo rules），读不到时拒绝并记 repo_rules_read_failed。
 */
//@ chunk-11e3jmt7.js:402-495 placement
function uploadRulesForRequest(e, o) {
  let t = readRepoRulesForRequest(e, o.meta);
  return t instanceof Promise
    ? t.then((r) => permissionContextWithRepoRules(r, o))
    : permissionContextWithRepoRules(t, o);
}
/**
 * 把仓库规则并入启动权限上下文
 */
//@ chunk-11e3jmt7.js:495-728 placement
function permissionContextWithRepoRules(e, o) {
  if (e.refused !== void 0)
    return (
      (e.refused.cause === "repo_rules_read_failed" ? logFeatureBad : logFeatureSad)(
        "mcp_serve_file_call",
        e.refused.cause,
      ),
      REPO_RULES_UNREAD
    );
  return e.repoRules === void 0
    ? o.launchPermissionContext
    : buildUploadPermissionContext(o.launchPermissionContext, e.repoRules, o);
}
//@ chunk-11e3jmt7.js:728-861 placement
function buildUploadPermissionContext(e, o, { session: session }) {
  let r = e ?? getEmptyToolPermissionContext();
  return {
    ...r,
    ...composeRepoDenyAskRules(
      { alwaysDenyRules: {}, alwaysAskRules: {} },
      r,
      xo(session).originalCwd,
      o,
      "upload",
    ),
  };
}

export { REPO_RULES_UNREAD };
