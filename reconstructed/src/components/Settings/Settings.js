/**
 * components/Settings/Settings.tsx
 *
 * 设置对话框外壳：Status/Config/Usage/Stats/Gates 等标签页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Settings/Settings.tsx
 * pieces: chunk-9h8dr0qb.js (4)
 * attribution: sole-consumer 3, fingerprint 1
 */
import { EMPTY_MACHINE_STATUS, noopMachineStatusHook } from "../../utils/machineStatus.js";
import { createSignal } from "../../utils/signal.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, useRef, suspenseTypeExport } from "../../../vendor/react/cjs/react.production.js";
import { useHasScrollViewport, useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useSession } from "../../context/session.js";
import { collectStatusDiagnostics, Status } from "./Status.js";
import { getCloudSessionsStatus } from "./CloudSessionsStatus.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { Config } from "./Config.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { renderGatewayUsageNotice, applyUsageFix } from "./Usage.js";
import { Stats } from "../Stats.js";
import { Pane } from "../design-system/Pane.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-9h8dr0qb.js:113320-113343 sole-consumer
function emptySettingsExtra() {
  return [];
}
//@ chunk-9h8dr0qb.js:113343-113368 sole-consumer
function defaultSettingsExtra() {
  return EMPTY_MACHINE_STATUS;
}
//@ chunk-9h8dr0qb.js:113368-113394 sole-consumer
function currentSettingsExtra() {
  return createSignal();
}
//@ chunk-9h8dr0qb.js:113394-116279 fingerprint = Settings (0.737)
/**
 * 设置对话框外壳：Status / Config / Usage / Stats（/ Gates 仅内部）标签页，关闭时发系统消息。
 */
