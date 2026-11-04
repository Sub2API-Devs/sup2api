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
import { useState, useRef } from "../../../vendor/react/cjs/react.production.js";
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
async function loadDaemonOverview(storageV5, override) {
  let hasSystemdSession = await hasSystemdUserSession();
  let liveLock = readLiveServerLock(1, storageV5).catch(() => null);
  let [
    liveServerLock,
    scheduledTaskRuns,
    remoteServers,
    daemonStatus,
    scheduledStatus,
    roster,
    systemdServiceInstalled,
    servingConsentState,
  ] = await Promise.all([
    liveLock,
    loadScheduledTaskRuns(storageV5),
    liveLock.then((lock) => readRemoteControlServers(lock !== null, storageV5)),
    readDaemonStatus(storageV5).catch(() => null),
    readScheduledStatus(storageV5).catch(() => null),
    readRoster(
      {
        silent: true,
      },
      storageV5,
    ),
    hasSystemdSession ? daemonServiceStatus() : Promise.resolve(false),
    readServingConsentState(override),
  ]);
  return {
    tasks: scheduledTaskRuns,
    servers: remoteServers,
    lock: liveServerLock,
    status: daemonStatus,
    scheduledStatus,
    bgCount: Object.keys(roster.workers).length,
    serviceInstalled: systemdServiceInstalled,
    serviceSupported: hasSystemdSession,
    unattendedServing: servingConsentState,
  };
}
//@ chunk-b7gstm5r.js:22567-22668 placement
function modelSelectOptions() {
  return getEnabledModelOptions(false).map((option) => ({
    label: option.label,
    value: option.value ?? "",
    description: option.description,
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
  let [data, setData] = useState(initialData);
  let clock = useClock();
  let [clockAnchor] = useState(() => ({
    wall: Date.now(),
    clock: clock.now(),
  }));
  let [wall, setWall] = useState(clockAnchor.wall);
  let [view, setView] = useState({
    type: "hub",
  });
  let [activeTab, setActiveTab] = useState("scheduled");
  let [isBusy, setIsBusy] = useState(false);
  let [message, setMessage] = useState(null);
  let [unattendedNotice, setUnattendedNotice] = useState(null);
  let consentBusyRef = useRef(false);
  async function refreshOverview() {
    let daemonOverview = await loadDaemonOverview(storageV5, data.unattendedServing);
    setData(daemonOverview);
  }
  let tickRef = useRef(0);
  useInterval(
    () => {
      setWall(clockAnchor.wall + (clock.now() - clockAnchor.clock));
      if (tickRef.current++ % 2 === 0) refreshOverview();
    },
    view.type === "hub" ? 1000 : null,
  );
  async function runServiceAction(action) {
    if (isBusy) return;
    setIsBusy(true);
    setMessage(null);
    let result;
    try {
      switch (action) {
        case "uninstall":
          result = await uninstallDaemonService();
          break;
        case "stop":
          result = await stopDaemonService();
          break;
      }
      if (!result.ok) setMessage(`${action} failed: ${result.error}`);
    } finally {
      try {
        await refreshOverview();
      } catch {}
      setIsBusy(false);
    }
  }
  function goHome() {
    refreshOverview();
    setView({
      type: "hub",
    });
  }
  function applyConsentChoice(choice) {
    setData((previous) => ({
      ...previous,
      unattendedServing: {
        ...previous.unattendedServing,
        choice,
        canWithdraw: choice === "accepted",
      },
    }));
    refreshOverview();
  }
  async function openConsentFlow() {
    if (consentBusyRef.current) return;
    let consentAction = consentSelectAction(data.unattendedServing);
    if (consentAction === "none") return;
    consentBusyRef.current = true;
    setUnattendedNotice(null);
    try {
      if (consentAction === "withdraw") {
        if ((await saveUnattendedServingConsent("declined")) === "saved") applyConsentChoice("declined");
        else setUnattendedNotice(CONSENT_SAVE_FAILED_TEXT);
      } else {
        let { UnattendedServingConsentDialog } = await import("../UnattendedServingConsentDialog.lazy.js");
        setView({
          type: "unattended-consent",
          dialog: UnattendedServingConsentDialog,
        });
      }
    } catch (error) {
      logError(error);
      setUnattendedNotice(CONSENT_SAVE_FAILED_TEXT);
    } finally {
      consentBusyRef.current = false;
    }
  }
  let saveFailedRef = useRef(false);
  function handleConsentDone(consentChoice) {
    let saveFailed = saveFailedRef.current;
    saveFailedRef.current = false;
    if (saveFailed) {
      setUnattendedNotice(CONSENT_SAVE_FAILED_TEXT);
      setActiveTab("remoteControl");
    }
    if (consentChoice === "not_now") {
      goHome();
      return;
    }
    applyConsentChoice(consentChoice);
    setView({
      type: "hub",
    });
  }
  switch (view.type) {
    case "detail-scheduled":
      return jsxProd_default(DaemonScheduledTaskDetail, {
        task: view.entry,
        onBack: goHome,
        onEdit: (prefill) =>
          setView({
            type: "new",
            kind: "scheduled",
            prefill,
          }),
        onDone,
        refresh: refreshOverview,
        storageV5,
      });
    case "detail-remoteControl":
      return jsxProd_default(RemoteControlServerDetail, {
        server: view.entry,
        onBack: goHome,
        onDone,
        refresh: refreshOverview,
        storageV5,
      });
    case "new":
      if (view.kind === "remoteControl")
        return jsxProd_default(AddRemoteControlServerForm, {
          defaultDir: getOriginalCwd(),
          onCancel: goHome,
          onAdded: () => goHome(),
          storageV5,
        });
      return jsxProd_default(DaemonScheduledTaskForm, {
        defaultDir: getOriginalCwd(),
        existingIds: data.tasks.map((task) => task.id),
        prefill: view.prefill,
        modelOptions,
        onCancel: goHome,
        onDone,
        onSaved: async () => goHome(),
        storageV5,
      });
    case "unattended-consent": {
      let dialog = view.dialog;
      return jsxProd_default(dialog, {
        exitOnCtrlCD: false,
        onSaveFailed: () => {
          saveFailedRef.current = true;
        },
        onDone: handleConsentDone,
      });
    }
    case "hub":
      break;
  }
  let tabs = [
    jsxProd_default(
      Tab,
      {
        id: "scheduled",
        title: "Scheduled",
        children: jsxProd_default(DaemonServicesView, {
          kind: "scheduled",
          data,
          now: wall,
          busy: isBusy,
          message,
          onSelect: (entry) =>
            setView({
              type: "detail-scheduled",
              entry,
            }),
          onAddNew: () =>
            setView({
              type: "new",
              kind: "scheduled",
            }),
          onService: (action) => void runServiceAction(action),
          onUnattendedServing: () => void openConsentFlow(),
          unattendedNotice,
          onCancel: () => onDone(),
        }),
      },
      "scheduled",
    ),
  ];
  tabs.push(
    jsxProd_default(
      Tab,
      {
        id: "remoteControl",
        title: "Remote Control",
        children: jsxProd_default(DaemonServicesView, {
          kind: "remoteControl",
          data,
          now: wall,
          busy: isBusy,
          message,
          onSelect: (entry) =>
            setView({
              type: "detail-remoteControl",
              entry,
            }),
          onAddNew: () =>
            setView({
              type: "new",
              kind: "remoteControl",
            }),
          onService: (action) => void runServiceAction(action),
          onUnattendedServing: () => void openConsentFlow(),
          unattendedNotice,
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
      selectedTab: activeTab,
      onTabChange: (tabId) => setActiveTab(tabId),
      navFromContent: true,
      children: tabs,
    }),
  });
}
//@ chunk-b7gstm5r.js:25534-25608 placement
var SERVICE_KIND_LABELS = {
  scheduled: "scheduled task",
  remoteControl: "remote-control server",
};
export {
  consentSelectAction,
  SERVICE_KIND_LABELS,
  loadDaemonOverview,
  DaemonSetupFlow,
  modelSelectOptions,
  renderDaemonSetupFlow,
};
