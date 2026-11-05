/**
 * utils/hooks/hookSettingsSources.ts
 *
 * 2.1.316 新增：钩子设置来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { isDeepStrictEqual } from "util";
import { usesSessionAccessToken } from "../sessionAccessToken.js";
import { env } from "../env.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getSessionIngressAuthToken } from "../sessionIngressAuth.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-5xgkngpb.js:836017-836193 placement
function sessionAccessTokenEnvForHooks(hookEnv) {
  if (
    !hookEnv ||
    !usesSessionAccessToken() ||
    env.CLAUDE_CODE_WORKER_EPOCH !== 1 ||
    isSettingSourceEnabled("projectSettings") ||
    isSettingSourceEnabled("localSettings")
  )
    return;
  let sessionIngressAuthToken = getSessionIngressAuthToken();
  return sessionIngressAuthToken
    ? {
        CLAUDE_CODE_SESSION_ACCESS_TOKEN: sessionIngressAuthToken,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:836193-836348 placement
function isFlagSettingsSyncHook(hook, hookEvent) {
  return (
    hook.type === "command" &&
    hook.async !== true &&
    hook.asyncRewake !== true &&
    (getSettingsForSource("flagSettings")?.hooks?.[hookEvent] ?? []).some((matcher) =>
      matcher.hooks.some((hook_2) => isDeepStrictEqual(hook_2, hook)),
    )
  );
}
export { isFlagSettingsSyncHook, sessionAccessTokenEnvForHooks };