function Settings(props) {
  let $ = useMemoCache(51);
  let { onClose, storageV5, credentials, messages, mcpClients, ideInstallationStatus, defaultTab } = props;
  let [selectedTab, setSelectedTab] = useState(defaultTab);
  let [tabsHidden, setTabsHidden] = useState(false);
  let [configOwnsEsc, setConfigOwnsEsc] = useState(false);
  let [gatesOwnsEsc] = useState(false);
  let insideModal = useHasScrollViewport();
  let { rows } = useScrollViewportSize(useTerminalSize());
  let visibleRows = insideModal ? rows + 1 : Math.max(15, Math.min(Math.floor(rows * 0.8), 30));
  let session = useSession();
  let loadStatusDiagnostics;
  if ($[0] !== credentials || $[1] !== session || $[2] !== storageV5) {
    loadStatusDiagnostics = () =>
      collectStatusDiagnostics(session, storageV5, credentials).catch(emptySettingsExtra);
    $[0] = credentials;
    $[1] = session;
    $[2] = storageV5;
    $[3] = loadStatusDiagnostics;
  } else loadStatusDiagnostics = $[3];
  let [statusDiagnostics] = useState(loadStatusDiagnostics);
  let cloudSessionsStatusRef = useRef(null);
  let getWebSetupRead;
  if ($[4] !== credentials || $[5] !== session || $[6] !== storageV5) {
    getWebSetupRead = () => {
      if (cloudSessionsStatusRef.current === null)
        cloudSessionsStatusRef.current = getCloudSessionsStatus(session.host, credentials, storageV5);
      return cloudSessionsStatusRef.current;
    };
    $[4] = credentials;
    $[5] = session;
    $[6] = storageV5;
    $[7] = getWebSetupRead;
  } else getWebSetupRead = $[7];
  let getWebSetupRead_2 = getWebSetupRead;
  let machineStatusRef = useRef(null);
  let getMachineStatusRead;
  if ($[8] !== session) {
    getMachineStatusRead = () => {
      if (machineStatusRef.current === null)
        machineStatusRef.current = noopMachineStatusHook(getSessionProject(session).cwd)?.catch(
          defaultSettingsExtra,
        );
      return machineStatusRef.current;
    };
    $[8] = session;
    $[9] = getMachineStatusRead;
  } else getMachineStatusRead = $[9];
  let getMachineStatusRead_2 = getMachineStatusRead;
  let [settingsExtra] = useState(currentSettingsExtra);
  let dismiss;
  if ($[10] !== onClose) {
    dismiss = () =>
      onClose("Settings dialog dismissed", {
        display: "system",
      });
    $[10] = onClose;
    $[11] = dismiss;
  } else dismiss = $[11];
  let dismissSettings = dismiss;
  useGlobalExitKeybindings(dismissSettings);
  let handleEscape;
  if ($[12] !== dismissSettings || $[13] !== tabsHidden) {
    handleEscape = () => {
      if (tabsHidden) {
        return;
      }
      dismissSettings();
    };
    $[12] = dismissSettings;
    $[13] = tabsHidden;
    $[14] = handleEscape;
  } else handleEscape = $[14];
  let handleEscape_2 = handleEscape;
  const isActive =
    !tabsHidden &&
    !(selectedTab === "Config" && configOwnsEsc) &&
    !(selectedTab === "Gates" && gatesOwnsEsc) &&
    selectedTab !== "Stats";
  let t3;
  if ($[15] !== isActive) {
    t3 = {
      context: "Settings",
      isActive,
    };
    $[15] = isActive;
    $[16] = t3;
  } else t3 = $[16];
  useKeybinding("confirm:no", handleEscape_2, t3);
  let configTab;
  if (
    $[17] !== credentials ||
    $[18] !== statusDiagnostics ||
    $[19] !== getMachineStatusRead_2 ||
    $[20] !== getWebSetupRead_2 ||
    $[21] !== ideInstallationStatus
  ) {
    configTab = jsxProd_default(
      Tab,
      {
        title: "Status",
        children: jsxProd_default(Status, {
          credentials,
          ideInstallationStatus,
          diagnosticsPromise: statusDiagnostics,
          getWebSetupRead: getWebSetupRead_2,
          getMachineStatusRead: getMachineStatusRead_2,
        }),
      },
      "status",
    );
    $[17] = credentials;
    $[18] = statusDiagnostics;
    $[19] = getMachineStatusRead_2;
    $[20] = getWebSetupRead_2;
    $[21] = ideInstallationStatus;
    $[22] = configTab;
  } else configTab = $[22];
  let statusTab;
  if (
    $[23] !== visibleRows ||
    $[24] !== mcpClients ||
    $[25] !== messages ||
    $[26] !== onClose ||
    $[27] !== settingsExtra
  ) {
    statusTab = jsxProd_default(
      Tab,
      {
        title: "Config",
        children: jsxProd_default(suspenseTypeExport, {
          fallback: null,
          children: jsxProd_default(Config, {
            mcpClients,
            messages,
            onClose,
            setTabsHidden,
            onIsSearchModeChange: setConfigOwnsEsc,
            unclaimedPaneClick: settingsExtra,
            contentHeight: visibleRows,
          }),
        }),
      },
      "config",
    );
    $[23] = visibleRows;
    $[24] = mcpClients;
    $[25] = messages;
    $[26] = onClose;
    $[27] = settingsExtra;
    $[28] = statusTab;
  } else statusTab = $[28];
  let children;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(renderGatewayUsageNotice, {});
    $[29] = children;
  } else children = $[29];
  let usageTab;
  if ($[30] !== onClose) {
    usageTab = jsxProd_default(
      Tab,
      {
        title: "Usage",
        children: jsxProd_default(applyUsageFix, {
          onClose,
          children,
        }),
      },
      "usage",
    );
    $[30] = onClose;
    $[31] = usageTab;
  } else usageTab = $[31];
  let otherTab;
  if ($[32] !== onClose) {
    otherTab = jsxProd_default(
      Tab,
      {
        title: "Stats",
        children: jsxProd_default(Stats, {
          onClose,
        }),
      },
      "stats",
    );
    $[32] = onClose;
    $[33] = otherTab;
  } else otherTab = $[33];
  let extraTabs;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    extraTabs = [];
    $[34] = extraTabs;
  } else extraTabs = $[34];
  let t8;
  if ($[35] !== usageTab || $[36] !== otherTab || $[37] !== configTab || $[38] !== statusTab) {
    t8 = [configTab, statusTab, usageTab, otherTab, ...extraTabs];
    $[35] = usageTab;
    $[36] = otherTab;
    $[37] = configTab;
    $[38] = statusTab;
    $[39] = t8;
  } else t8 = $[39];
  let tabs = t8;
  let onClick;
  if ($[40] !== settingsExtra) {
    onClick = (index) => {
      if (!index.isWindowActivation) settingsExtra.emit();
      index.allowDefault();
    };
    $[40] = settingsExtra;
    $[41] = onClick;
  } else onClick = $[41];
  const initialHeaderFocused = defaultTab !== "Config" && defaultTab !== "Gates";
  const contentHeight = insideModal ? undefined : Math.max(0, Math.min(visibleRows - 1, rows - 5));
  let children_2;
  if (
    $[42] !== selectedTab ||
    $[43] !== initialHeaderFocused ||
    $[44] !== contentHeight ||
    $[45] !== tabs ||
    $[46] !== tabsHidden
  ) {
    children_2 = jsxProd_default(Tabs, {
      title: "Settings",
      color: "permission",
      selectedTab,
      onTabChange: setSelectedTab,
      hidden: tabsHidden,
      initialHeaderFocused,
      stableHeight: true,
      contentHeight,
      children: tabs,
    });
    $[42] = selectedTab;
    $[43] = initialHeaderFocused;
    $[44] = contentHeight;
    $[45] = tabs;
    $[46] = tabsHidden;
    $[47] = children_2;
  } else children_2 = $[47];
  let paneElement;
  if ($[48] !== onClick || $[49] !== children_2) {
    paneElement = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default(Box, {
        flexDirection: "column",
        flexShrink: 0,
        onClick,
        children: children_2,
      }),
    });
    $[48] = onClick;
    $[49] = children_2;
    $[50] = paneElement;
  } else paneElement = $[50];
  return paneElement;
}
export { Settings };
