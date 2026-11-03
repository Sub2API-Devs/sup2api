/**
 * components/daemon/UnattendedConsentSelect.tsx
 *
 * 2.1.316 新增：守护进程设置流程与无人值守同意选择
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b7gstm5r.js (7)
 * attribution: placement 7
 */
import {
  hasSystemdUserSession,
  daemonServiceStatus,
  uninstallDaemonService,
  vtn,
} from "../../services/daemon/serviceInstall.js";
import { readLiveServerLock } from "../../utils/daemon/daemonLock.js";
import {
  loadScheduledTaskRuns,
  DaemonScheduledTaskDetail,
  DaemonScheduledTaskForm,
} from "./DaemonScheduledTaskDetail.js";
import {
  readRemoteControlServers,
  readServingConsentState,
  RemoteControlServerDetail,
  AddRemoteControlServerForm,
} from "./RemoteControlServerDetail.js";
import { readDaemonStatus } from "../../daemon/daemonStatus.js";
import { readScheduledStatus } from "../../daemon/scheduledWorker.js";
import { readRoster } from "../../services/daemon/roster.js";
import { getEnabledModelOptions } from "../../utils/model/modelOptions.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { y, R } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInterval } from "../../ink/components/Input.js";
import { saveUnattendedServingConsent } from "../../services/remoteTools/unattendedServingConsent.js";
import { logError } from "../../utils/log.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { DaemonServicesView } from "./DaemonServicesView.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-b7gstm5r.js:21984-22109 placement
function consentSelectAction(a) {
  if (a.lockReason !== void 0) return a.canWithdraw ? "withdraw" : "none";
  return a.choice === "accepted" ? "withdraw" : "ask";
}
//@ chunk-b7gstm5r.js:22109-22170 placement
var ze = "The answer could not be saved. Nothing was changed.";
//@ chunk-b7gstm5r.js:22170-22567 placement
async function loadDaemonOverview(a, t) {
  let o = await hasSystemdUserSession(),
    f = readLiveServerLock(1, a).catch(() => null),
    [i, v, b, N, k, I, u, T] = await Promise.all([
      f,
      loadScheduledTaskRuns(a),
      f.then((p) => readRemoteControlServers(p !== null, a)),
      readDaemonStatus(a).catch(() => null),
      readScheduledStatus(a).catch(() => null),
      readRoster({ silent: !0 }, a),
      o ? daemonServiceStatus() : Promise.resolve(!1),
      readServingConsentState(t),
    ]);
  return {
    tasks: v,
    servers: b,
    lock: i,
    status: N,
    scheduledStatus: k,
    bgCount: Object.keys(I.workers).length,
    serviceInstalled: u,
    serviceSupported: o,
    unattendedServing: T,
  };
}
//@ chunk-b7gstm5r.js:22567-22668 placement
function modelSelectOptions() {
  return getEnabledModelOptions(!1).map((a) => ({
    label: a.label,
    value: a.value ?? "",
    description: a.description,
  }));
}
/**
 * 加载守护进程概况后渲染 DaemonSetupFlow（服务类型、无人值守同意与模型选择）。
 */
//@ chunk-b7gstm5r.js:22668-22797 placement
async function renderDaemonSetupFlow(onDone, context) {
  let o = await loadDaemonOverview(context.storageV5);
  return e(DaemonSetupFlow, {
    initialData: o,
    modelOptions: modelSelectOptions(),
    onDone: onDone,
    storageV5: context.storageV5,
  });
}
/**
 * 后台守护进程设置流程：选择服务类型、无人值守同意与模型。
 */
