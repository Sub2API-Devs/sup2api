/**
 * services/claudeGateway/auth/googleGroups.ts
 *
 * 2.1.316 新增：网关 Google 组成员校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */
import { readFile, readFile as readFile_2, readFile as readFile_3 } from "fs/promises";
import { jsonParse } from "../../../utils/slowOperations.js";
import { importPKCS8 } from "../../../../vendor/jose/dist/webapi/key/import.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";
import { Rf } from "../network.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";

//@ chunk-1ny7cxrt.js:1314722-1314895 placement
var HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN = "https://oauth2.googleapis.com/token",
  YB = "https://admin.googleapis.com/admin/directory/v1/groups",
  JB = "https://www.googleapis.com/auth/admin.directory.group.readonly";
/**
 * 用 Google 服务账号（JWT bearer，代管理员身份）换取访问令牌（缓存到过期前 60 秒），返回按用户查询所属 Google 组邮箱的函数（分页最多 50 页）；失败抛 GOOGLE_GROUPS_UNAVAILABLE。
 */
//@ chunk-1ny7cxrt.js:1314895-1316760 placement
async function createGoogleGroupsLookup(e) {
  let t = await readFile_2(e.service_account_json_path, "utf8"),
    serviceAccount = jsonParse(t);
  if (typeof serviceAccount.client_email !== "string" || typeof serviceAccount.private_key !== "string")
    throw Error(
      `oidc.google_groups: ${e.service_account_json_path} is not a Google service-account key (missing client_email or private_key)`,
    );
  let privateKey = await importPKCS8(serviceAccount.private_key, "RS256"),
    cachedToken;
  async function getAccessToken() {
    let floored = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.exp - 60 > floored) return cachedToken.token;
    let sign = await new SignJWT({ scope: JB })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuer(serviceAccount.client_email)
        .setSubject(e.admin_email)
        .setAudience(HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN)
        .setIssuedAt(floored)
        .setExpirationTime(floored + 3600)
        .sign(privateKey),
      c = await Rf(HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: sign,
        }),
        signal: AbortSignal.timeout(1e4),
      });
    if (!c.ok) throw Error(`google token endpoint ${c.status}: ${(await c.text()).slice(0, 500)}`);
    let body = await c.json();
    if (typeof body.access_token !== "string") throw Error("google token endpoint returned no access_token");
    return (
      (cachedToken = { token: body.access_token, exp: floored + (body.expires_in ?? 3600) }),
      body.access_token
    );
  }
  return async function (l) {
    try {
      let c = await getAccessToken(),
        u = [],
        f;
      for (let h = 0; h < 50; h++) {
        let m = new URL(YB);
        if ((m.searchParams.set("userKey", l), m.searchParams.set("maxResults", "200"), f))
          m.searchParams.set("pageToken", f);
        let y = await Rf(m, { headers: { authorization: `Bearer ${c}` }, signal: AbortSignal.timeout(1e4) });
        if (!y.ok) {
          if (y.status === 401) cachedToken = void 0;
          throw Error(`directory API ${y.status}: ${(await y.text()).slice(0, 500)}`);
        }
        let body = await y.json();
        for (let w of body.groups ?? []) if (typeof w.email === "string") u.push(w.email.toLowerCase());
        if (((f = body.nextPageToken), !f)) break;
      }
      return u;
    } catch (error) {
      let u = error instanceof Error ? error.message : String(error);
      throw (
        gatewayLog("warn", `google_groups lookup failed: ${u}`),
        Object.assign(Error(`google_groups lookup failed: ${u}`), { code: "GOOGLE_GROUPS_UNAVAILABLE" })
      );
    }
  };
}

export { createGoogleGroupsLookup };
