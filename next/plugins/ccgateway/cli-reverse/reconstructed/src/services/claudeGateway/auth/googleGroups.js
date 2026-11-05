/**
 * services/claudeGateway/auth/googleGroups.ts
 *
 * 2.1.316 新增：网关 Google 组成员校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 */
import { readFile } from "fs/promises";
import { jsonParse } from "../../../utils/slowOperations.js";
import { importPKCS8 } from "../../../../vendor/jose/dist/webapi/key/import.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";
import { fetchWithCa } from "../network.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";

//@ chunk-1hnjmk23.js:1315685-1315858 placement
/**
 * 只读读取 Google 组信息的 OAuth scope。
 */
var HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN = "https://oauth2.googleapis.com/token";
var GOOGLE_ADMIN_GROUPS_URL = "https://admin.googleapis.com/admin/directory/v1/groups";
var GOOGLE_ADMIN_GROUP_READONLY_SCOPE = "https://www.googleapis.com/auth/admin.directory.group.readonly";
//@ chunk-1hnjmk23.js:1315858-1317723 placement
/**
 * 用 Google 服务账号（JWT bearer，代管理员身份）换取访问令牌（缓存到过期前 60 秒），返回按用户查询所属 Google 组邮箱的函数（分页最多 50 页）；失败抛 GOOGLE_GROUPS_UNAVAILABLE。
 */
async function createGoogleGroupsLookup(googleGroups) {
  let file = await readFile(googleGroups.service_account_json_path, "utf8");
  let serviceAccount = jsonParse(file);
  if (typeof serviceAccount.client_email !== "string" || typeof serviceAccount.private_key !== "string")
    throw Error(
      `oidc.google_groups: ${googleGroups.service_account_json_path} is not a Google service-account key (missing client_email or private_key)`,
    );
  let privateKey = await importPKCS8(serviceAccount.private_key, "RS256");
  let cachedToken;
  async function getAccessToken() {
    let floored = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.exp - 60 > floored) return cachedToken.token;
    let assertion = await new SignJWT({
      scope: GOOGLE_ADMIN_GROUP_READONLY_SCOPE,
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "JWT",
      })
      .setIssuer(serviceAccount.client_email)
      .setSubject(googleGroups.admin_email)
      .setAudience(HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN)
      .setIssuedAt(floored)
      .setExpirationTime(floored + 3600)
      .sign(privateKey);
    let tokenResponse = await fetchWithCa(HTTPS_OAUTH2_GOOGLEAPIS_COM_TOKEN, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(1e4),
    });
    if (!tokenResponse.ok)
      throw Error(
        `google token endpoint ${tokenResponse.status}: ${(await tokenResponse.text()).slice(0, 500)}`,
      );
    let body = await tokenResponse.json();
    if (typeof body.access_token !== "string") throw Error("google token endpoint returned no access_token");
    cachedToken = {
      token: body.access_token,
      exp: floored + (body.expires_in ?? 3600),
    };
    return body.access_token;
  }
  return async function (userKey) {
    try {
      let accessToken = await getAccessToken();
      let groupEmails = [];
      let pageToken;
      for (let j = 0; j < 50; j++) {
        let groupsUrl = new URL(GOOGLE_ADMIN_GROUPS_URL);
        groupsUrl.searchParams.set("userKey", userKey);
        groupsUrl.searchParams.set("maxResults", "200");
        if (pageToken) groupsUrl.searchParams.set("pageToken", pageToken);
        let groupsResponse = await fetchWithCa(groupsUrl, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(1e4),
        });
        if (!groupsResponse.ok) {
          if (groupsResponse.status === 401) cachedToken = undefined;
          throw Error(
            `directory API ${groupsResponse.status}: ${(await groupsResponse.text()).slice(0, 500)}`,
          );
        }
        let body = await groupsResponse.json();
        for (let groupEntry of body.groups ?? [])
          if (typeof groupEntry.email === "string") groupEmails.push(groupEntry.email.toLowerCase());
        pageToken = body.nextPageToken;
        if (!pageToken) break;
      }
      return groupEmails;
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      gatewayLog("warn", `google_groups lookup failed: ${message}`);
      throw Object.assign(Error(`google_groups lookup failed: ${message}`), {
        code: "GOOGLE_GROUPS_UNAVAILABLE",
      });
    }
  };
}
export { createGoogleGroupsLookup };
