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
import { isDesignSyncAllowed } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import {
  readDesignOAuth,
  isDesignOAuthConfigured,
  runDesignLogin,
  isRemoteEnvironment,
} from "../oauth/designOAuth.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { safeParseJSON } from "../../utils/json.js";

//@ chunk-fbn843tx.js:3839-4066 placement
/**
 * 返回 Claude Design 登录状态：是否可用、是否已登录、能否在此登录及原因。
 */
async function designLoginStatus(credentials) {
  await awaitPolicyLimitsColdStart();
  let available = isDesignSyncAllowed();
  let signedIn = (await readDesignOAuth(credentials)) !== null;
  let notice = isDesignOAuthConfigured()
    ? undefined
    : "The Claude Design sign-in is not configured in this build.";
  return {
    available,
    signed_in: signedIn,
    can_sign_in_here: notice === undefined,
    ...(notice !== undefined && {
      reason: notice,
    }),
  };
}
//@ chunk-fbn843tx.js:4066-5126 placement
/**
 * 宿主侧的 Claude Design 登录：从 stdin 逐行读取手工粘贴的授权码（code#state），运行浏览器登录流程，把授权 URL 事件与最终结果以 JSON 行写出，并记录特性遥测。
 */
async function runDesignLoginHost({ stdin, write, signal }) {
  await awaitPolicyLimitsColdStart();
  if (!isDesignSyncAllowed()) {
    await logFeatureBadAsync("design_login_host", "not_enabled");
    let notEnabledEvent = {
      event: "done",
      ok: false,
      message: "Claude Design sync is not available in this session.",
    };
    await write(jsonStringify(notEnabledEvent));
    return notEnabledEvent;
  }
  let submitCode;
  let abortController = new AbortController();
  if (signal.aborted) abortController.abort();
  else
    signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });
  (async () => {
    let buffer = "";
    for await (let chunk of stdin) {
      buffer += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      let index = buffer.indexOf(`
`);
      while (index >= 0) {
        let trimmed = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf(`
`);
        if (trimmed === "") continue;
        let parsed = safeParseJSON(trimmed, false);
        let code =
          parsed !== null && typeof parsed === "object" && "code" in parsed && typeof parsed.code === "string"
            ? parsed.code.trim()
            : undefined;
        if (code && submitCode) {
          let index = code.indexOf("#");
          submitCode(index >= 0 ? code.slice(0, index) : code, index >= 0 ? code.slice(index + 1) : "");
        }
      }
    }
    abortController.abort();
  })().catch(() => abortController.abort());
  let result = await runDesignLogin(abortController.signal, {
    onAuthUrl: (url, manualUrl) => {
      let pagesEvent = {
        event: "pages",
        url,
        manual_url: manualUrl,
        manual_first: isRemoteEnvironment(),
      };
      write(jsonStringify(pagesEvent));
    },
    onManualCode: (handler) => {
      submitCode = handler;
    },
  });
  let doneEvent = result.ok
    ? {
        event: "done",
        ok: true,
      }
    : {
        event: "done",
        ok: false,
        message: designLoginFailureText(result),
      };
  if (result.ok) await logFeatureOkAsync("design_login_host");
  else await logFeatureBadAsync("design_login_host", result.reason);
  await write(jsonStringify(doneEvent));
  return doneEvent;
}
//@ chunk-fbn843tx.js:5126-5782 placement
/**
 * 把 Design 登录失败原因转为提示文字。
 */
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
export { designLoginStatus, runDesignLoginHost };
