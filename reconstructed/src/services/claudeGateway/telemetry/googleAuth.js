/**
 * services/claudeGateway/telemetry/googleAuth.ts
 *
 * 2.1.316 新增：网关遥测的 Google 认证
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (4)
 * attribution: placement 4
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { createCaTransporterOptions } from "../network.js";
import { withTimeout } from "../../../utils/sleep.js";
import { truncateAtWord } from "../../../utils/stringUtils.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-1ny7cxrt.js:1386128-1386207 placement
/**
 * 请求 Google 服务账号令牌时使用的 cloud-platform scope 列表。
 */
var GOOGLE_CLOUD_PLATFORM_SCOPE = ["https://www.googleapis.com/auth/cloud-platform"];
var GOOGLEAPIS_COM = "googleapis.com";
//@ chunk-1ny7cxrt.js:1386207-1386859 placement
/**
 * 检查 auth.google 目标：必须 https、googleapis.com 主机、且不自带 Authorization 头。
 */
function validateGoogleAuthTarget(url, headers) {
  let n;
  try {
    n = new URL(url);
  } catch {
    return ["auth.google needs a url that parses"];
  }
  let replaced = n.hostname.replace(/\.$/, "");
  let r = [];
  if (n.protocol !== "https:")
    r.push(
      "auth.google needs an https:// url: over http:// the access token would cross the network unencrypted",
    );
  if (!(
    replaced === GOOGLEAPIS_COM ||
    (replaced.endsWith(`.${GOOGLEAPIS_COM}`) && !replaced.split(".").includes(""))
  ))
    r.push(
      `auth.google sends a Google access token, so url must be a ${GOOGLEAPIS_COM} host such as https://telemetry.googleapis.com (got ${replaced})`,
    );
  if (Object.keys(headers).some((key) => key.toLowerCase() === "authorization"))
    r.push(
      "auth.google sets the Authorization header on each export: remove Authorization from headers, or remove auth",
    );
  return r;
}
//@ chunk-1ny7cxrt.js:1386859-1386869 placement
/**
 * 获取 Google 令牌的超时秒数（10）。
 */
var GOOGLE_TOKEN_TIMEOUT_SEC = 10;
//@ chunk-1ny7cxrt.js:1386869-1387514 placement
/**
 * 懒加载 google-auth 库，返回获取 Authorization（及 x-goog-user-project）头的函数（带超时，失败时重置）。
 */
function createGoogleHeaderProvider(e) {
  let t;
  return async () => {
    let { GoogleAuth, gcpMetadata } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1));
    t ??= new GoogleAuth({
      scopes: GOOGLE_CLOUD_PLATFORM_SCOPE,
      projectId: "unused",
      ...(e.service_account_json && {
        keyFilename: e.service_account_json,
      }),
      clientOptions: createCaTransporterOptions(),
    });
    try {
      let r = await withTimeout(
        t.getRequestHeaders(),
        GOOGLE_TOKEN_TIMEOUT_SEC * 1000,
        `no Google credentials or token within ${GOOGLE_TOKEN_TIMEOUT_SEC} s`,
      );
      let s = r.get("authorization");
      if (!s) throw Error("Google's library returned no Authorization header");
      let a = r.get("x-goog-user-project");
      return {
        authorization: s,
        ...(a && {
          "x-goog-user-project": a,
        }),
      };
    } catch (error) {
      t = undefined;
      gcpMetadata.resetIsAvailableCache();
      throw Error(`no Google access token: ${truncateAtWord(errorMessage(error), 500)}`);
    }
  };
}
export { validateGoogleAuthTarget, createGoogleHeaderProvider };
