/**
 * bridge/deviceBindingRecord.ts
 *
 * 解析当前设备绑定记录（环境变量或已存储）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-marpf66x.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { env } from "../utils/env.js";
import { getClaudeAIOAuthTokenOriginAsync, getStoredOauthAccountInfo } from "../utils/auth.js";

//@ chunk-marpf66x.js:301-613 placement
/**
 * 从环境变量或已存储记录解析当前设备绑定，返回 resolved/stored/missing 来源
 */
function resolveDeviceBindingRecord({ storedAccountUuid, hostAccountUuid }) {
  if (!hostAccountUuid)
    return storedAccountUuid
      ? {
          status: "resolved",
          accountUuid: storedAccountUuid,
          source: "stored",
        }
      : {
          status: "missing",
        };
  if (!storedAccountUuid)
    return {
      status: "resolved",
      accountUuid: hostAccountUuid,
      source: "env",
    };
  return storedAccountUuid.trim().toLowerCase() === hostAccountUuid.toLowerCase()
    ? {
        status: "resolved",
        accountUuid: storedAccountUuid,
        source: "env",
      }
    : {
        status: "mismatch",
      };
}
//@ chunk-marpf66x.js:613-780 placement
/**
 * 读 CLAUDE_CODE_ACCOUNT_UUID（小写）；只有当 OAuth 令牌来自环境变量或 fd（宿主注入）时才返回，否则 undefined。
 */
async function getHostAccountUuid(credentials) {
  let lower = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
  if (lower === undefined) return;
  try {
    let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
    return claudeAIOAuthTokenOrigin === "env" || claudeAIOAuthTokenOrigin === "fd" ? lower : undefined;
  } catch {
    return;
  }
}
//@ chunk-marpf66x.js:780-910 placement
/**
 * 解析当前设备绑定记录：取已存储的 OAuth 账号 uuid 与宿主账号 uuid，交给 resolveDeviceBindingRecord。被设备签名、设备注册、附着等多处使用。
 */
async function resolveCurrentDeviceBinding(credentials) {
  let storedAccountUuid;
  try {
    storedAccountUuid = getStoredOauthAccountInfo()?.accountUuid;
  } catch {
    storedAccountUuid = undefined;
  }
  return resolveDeviceBindingRecord({
    storedAccountUuid,
    hostAccountUuid: await getHostAccountUuid(credentials),
  });
}
export { resolveCurrentDeviceBinding, resolveDeviceBindingRecord, getHostAccountUuid };
