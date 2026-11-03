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
import { $u } from "../network.js";
import { withTimeout } from "../../../utils/sleep.js";
import { truncateAtWord } from "../../../utils/stringUtils.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-1ny7cxrt.js:1386128-1386207 placement
var J_e = ["https://www.googleapis.com/auth/cloud-platform"],
  GOOGLEAPIS_COM = "googleapis.com";
/**
 * 检查 auth.google 目标：必须 https、googleapis.com 主机、且不自带 Authorization 头。
 */
//@ chunk-1ny7cxrt.js:1386207-1386859 placement
function validateGoogleAuthTarget(e, t) {
  let n;
  try {
    n = new URL(e);
  } catch {
    return ["auth.google needs a url that parses"];
  }
  let replaced = n.hostname.replace(/\.$/, ""),
    r = [];
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
  if (Object.keys(t).some((a) => a.toLowerCase() === "authorization"))
    r.push(
      "auth.google sets the Authorization header on each export: remove Authorization from headers, or remove auth",
    );
  return r;
}
//@ chunk-1ny7cxrt.js:1386859-1386869 placement
var Uz = 10;
/**
 * 懒加载 google-auth 库，返回获取 Authorization（及 x-goog-user-project）头的函数（带超时，失败时重置）。
 */
//@ chunk-1ny7cxrt.js:1386869-1387514 placement
function createGoogleHeaderProvider(e) {
  let t;
  return async () => {
    let { GoogleAuth: GoogleAuth, gcpMetadata: gcpMetadata } = await import("./chunk-ndb2dret.js").then((m) =>
      Re(m.default, 1),
    );
    t ??= new GoogleAuth({
      scopes: J_e,
      projectId: "unused",
      ...(e.service_account_json && { keyFilename: e.service_account_json }),
      clientOptions: $u(),
    });
    try {
      let r = await withTimeout(
          t.getRequestHeaders(),
          Uz * 1000,
          `no Google credentials or token within ${Uz} s`,
        ),
        s = r.get("authorization");
      if (!s) throw Error("Google's library returned no Authorization header");
      let a = r.get("x-goog-user-project");
      return { authorization: s, ...(a && { "x-goog-user-project": a }) };
    } catch (error) {
      throw (
        (t = void 0),
        gcpMetadata.resetIsAvailableCache(),
        Error(`no Google access token: ${truncateAtWord(errorMessage(error), 500)}`)
      );
    }
  };
}

export { validateGoogleAuthTarget, createGoogleHeaderProvider };
