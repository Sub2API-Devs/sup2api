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
  stopDaemonService,
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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function consentSelectAction(unattendedServing) {
  if (unattendedServing.lockReason !== undefined) return unattendedServing.canWithdraw ? "withdraw" : "none";
  return unattendedServing.choice === "accepted" ? "withdraw" : "ask";
}
//@ chunk-b7gstm5r.js:22109-22170 placement
var CONSENT_SAVE_FAILED_TEXT = "The answer could not be saved. Nothing was changed.";
//@ chunk-b7gstm5r.js:22170-22567 placement
async function loadDaemonOverview(storageV5, unattendedServing) {
  let o = await hasSystemdUserSession();
  let f = readLiveServerLock(1, storageV5).catch(() => null);
  let [i, scheduledTaskRuns, b, N, k, roster, u, servingConsentState] = await Promise.all([
    f,
    loadScheduledTaskRuns(storageV5),
    f.then((p) => readRemoteControlServers(p !== null, storageV5)),
    readDaemonStatus(storageV5).catch(() => null),
    readScheduledStatus(storageV5).catch(() => null),
    readRoster(
      {
        silent: true,
      },
      storageV5,
    ),
    o ? daemonServiceStatus() : Promise.resolve(false),
    readServingConsentState(unattendedServing),
  ]);
  return {
    tasks: scheduledTaskRuns,
    servers: b,
    lock: i,
    status: N,
    scheduledStatus: k,
    bgCount: Object.keys(roster.workers).length,
    serviceInstalled: u,
    serviceSupported: o,
    unattendedServing: servingConsentState,
  };
}
//@ chunk-b7gstm5r.js:22567-22668 placement
function modelSelectOptions() {
  return getEnabledModelOptions(false).map((a) => ({
    label: a.label,
    value: a.value ?? "",
    description: a.description,
  }));
}
//@ chunk-b7gstm5r.js:22668-22797 placement
/**
 * 加载守护进程概况后渲染 DaemonSetupFlow（服务类型、无人值守同意与模型选择）。
 */
async function renderDaemonSetupFlow(onDone, context) {
  let initialData = await loadDaemonOverview(context.storageV5);
  return jsxProd_default(DaemonSetupFlow, {
    initialData,
    modelOptions: modelSelectOptions(),
    onDone,
    storageV5: context.storageV5,
  });
}
//@ chunk-b7gstm5r.js:22797-25534 placement
/**
 * 后台守护进程设置流程：选择服务类型、无人值守同意与模型。
 */
