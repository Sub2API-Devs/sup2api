/**
 * bridge/deviceBindingRecord.ts
 *
 * 解析当前设备绑定记录（环境变量或已存储）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fszf8f4f.js (3)
 * attribution: placement 3
 */
import { Vt } from "../utils/agentId.js";
import { env } from "../utils/env.js";
import { getClaudeAIOAuthTokenOriginAsync, getStoredOauthAccountInfo } from "../utils/auth.js";

/**
 * 从环境变量或已存储记录解析当前设备绑定，返回 resolved/stored/missing 来源
 */
//@ chunk-fszf8f4f.js:301-613 placement
function resolveDeviceBindingRecord({
  storedAccountUuid: storedAccountUuid,
  hostAccountUuid: hostAccountUuid,
}) {
  if (!hostAccountUuid)
    return storedAccountUuid
      ? { status: "resolved", accountUuid: storedAccountUuid, source: "stored" }
      : { status: "missing" };
  if (!storedAccountUuid) return { status: "resolved", accountUuid: hostAccountUuid, source: "env" };
  return storedAccountUuid.trim().toLowerCase() === hostAccountUuid.toLowerCase()
    ? { status: "resolved", accountUuid: storedAccountUuid, source: "env" }
    : { status: "mismatch" };
}
/**
 * 读 CLAUDE_CODE_ACCOUNT_UUID（小写）；只有当 OAuth 令牌来自环境变量或 fd（宿主注入）时才返回，否则 undefined。
 */
//@ chunk-fszf8f4f.js:613-780 placement
async function getHostAccountUuid(t) {
  let e = Vt(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
  if (e === void 0) return;
  try {
    let n = await getClaudeAIOAuthTokenOriginAsync(t);
    return n === "env" || n === "fd" ? e : void 0;
  } catch {
    return;
  }
}
/**
 * 解析当前设备绑定记录：取已存储的 OAuth 账号 uuid 与宿主账号 uuid，交给 resolveDeviceBindingRecord。被设备签名、设备注册、附着等多处使用。
 */
//@ chunk-fszf8f4f.js:780-909 placement
async function resolveCurrentDeviceBinding(t) {
  let e;
  try {
    e = getStoredOauthAccountInfo()?.accountUuid;
  } catch {
    e = void 0;
  }
  return resolveDeviceBindingRecord({ storedAccountUuid: e, hostAccountUuid: await getHostAccountUuid(t) });
}

export { resolveCurrentDeviceBinding, resolveDeviceBindingRecord, getHostAccountUuid };