//@ chunk-b7gstm5r.js:22797-25534 placement
function DaemonSetupFlow({
  initialData: initialData,
  modelOptions: modelOptions,
  onDone: onDone,
  storageV5: storageV5,
}) {
  let [i, v] = y(initialData),
    b = useClock(),
    [N] = y(() => ({ wall: Date.now(), clock: b.now() })),
    [k, I] = y(N.wall),
    [u, T] = y({ type: "hub" }),
    [p, M] = y("scheduled"),
    [m, D] = y(!1),
    [C, F] = y(null),
    [U, B] = y(null),
    A = R(!1);
  async function c() {
    let h = await loadDaemonOverview(storageV5, i.unattendedServing);
    v(h);
  }
  let te = R(0);
  useInterval(
    () => {
      if ((I(N.wall + (b.now() - N.clock)), te.current++ % 2 === 0)) c();
    },
    u.type === "hub" ? 1000 : null,
  );
  async function g(h) {
    if (m) return;
    (D(!0), F(null));
    let x;
    try {
      switch (h) {
        case "uninstall":
          x = await uninstallDaemonService();
          break;
        case "stop":
          x = await vtn();
          break;
      }
      if (!x.ok) F(`${h} failed: ${x.error}`);
    } finally {
      try {
        await c();
      } catch {}
      D(!1);
    }
  }
  function L() {
    (c(), T({ type: "hub" }));
  }
  function W(h) {
    (v((x) => ({
      ...x,
      unattendedServing: { ...x.unattendedServing, choice: h, canWithdraw: h === "accepted" },
    })),
      c());
  }
  async function z() {
    if (A.current) return;
    let h = consentSelectAction(i.unattendedServing);
    if (h === "none") return;
    ((A.current = !0), B(null));
    try {
      if (h === "withdraw")
        if ((await saveUnattendedServingConsent("declined")) === "saved") W("declined");
        else B(ze);
      else {
        let { UnattendedServingConsentDialog: UnattendedServingConsentDialog } =
          await import("./chunk-d8vjfv68.js");
        T({ type: "unattended-consent", dialog: UnattendedServingConsentDialog });
      }
    } catch (error) {
      (logError(error), B(ze));
    } finally {
      A.current = !1;
    }
  }
  let J = R(!1);
  function Y(h) {
    let x = J.current;
    if (((J.current = !1), x)) (B(ze), M("remoteControl"));
    if (h === "not_now") {
      L();
      return;
    }
    (W(h), T({ type: "hub" }));
  }
  switch (u.type) {
    case "detail-scheduled":
      return e(DaemonScheduledTaskDetail, {
        task: u.entry,
        onBack: L,
        onEdit: (h) => T({ type: "new", kind: "scheduled", prefill: h }),
        onDone: onDone,
        refresh: c,
        storageV5: storageV5,
      });
    case "detail-remoteControl":
      return e(RemoteControlServerDetail, {
        server: u.entry,
        onBack: L,
        onDone: onDone,
        refresh: c,
        storageV5: storageV5,
      });
    case "new":
      if (u.kind === "remoteControl")
        return e(AddRemoteControlServerForm, {
          defaultDir: getOriginalCwd(),
          onCancel: L,
          onAdded: () => L(),
          storageV5: storageV5,
        });
      return e(DaemonScheduledTaskForm, {
        defaultDir: getOriginalCwd(),
        existingIds: i.tasks.map((task) => task.id),
        prefill: u.prefill,
        modelOptions: modelOptions,
        onCancel: L,
        onDone: onDone,
        onSaved: async () => L(),
        storageV5: storageV5,
      });
    case "unattended-consent": {
      let dialog = u.dialog;
      return e(dialog, {
        exitOnCtrlCD: !1,
        onSaveFailed: () => {
          J.current = !0;
        },
        onDone: Y,
      });
    }
    case "hub":
      break;
  }
  let ce = [
    e(
      Tab,
      {
        id: "scheduled",
        title: "Scheduled",
        children: e(DaemonServicesView, {
          kind: "scheduled",
          data: i,
          now: k,
          busy: m,
          message: C,
          onSelect: (h) => T({ type: "detail-scheduled", entry: h }),
          onAddNew: () => T({ type: "new", kind: "scheduled" }),
          onService: (h) => void g(h),
          onUnattendedServing: () => void z(),
          unattendedNotice: U,
          onCancel: () => onDone(),
        }),
      },
      "scheduled",
    ),
  ];
  return (
    ce.push(
      e(
        Tab,
        {
          id: "remoteControl",
          title: "Remote Control",
          children: e(DaemonServicesView, {
            kind: "remoteControl",
            data: i,
            now: k,
            busy: m,
            message: C,
            onSelect: (h) => T({ type: "detail-remoteControl", entry: h }),
            onAddNew: () => T({ type: "new", kind: "remoteControl" }),
            onService: (h) => void g(h),
            onUnattendedServing: () => void z(),
            unattendedNotice: U,
            onCancel: () => onDone(),
          }),
        },
        "remoteControl",
      ),
    ),
    e(Dialog, {
      title: "Claude daemon",
      onCancel: () => onDone(),
      hideInputGuide: !0,
      children: e(Tabs, {
        title: null,
        color: "permission",
        selectedTab: p,
        onTabChange: (h) => M(h),
        navFromContent: !0,
        children: ce,
      }),
    })
  );
}
//@ chunk-b7gstm5r.js:25534-25608 placement
var SERVICE_KIND_LABELS = { scheduled: "scheduled task", remoteControl: "remote-control server" };

export { consentSelectAction, SERVICE_KIND_LABELS, loadDaemonOverview, DaemonSetupFlow, modelSelectOptions };
