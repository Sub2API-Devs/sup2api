/**
 * services/mcpServe/orgHookLists.ts
 *
 * mcp serve 模式下读取组织的 HTTP hook 列表并执行：无登录时的说明、初始化沙箱、返回值组装与 project 作用域的条目拼接（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m2gb6h8m.js (7)
 * attribution: placement 7
 */
import { getAccessTokenWithCcrFallback } from "../../utils/teleport/api.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  waitForRemoteManagedSettingsToLoad,
} from "../remoteManagedSettings/loader.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { AbortError } from "../../utils/errors.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { execHttpHook } from "../../utils/hooks/execHttpHook.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../utils/hooks/hookEvents.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { settingsMergeCustomizer } from "../../utils/settings/settings.js";
import { relayStateSlot } from "./mcpRelayCalls.js";
import { isMcpToolHookUnsupportedEvent } from "../../utils/hooks/hookInputRewrite.js";
import { getMcpConfigByName } from "../mcp/config.js";

//@ chunk-m2gb6h8m.js:12302-12396 placement
/**
 * 本机无登录、组织 HTTP hook 列表读不到的说明。
 */
var NO_SIGN_IN_MESSAGE =
  "this machine holds no sign-in, so the organization's HTTP hook lists cannot be read";
//@ chunk-m2gb6h8m.js:12396-12432 placement
/**
 * 判定本机是否有可用登录。
 */
function hasSignIn() {
  return Boolean(getAccessTokenWithCcrFallback());
}
//@ chunk-m2gb6h8m.js:12432-12469 placement
/**
 * 取组织 hook 列表的读取来源。
 */
function waitForManagedSettings() {
  return hasManagedSettings()
    ? waitForRemoteManagedSettingsFetchToSettle()
    : waitForRemoteManagedSettingsToLoad();
}
//@ chunk-m2gb6h8m.js:12469-12570 placement
/**
 * 初始化 hook 执行所需环境与沙箱。
 */
async function settleBeforeHookRun(signal) {
  await raceWithAbortSignal(waitForManagedSettings(), signal, () => new AbortError());
  if (SandboxManager.isSandboxingEnabled()) await SandboxManager.initialize();
}
//@ chunk-m2gb6h8m.js:12570-13044 placement
/**
 * 执行一条组织 HTTP hook，返回 stdout/stderr/status（可带 httpStatus）。
 */
async function runHttpHook(hook, hookEvent, stdin, timeout, signal, flagLists, organizationLists) {
  if (!hasSignIn() && organizationLists === undefined) {
    let message = NO_SIGN_IN_MESSAGE;
    return {
      stdout: "",
      stderr: message,
      output: message,
      status: 1,
    };
  }
  let result = await execHttpHook(
    {
      ...hook,
      timeout: timeout ?? hook.timeout,
    },
    hookEvent,
    jsonStringify(stdin),
    signal,
    TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    undefined,
    undefined,
    true,
    {
      isRepoHookOfThisContainer: true,
      flagLists: mergeWithAssigner_2(
        {
          ...(hasSignIn() ? undefined : organizationLists),
        },
        flagLists,
        settingsMergeCustomizer,
      ),
    },
  );
  if (result.aborted)
    return {
      stdout: "",
      stderr: "",
      output: "",
      status: 1,
      aborted: true,
    };
  let body = result.ok ? result.body : "";
  let error = result.error ?? "";
  return {
    stdout: body,
    stderr: error,
    output: `${body}${error}`,
    status: result.ok ? 0 : 1,
    ...(result.statusCode !== undefined && {
      httpStatus: result.statusCode,
    }),
  };
}
//@ chunk-m2gb6h8m.js:13044-13183 placement
/**
 * 判定某 server 是否为本轮尚未列出的 project 作用域 server。
 */
function isProjectMcpHookUnlisted(hook, hookInput, session) {
  let { listed, round } = relayStateSlot.of(session);
  return (
    !isMcpToolHookUnsupportedEvent(hookInput) &&
    listed.project.size === 0 &&
    round.project === undefined &&
    getMcpConfigByName(hook.server)?.scope === "project"
  );
}
//@ chunk-m2gb6h8m.js:13183-13386 placement
/**
 * 汇总本轮 project 作用域的 server 行与已结算结果。
 */
function collectProjectMcpHooks({ listed, round }) {
  let { rows = [], settled, hasEnded } = round.project ?? {};
  return [
    ...listed.project.values(),
    ...(hasEnded ? [] : rows).flatMap((row) => {
      let settleState = settled?.get(row.name);
      return settleState === undefined ? [row] : settleState.live ? [settleState.live] : [];
    }),
  ];
}
export {
  settleBeforeHookRun,
  runHttpHook,
  waitForManagedSettings,
  hasSignIn,
  isProjectMcpHookUnlisted,
  NO_SIGN_IN_MESSAGE,
  collectProjectMcpHooks,
};
