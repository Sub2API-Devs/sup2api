/**
 * services/mcpServe/repoPermissionRules.ts
 *
 * 2.1.316 新增：claude mcp serve 读取仓库权限规则（anthropic/repoRulesReadHere）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y12tyg2v.js (8)
 * attribution: placement 8
 */
import {
  shouldAllowManagedPermissionRulesOnly,
  settingsJsonToRules,
} from "../../utils/permissions/permissionsLoader.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { readRepoDirSettingsFresh } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, zodStrictObject, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { waitForRemoteManagedSettingsFetchToSettle } from "../remoteManagedSettings/loader.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-y12tyg2v.js:591-614 placement
var o = { deny: [], ask: [] };
//@ chunk-y12tyg2v.js:614-793 placement
function readRepoPermissionRules() {
  return shouldAllowManagedPermissionRulesOnly()
    ? { userSettings: o, projectSettings: o, localSettings: o }
    : {
        userSettings: readSourceRules("userSettings"),
        projectSettings: readSourceRules("projectSettings"),
        localSettings: readSourceRules("localSettings"),
      };
}
/**
 * 读取某设置来源中的仓库权限规则：来源未启用返回空；文件读取失败时记录并只使用另一份可读文件的规则。
 */
//@ chunk-y12tyg2v.js:793-1186 placement
function readSourceRules(e) {
  if (!isSettingSourceEnabled(e)) return o;
  let r = readRepoDirSettingsFresh(e);
  switch (r.kind) {
    case "in_effect":
      return i(r.settings, e);
    case "unreadable_for_now":
      return i(r.settingsAsLastRead, e);
    case "some_do_not_load":
    case "unreadable":
      return (
        logForDebugging(`A settings file of ${e} did not load, so none of its permission rules apply`, {
          level: "warn",
        }),
        logFeatureSad("mcp_serve_tool_host_permission", "repo_rules_file_unread"),
        i(r.settingsOfTheOtherFile, e)
      );
  }
}
//@ chunk-y12tyg2v.js:1186-1256 placement
function i(e, r) {
  let s = settingsJsonToRules(e, r);
  return { deny: hasBashPermission(s, "deny"), ask: hasBashPermission(s, "ask") };
}
//@ chunk-y12tyg2v.js:1256-1339 placement = hasBashPermission (1)
function hasBashPermission(e, r) {
  return e.filter((rule) => rule.ruleBehavior === r).map((s) => formatPermissionRule(s.ruleValue));
}
//@ chunk-y12tyg2v.js:1339-1441 placement
var ANTHROPIC_REPORULESREADHERE = "anthropic/repoRulesReadHere",
  D = { [ANTHROPIC_REPORULESREADHERE]: { v: 1 } },
  c = DoctorLazy(() => u({ [ANTHROPIC_REPORULESREADHERE]: zodStrictObject({ v: T(1) }) })),
  m = { repoRules: void 0 };
//@ chunk-y12tyg2v.js:1441-1743 placement
function readRepoRulesForRequest(e, r) {
  if (!isPlainObject(r) || !Object.hasOwn(r, ANTHROPIC_REPORULESREADHERE)) return m;
  return c().safeParse(r).success
    ? readRepoRulesForCall(e)
    : {
        refused: {
          cause: "repo_rules_ask_malformed",
          message: `${e} was not run: its request asks this server to read the repository's permission rules in a form that this server does not know. Retrying won't help.`,
        },
      };
}
//@ chunk-y12tyg2v.js:1743-2039 placement
async function readRepoRulesForCall(e) {
  try {
    return (await waitForRemoteManagedSettingsFetchToSettle(), { repoRules: readRepoPermissionRules() });
  } catch (error) {
    return (
      logForDebugging(`The repo's permission rules could not be read: ${errorMessage(error)}`, {
        level: "error",
      }),
      {
        refused: {
          cause: "repo_rules_read_failed",
          message: `${e} was not run: this server could not read the repository's permission rules to judge it.`,
        },
      }
    );
  }
}

export { readRepoRulesForRequest };
