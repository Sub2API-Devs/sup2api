/**
 * cli/handlers/performLogout.ts
 *
 * 登出主流程：撤销/清理各来源凭证、处理重登录保留、抹除引导标记，并给出配置未保存的告警（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wqfxt05n.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withStorageWriteLock } from "../../utils/secureStorage/storageWriteLock.js";

//@ chunk-wqfxt05n.js:2256-2492 placement
function withoutLoginFields(config) {
  let stripped = {
    ...config,
  };
  delete stripped.claudeAiOauth;
  delete stripped.organizationUuid;
  delete stripped.trustedDeviceToken;
  delete stripped.trustedDeviceEnrolledAfterRefusalAtMs;
  delete stripped.enterpriseGateway;
  delete stripped.designOauth;
  delete stripped.cloudSessionsOauth;
  return stripped;
}
//@ chunk-wqfxt05n.js:2492-2696 placement
async function pruneGuardedStorage(storage) {
  await withStorageWriteLock(async () => {
    let emptied = false;
    await storage.mutate((current) => {
      let stripped = withoutLoginFields(current);
      let leftKeys = Object.keys(stripped).length;
      emptied = leftKeys === 0 && Object.keys(current).length > 0;
      return leftKeys === Object.keys(current).length || emptied ? current : stripped;
    });
    if (emptied) await storage.delete();
  });
}
//@ chunk-wqfxt05n.js:2696-2793 placement
/**
 * “账号或 API key 可能仍在配置文件里”的告警文案。
 */
var LOGOUT_NOT_SAVED_MESSAGE =
  "Your account or API key may still be in the config file. Run claude auth logout.";
var CONFIG_READ_TIMEOUT_MS = 500;
export { LOGOUT_NOT_SAVED_MESSAGE, CONFIG_READ_TIMEOUT_MS, withoutLoginFields, pruneGuardedStorage };
