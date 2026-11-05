/**
 * services/claudeGateway/telemetry/googleAuth.ts
 *
 * 2.1.316 新增：网关遥测的 Google 认证
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (4)
 * attribution: placement 4
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { createCaTransporterOptions } from "../network.js";
import { withTimeout } from "../../../utils/sleep.js";
import { truncateAtWord } from "../../../utils/stringUtils.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-1hnjmk23.js:1387965-1388044 placement
/**
 * 请求 Google 服务账号令牌时使用的 cloud-platform scope 列表。
 */
var GOOGLE_CLOUD_PLATFORM_SCOPE = ["https://www.googleapis.com/auth/cloud-platform"];
var GOOGLEAPIS_COM = "googleapis.com";
//@ chunk-1hnjmk23.js:1388044-1388696 placement
/**
 * 检查 auth.google 目标：必须 https、googleapis.com 主机、且不自带 Authorization 头。
 */
function validateGoogleAuthTarget(url, headers) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return ["auth.google needs a url that parses"];
  }
  let replaced = parsed.hostname.replace(/\.$/, "");
  let problems = [];
  if (parsed.protocol !== "https:")
    problems.push(
      "auth.google needs an https:// url: over http:// the access token would cross the network unencrypted",
    );
  if (!(
    replaced === GOOGLEAPIS_COM ||
    (replaced.endsWith(`.${GOOGLEAPIS_COM}`) && !replaced.split(".").includes(""))
  ))
    problems.push(
      `auth.google sends a Google access token, so url must be a ${GOOGLEAPIS_COM} host such as https://telemetry.googleapis.com (got ${replaced})`,
    );
  if (Object.keys(headers).some((key) => key.toLowerCase() === "authorization"))
    problems.push(
      "auth.google sets the Authorization header on each export: remove Authorization from headers, or remove auth",
    );
  return problems;
}
//@ chunk-1hnjmk23.js:1388696-1388706 placement
/**
 * 获取 Google 令牌的超时秒数（10）。
 */
var GOOGLE_TOKEN_TIMEOUT_SEC = 10;
//@ chunk-1hnjmk23.js:1388706-1389351 placement
/**
 * 懒加载 google-auth 库，返回获取 Authorization（及 x-goog-user-project）头的函数（带超时，失败时重置）。
 */
function createGoogleHeaderProvider(opts) {
  let auth;
  return async () => {
    let { GoogleAuth, gcpMetadata } = await import("../../../utils/lazyDefaultExport.js").then((mod) =>
      __toESM(mod.default, 1),
    );
    auth ??= new GoogleAuth({
      scopes: GOOGLE_CLOUD_PLATFORM_SCOPE,
      projectId: "unused",
      ...(opts.service_account_json && {
        keyFilename: opts.service_account_json,
      }),
      clientOptions: createCaTransporterOptions(),
    });
    try {
      let headers = await withTimeout(
        auth.getRequestHeaders(),
        GOOGLE_TOKEN_TIMEOUT_SEC * 1000,
        `no Google credentials or token within ${GOOGLE_TOKEN_TIMEOUT_SEC} s`,
      );
      let token = headers.get("authorization");
      if (!token) throw Error("Google's library returned no Authorization header");
      let err = headers.get("x-goog-user-project");
      return {
        authorization: token,
        ...(err && {
          "x-goog-user-project": err,
        }),
      };
    } catch (error) {
      auth = undefined;
      gcpMetadata.resetIsAvailableCache();
      throw Error(`no Google access token: ${truncateAtWord(errorMessage(error), 500)}`);
    }
  };
}
export { validateGoogleAuthTarget, createGoogleHeaderProvider };
