/**
 * services/mcpServe/repoPermissionRules.ts
 *
 * 2.1.316 新增：claude mcp serve 读取仓库权限规则（anthropic/repoRulesReadHere）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y6nystvv.js (8)
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
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, zodStrictObject, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { waitForRemoteManagedSettingsFetchToSettle } from "../remoteManagedSettings/loader.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y6nystvv.js:591-614 placement
/**
 * 空的 deny/ask 规则表。
 */
var EMPTY_RULES = {
  deny: [],
  ask: [],
};
//@ chunk-y6nystvv.js:614-793 placement
function readRepoPermissionRules() {
  return shouldAllowManagedPermissionRulesOnly()
    ? {
        userSettings: EMPTY_RULES,
        projectSettings: EMPTY_RULES,
        localSettings: EMPTY_RULES,
      }
    : {
        userSettings: readSourceRules("userSettings"),
        projectSettings: readSourceRules("projectSettings"),
        localSettings: readSourceRules("localSettings"),
      };
}
//@ chunk-y6nystvv.js:793-1186 placement
/**
 * 读取某设置来源中的仓库权限规则：来源未启用返回空；文件读取失败时记录并只使用另一份可读文件的规则。
 */
function readSourceRules(source) {
  if (!isSettingSourceEnabled(source)) return EMPTY_RULES;
  let repoDirSettingsFresh = readRepoDirSettingsFresh(source);
  switch (repoDirSettingsFresh.kind) {
    case "in_effect":
      return readBashRules(repoDirSettingsFresh.settings, source);
    case "unreadable_for_now":
      return readBashRules(repoDirSettingsFresh.settingsAsLastRead, source);
    case "some_do_not_load":
    case "unreadable":
      logForDebugging(`A settings file of ${source} did not load, so none of its permission rules apply`, {
        level: "warn",
      });
      logFeatureSad("mcp_serve_tool_host_permission", "repo_rules_file_unread");
      return readBashRules(repoDirSettingsFresh.settingsOfTheOtherFile, source);
  }
}
//@ chunk-y6nystvv.js:1186-1256 placement
/**
 * 从设置里取出 bash 相关的 deny/ask 规则。
 */
function readBashRules(settings, source) {
  let rules = settingsJsonToRules(settings, source);
  return {
    deny: hasBashPermission(rules, "deny"),
    ask: hasBashPermission(rules, "ask"),
  };
}
//@ chunk-y6nystvv.js:1256-1339 placement (2.1.88 match: hasBashPermission, 1)
function hasBashPermission(rules, behavior) {
  return rules
    .filter((rule) => rule.ruleBehavior === behavior)
    .map((rule) => permissionRuleValueFromString(rule.ruleValue));
}
//@ chunk-y6nystvv.js:1339-1441 placement
/**
 * 没有仓库规则时的默认值。
 */
var ANTHROPIC_REPORULESREADHERE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REPO_RULES_READ_HERE_CAPABILITY;
var repoRulesReadHereSchema;
var NO_REPO_RULES;
deferInit("chunk-y6nystvv.js:1339", () => {
  ANTHROPIC_REPORULESREADHERE = "anthropic/repoRulesReadHere";
  REPO_RULES_READ_HERE_CAPABILITY = {
    [ANTHROPIC_REPORULESREADHERE]: {
      v: 1,
    },
  };
  repoRulesReadHereSchema = DoctorLazy(() =>
    objectSchema({
      [ANTHROPIC_REPORULESREADHERE]: zodStrictObject({
        v: literal(1),
      }),
    }),
  );
  NO_REPO_RULES = {
    repoRules: undefined,
  };
});
//@ chunk-y6nystvv.js:1441-1743 placement
function readRepoRulesForRequest(input, meta) {
  if (!isPlainObject(meta) || !Object.hasOwn(meta, ANTHROPIC_REPORULESREADHERE)) return NO_REPO_RULES;
  return repoRulesReadHereSchema().safeParse(meta).success
    ? readRepoRulesForCall(input)
    : {
        refused: {
          cause: "repo_rules_ask_malformed",
          message: `${input} was not run: its request asks this server to read the repository's permission rules in a form that this server does not know. Retrying won't help.`,
        },
      };
}
//@ chunk-y6nystvv.js:1743-2039 placement
async function readRepoRulesForCall(input) {
  try {
    await waitForRemoteManagedSettingsFetchToSettle();
    return {
      repoRules: readRepoPermissionRules(),
    };
  } catch (error) {
    logForDebugging(`The repo's permission rules could not be read: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      refused: {
        cause: "repo_rules_read_failed",
        message: `${input} was not run: this server could not read the repository's permission rules to judge it.`,
      },
    };
  }
}
export { readRepoRulesForRequest };
