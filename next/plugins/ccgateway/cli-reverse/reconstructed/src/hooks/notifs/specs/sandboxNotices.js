/**
 * hooks/notifs/specs/sandboxNotices.ts
 *
 * 2.1.316 新增。启动通知：沙箱类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  SESSION_MODEL_RESTRICTED,
  subscribeSessionModelRestriction,
} from "../../../utils/model/sessionModelRestriction.js";
import { getIsRemoteMode } from "../../../bootstrap/state.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { plural } from "../../../utils/stringUtils.js";
import { settingsChangeDetector } from "../../../utils/settings/changeDetector.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1834088-1834149 placement
var sessionModelRestrictedNoticeSpec; // deferred: uses SESSION_MODEL_DENY_TTL_MS (../../../utils/model/sessionModelRestriction.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1834088", () => {
  sessionModelRestrictedNoticeSpec = {
    id: SESSION_MODEL_RESTRICTED,
    deps: (ctx) => [ctx.addNotification],
    setup: () => sessionModelRestrictedNotice,
  };
});
//@ chunk-czq1j3j2.js:1834149-1834284 placement
function sessionModelRestrictedNotice({ addNotification }) {
  if (getIsRemoteMode()) return;
  return subscribeSessionModelRestriction((text) => {
    addNotification({
      key: SESSION_MODEL_RESTRICTED,
      kind: "warning",
      color: "warning",
      priority: "high",
      text,
    });
  });
}
//@ chunk-czq1j3j2.js:1834284-1834881 placement
/**
 * 统计因属于另一台主机而未生效的沙箱 deny 路径，写入 setupIssues 计数；出现新的此类路径时立即提示。
 */
function sandboxDeniesOnAnotherHostNotice({ store, addNotification }, previousDenies) {
  let denies = SandboxManager.canMaskCredentialWarningFire()
    ? SandboxManager.getDeniesDroppedForAnotherHost()
    : [];
  store.setState((prev) =>
    prev.setupIssues.sandboxDeniesOnAnotherHostCount === denies.length
      ? prev
      : {
          ...prev,
          setupIssues: {
            ...prev.setupIssues,
            sandboxDeniesOnAnotherHostCount: denies.length,
          },
        },
  );
  let hasNew = denies.some((deny) => !previousDenies.has(deny));
  previousDenies.clear();
  for (let deny of denies) previousDenies.add(deny);
  if (hasNew)
    addNotification({
      key: "sandbox-denies-on-another-host",
      kind: "warning",
      priority: "immediate",
      requeueOnPreempt: true,
      color: "warning",
      text: `${denies.length} sandbox deny ${plural(denies.length, "path")} on another computer ${plural(denies.length, "is", "are")} not enforced \xB7 /status`,
    });
}
//@ chunk-czq1j3j2.js:1834881-1835134 placement
var sandboxDeniesOnAnotherHostNoticeSpec = {
  id: "sandbox-denies-on-another-host",
  deps: (ctx) => [ctx.store, ctx.addNotification],
  setup() {
    let previousDenies = new Set();
    return (ctx) => {
      if (getIsRemoteMode()) return;
      sandboxDeniesOnAnotherHostNotice(ctx, previousDenies);
      let unsubscribeHost = SandboxManager.onDeniesDroppedForAnotherHostChanged(() =>
        sandboxDeniesOnAnotherHostNotice(ctx, previousDenies),
      );
      let unsubscribeSettings = settingsChangeDetector.subscribe(() =>
        sandboxDeniesOnAnotherHostNotice(ctx, previousDenies),
      );
      return () => {
        unsubscribeHost();
        unsubscribeSettings();
      };
    };
  },
};
export { sandboxDeniesOnAnotherHostNoticeSpec, sessionModelRestrictedNoticeSpec };
