/**
 * services/design/designLogin.ts
 *
 * 2.1.316 新增：Claude Design 登录（浏览器登录、状态查询、错误说明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fbn843tx.js (3)
 * attribution: placement 3
 */
import { awaitPolicyLimitsColdStart } from "../policyLimits/PolicyLimitsClient.js";
import { UW } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import {
  readDesignOAuth,
  isDesignOAuthConfigured,
  runDesignLogin,
  isRemoteEnvironment,
} from "../oauth/designOAuth.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { safeParseJSON } from "../../utils/json.js";

/**
 * 返回 Claude Design 登录状态：是否可用、是否已登录、能否在此登录及原因。
 */
//@ chunk-fbn843tx.js:3839-4066 placement
async function designLoginStatus(credentials) {
  await awaitPolicyLimitsColdStart();
  let t = UW(),
    l = (await readDesignOAuth(credentials)) !== null,
    i = isDesignOAuthConfigured() ? void 0 : "The Claude Design sign-in is not configured in this build.";
  return { available: t, signed_in: l, can_sign_in_here: i === void 0, ...(i !== void 0 && { reason: i }) };
}
/**
 * 宿主侧的 Claude Design 登录：从 stdin 逐行读取手工粘贴的授权码（code#state），运行浏览器登录流程，把授权 URL 事件与最终结果以 JSON 行写出，并记录特性遥测。
 */
//@ chunk-fbn843tx.js:4066-5126 placement
async function runDesignLoginHost({ stdin: stdin, write: write, signal: signal }) {
  if ((await awaitPolicyLimitsColdStart(), !UW())) {
    await logFeatureBadAsync("design_login_host", "not_enabled");
    let e = { event: "done", ok: !1, message: "Claude Design sync is not available in this session." };
    return (await write(jsonStringify(e)), e);
  }
  let submitCode,
    abortController = new AbortController();
  if (signal.aborted) abortController.abort();
  else signal.addEventListener("abort", () => abortController.abort(), { once: !0 });
  (async () => {
    let e = "";
    for await (let a of stdin) {
      e += typeof a === "string" ? a : new TextDecoder().decode(a);
      let index = e.indexOf(`
`);
      while (index >= 0) {
        let trimmed = e.slice(0, index).trim();
        if (
          ((e = e.slice(index + 1)),
          (index = e.indexOf(`
`)),
          trimmed === "")
        )
          continue;
        let parsed = safeParseJSON(trimmed, !1),
          code =
            parsed !== null &&
            typeof parsed === "object" &&
            "code" in parsed &&
            typeof parsed.code === "string"
              ? parsed.code.trim()
              : void 0;
        if (code && submitCode) {
          let index = code.indexOf("#");
          submitCode(index >= 0 ? code.slice(0, index) : code, index >= 0 ? code.slice(index + 1) : "");
        }
      }
    }
    abortController.abort();
  })().catch(() => abortController.abort());
  let result = await runDesignLogin(abortController.signal, {
      onAuthUrl: (e, a) => {
        let o = { event: "pages", url: e, manual_url: a, manual_first: isRemoteEnvironment() };
        write(jsonStringify(o));
      },
      onManualCode: (e) => {
        submitCode = e;
      },
    }),
    doneEvent = result.ok
      ? { event: "done", ok: !0 }
      : { event: "done", ok: !1, message: designLoginFailureText(result) };
  if (result.ok) await logFeatureOkAsync("design_login_host");
  else await logFeatureBadAsync("design_login_host", result.reason);
  return (await write(jsonStringify(doneEvent)), doneEvent);
}
/**
 * 把 Design 登录失败原因转为提示文字。
 */
//@ chunk-fbn843tx.js:5126-5782 placement
function designLoginFailureText(result) {
  switch (result.reason) {
    case "interrupted":
      return "The sign-in was cancelled.";
    case "unconfigured":
      return "The Claude Design sign-in is not configured in this build.";
    case "remote":
      return "This session runs on a remote machine, so the browser sign-in cannot finish here.";
    case "timed_out":
      return "The browser sign-in timed out after five minutes. Try again.";
    case "code_refused":
      return result.message;
    case "failed":
      return `The browser sign-in failed (${result.cause ?? "unknown error"}). Try again.`;
    case "invalid":
      return "The sign-in did not return a usable credential. Try again.";
    case "save_failed":
      return "The credential could not be saved to secure storage. Try again.";
  }
}