function DaemonSetupFlow({ initialData, modelOptions, onDone, storageV5 }) {
  let [i, v] = y(initialData);
  let clock = useClock();
  let [N] = y(() => ({
    wall: Date.now(),
    clock: clock.now(),
  }));
  let [wall, setWall] = y(N.wall);
  let [u, T] = y({
    type: "hub",
  });
  let [p, M] = y("scheduled");
  let [m, D] = y(false);
  let [C, F] = y(null);
  let [U, B] = y(null);
  let A = R(false);
  async function c() {
    let daemonOverview = await loadDaemonOverview(storageV5, i.unattendedServing);
    v(daemonOverview);
  }
  let te = R(0);
  useInterval(
    () => {
      setWall(N.wall + (clock.now() - N.clock));
      if (te.current++ % 2 === 0) c();
    },
    u.type === "hub" ? 1000 : null,
  );
  async function g(h) {
    if (m) return;
    D(true);
    F(null);
    let x;
    try {
      switch (h) {
        case "uninstall":
          x = await uninstallDaemonService();
          break;
        case "stop":
          x = await stopDaemonService();
          break;
      }
      if (!x.ok) F(`${h} failed: ${x.error}`);
    } finally {
      try {
        await c();
      } catch {}
      D(false);
    }
  }
  function L() {
    c();
    T({
      type: "hub",
    });
  }
  function W(h) {
    v((x) => ({
      ...x,
      unattendedServing: {
        ...x.unattendedServing,
        choice: h,
        canWithdraw: h === "accepted",
      },
    }));
    c();
  }
  async function z() {
    if (A.current) return;
    let h = consentSelectAction(i.unattendedServing);
    if (h === "none") return;
    A.current = true;
    B(null);
    try {
      if (h === "withdraw") {
        if ((await saveUnattendedServingConsent("declined")) === "saved") W("declined");
        else B(CONSENT_SAVE_FAILED_TEXT);
      } else {
        let { UnattendedServingConsentDialog } = await import("./chunk-d8vjfv68.js");
        T({
          type: "unattended-consent",
          dialog: UnattendedServingConsentDialog,
        });
      }
    } catch (error) {
      logError(error);
      B(CONSENT_SAVE_FAILED_TEXT);
    } finally {
      A.current = false;
    }
  }
  let J = R(false);
  function Y(h) {
    let x = J.current;
    J.current = false;
    if (x) {
      B(CONSENT_SAVE_FAILED_TEXT);
      M("remoteControl");
    }
    if (h === "not_now") {
      L();
      return;
    }
    W(h);
    T({
      type: "hub",
    });
  }
  switch (u.type) {
    case "detail-scheduled":
      return jsxProd_default(DaemonScheduledTaskDetail, {
        task: u.entry,
        onBack: L,
        onEdit: (prefill) =>
          T({
            type: "new",
            kind: "scheduled",
            prefill,
          }),
        onDone,
        refresh: c,
        storageV5,
      });
    case "detail-remoteControl":
      return jsxProd_default(RemoteControlServerDetail, {
        server: u.entry,
        onBack: L,
        onDone,
        refresh: c,
        storageV5,
      });
    case "new":
      if (u.kind === "remoteControl")
        return jsxProd_default(AddRemoteControlServerForm, {
          defaultDir: getOriginalCwd(),
          onCancel: L,
          onAdded: () => L(),
          storageV5,
        });
      return jsxProd_default(DaemonScheduledTaskForm, {
        defaultDir: getOriginalCwd(),
        existingIds: i.tasks.map((task) => task.id),
        prefill: u.prefill,
        modelOptions,
        onCancel: L,
        onDone,
        onSaved: async () => L(),
        storageV5,
      });
    case "unattended-consent": {
      let dialog = u.dialog;
      return jsxProd_default(dialog, {
        exitOnCtrlCD: false,
        onSaveFailed: () => {
          J.current = true;
        },
        onDone: Y,
      });
    }
    case "hub":
      break;
  }
  let ce = [
    jsxProd_default(
      Tab,
      {
        id: "scheduled",
        title: "Scheduled",
        children: jsxProd_default(DaemonServicesView, {
          kind: "scheduled",
          data: i,
          now: wall,
          busy: m,
          message: C,
          onSelect: (entry) =>
            T({
              type: "detail-scheduled",
              entry,
            }),
          onAddNew: () =>
            T({
              type: "new",
              kind: "scheduled",
            }),
          onService: (h) => void g(h),
          onUnattendedServing: () => void z(),
          unattendedNotice: U,
          onCancel: () => onDone(),
        }),
      },
      "scheduled",
    ),
  ];
  ce.push(
    jsxProd_default(
      Tab,
      {
        id: "remoteControl",
        title: "Remote Control",
        children: jsxProd_default(DaemonServicesView, {
          kind: "remoteControl",
          data: i,
          now: wall,
          busy: m,
          message: C,
          onSelect: (entry) =>
            T({
              type: "detail-remoteControl",
              entry,
            }),
          onAddNew: () =>
            T({
              type: "new",
              kind: "remoteControl",
            }),
          onService: (h) => void g(h),
          onUnattendedServing: () => void z(),
          unattendedNotice: U,
          onCancel: () => onDone(),
        }),
      },
      "remoteControl",
    ),
  );
  return jsxProd_default(Dialog, {
    title: "Claude daemon",
    onCancel: () => onDone(),
    hideInputGuide: true,
    children: jsxProd_default(Tabs, {
      title: null,
      color: "permission",
      selectedTab: p,
      onTabChange: (h) => M(h),
      navFromContent: true,
      children: ce,
    }),
  });
}
//@ chunk-b7gstm5r.js:25534-25608 placement
var SERVICE_KIND_LABELS = {
  scheduled: "scheduled task",
  remoteControl: "remote-control server",
};
export { consentSelectAction, SERVICE_KIND_LABELS, loadDaemonOverview, DaemonSetupFlow, modelSelectOptions };
