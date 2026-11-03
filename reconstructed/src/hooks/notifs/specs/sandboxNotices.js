/**
 * hooks/notifs/specs/sandboxNotices.ts
 *
 * 2.1.316 新增。启动通知：沙箱类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { SESSION_MODEL_RESTRICTED, KEi } from "../../../utils/model/sessionModelRestriction.js";
import { getIsRemoteMode } from "../../../bootstrap/state.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { plural } from "../../../utils/stringUtils.js";
import { settingsChangeDetector } from "../../../utils/settings/changeDetector.js";

//@ chunk-18hwfzwa.js:1786113-1786174 placement
var ZTt = {
  id: SESSION_MODEL_RESTRICTED,
  deps: (h) => [h.addNotification],
  setup: () => sessionModelRestrictedNotice,
};
//@ chunk-18hwfzwa.js:1786174-1786309 placement
function sessionModelRestrictedNotice({ addNotification: addNotification }) {
  if (getIsRemoteMode()) return;
  return KEi((x) => {
    addNotification({
      key: SESSION_MODEL_RESTRICTED,
      kind: "warning",
      color: "warning",
      priority: "high",
      text: x,
    });
  });
}
/**
 * 统计因属于另一台主机而未生效的沙箱 deny 路径，写入 setupIssues 计数；出现新的此类路径时立即提示。
 */
//@ chunk-18hwfzwa.js:1786309-1786906 placement
function sandboxDeniesOnAnotherHostNotice(
  { store: store, addNotification: addNotification },
  previousDenies,
) {
  let denies = SandboxManager.canMaskCredentialWarningFire()
    ? SandboxManager.getDeniesDroppedForAnotherHost()
    : [];
  store.setState((ke) =>
    ke.setupIssues.sandboxDeniesOnAnotherHostCount === denies.length
      ? ke
      : { ...ke, setupIssues: { ...ke.setupIssues, sandboxDeniesOnAnotherHostCount: denies.length } },
  );
  let hasNew = denies.some((ke) => !previousDenies.has(ke));
  previousDenies.clear();
  for (let ke of denies) previousDenies.add(ke);
  if (hasNew)
    addNotification({
      key: "sandbox-denies-on-another-host",
      kind: "warning",
      priority: "immediate",
      requeueOnPreempt: !0,
      color: "warning",
      text: `${denies.length} sandbox deny ${plural(denies.length, "path")} on another computer ${plural(denies.length, "is", "are")} not enforced \xB7 /status`,
    });
}
//@ chunk-18hwfzwa.js:1786906-1787159 placement
var sandboxDeniesOnAnotherHostNoticeSpec = {
  id: "sandbox-denies-on-another-host",
  deps: (h) => [h.store, h.addNotification],
  setup() {
    let h = new Set();
    return (x) => {
      if (getIsRemoteMode()) return;
      sandboxDeniesOnAnotherHostNotice(x, h);
      let onDeniesDroppedForAnotherHostChanged = SandboxManager.onDeniesDroppedForAnotherHostChanged(() =>
          sandboxDeniesOnAnotherHostNotice(x, h),
        ),
        subscribe = settingsChangeDetector.subscribe(() => sandboxDeniesOnAnotherHostNotice(x, h));
      return () => {
        (onDeniesDroppedForAnotherHostChanged(), subscribe());
      };
    };
  },
};

export { sandboxDeniesOnAnotherHostNoticeSpec, ZTt };
