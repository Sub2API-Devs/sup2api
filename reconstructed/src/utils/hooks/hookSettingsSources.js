/**
 * utils/hooks/hookSettingsSources.ts
 *
 * 2.1.316 新增：钩子设置来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { usesSessionAccessToken } from "../sessionAccessToken.js";
import { env } from "../env.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getSessionIngressAuthToken } from "../sessionIngressAuth.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-e6aww6q8.js:824401-824577 placement
function sessionAccessTokenEnvForHooks(e) {
  if (
    !e ||
    !usesSessionAccessToken() ||
    env.CLAUDE_CODE_WORKER_EPOCH !== 1 ||
    isSettingSourceEnabled("projectSettings") ||
    isSettingSourceEnabled("localSettings")
  )
    return;
  let n = getSessionIngressAuthToken();
  return n ? { CLAUDE_CODE_SESSION_ACCESS_TOKEN: n } : void 0;
}
//@ chunk-e6aww6q8.js:824577-824732 placement
function isFlagSettingsSyncHook(e, n) {
  return (
    e.type === "command" &&
    e.async !== !0 &&
    e.asyncRewake !== !0 &&
    (getSettingsForSource("flagSettings")?.hooks?.[n] ?? []).some((r) =>
      r.hooks.some((hook) => isDeepStrictEqual_5(hook, e)),
    )
  );
}

export { isFlagSettingsSyncHook, sessionAccessTokenEnvForHooks };
