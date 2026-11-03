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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, fo } from "../../../vendor/react/cjs/react.production.js";
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
  let $ = w(51);
  let { onClose, storageV5, credentials, messages, mcpClients, ideInstallationStatus, defaultTab } = props;
  let [selectedTab, setSelectedTab] = y(defaultTab);
  let [tabsHidden, setTabsHidden] = y(false);
  let [configOwnsEsc, setConfigOwnsEsc] = y(false);
  let [gatesOwnsEsc] = y(false);
  let insideModal = useHasScrollViewport();
  let { rows } = useScrollViewportSize(useTerminalSize());
  let ne = insideModal ? rows + 1 : Math.max(15, Math.min(Math.floor(rows * 0.8), 30));
  let session = useSession();
  let J;
  if ($[0] !== credentials || $[1] !== session || $[2] !== storageV5) {
    J = () => collectStatusDiagnostics(session, storageV5, credentials).catch(emptySettingsExtra);
    $[0] = credentials;
    $[1] = session;
    $[2] = storageV5;
    $[3] = J;
  } else J = $[3];
  let [ae] = y(J);
  let cloudSessionsStatusRef = R(null);
  let fe;
  if ($[4] !== credentials || $[5] !== session || $[6] !== storageV5) {
    fe = () => {
      if (cloudSessionsStatusRef.current === null)
        cloudSessionsStatusRef.current = getCloudSessionsStatus(session.host, credentials, storageV5);
      return cloudSessionsStatusRef.current;
    };
    $[4] = credentials;
    $[5] = session;
    $[6] = storageV5;
    $[7] = fe;
  } else fe = $[7];
  let getWebSetupRead = fe;
  let de = R(null);
  let ve;
  if ($[8] !== session) {
    ve = () => {
      if (de.current === null)
        de.current = noopMachineStatusHook(getSessionProject(session).cwd)?.catch(defaultSettingsExtra);
      return de.current;
    };
    $[8] = session;
    $[9] = ve;
  } else ve = $[9];
  let getMachineStatusRead = ve;
  let [Ce] = y(currentSettingsExtra);
  let He;
  if ($[10] !== onClose) {
    He = () =>
      onClose("Settings dialog dismissed", {
        display: "system",
      });
    $[10] = onClose;
    $[11] = He;
  } else He = $[11];
  let xe = He;
  useGlobalExitKeybindings(xe);
  let Oe;
  if ($[12] !== xe || $[13] !== tabsHidden) {
    Oe = () => {
      if (tabsHidden) {
        return;
      }
      xe();
    };
    $[12] = xe;
    $[13] = tabsHidden;
    $[14] = Oe;
  } else Oe = $[14];
  let handleEscape = Oe;
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
  useKeybinding("confirm:no", handleEscape, t3);
  let Ie;
  if (
    $[17] !== credentials ||
    $[18] !== ae ||
    $[19] !== getMachineStatusRead ||
    $[20] !== getWebSetupRead ||
    $[21] !== ideInstallationStatus
  ) {
    Ie = jsxProd_default(
      Tab,
      {
        title: "Status",
        children: jsxProd_default(Status, {
          credentials,
          ideInstallationStatus,
          diagnosticsPromise: ae,
          getWebSetupRead,
          getMachineStatusRead,
        }),
      },
      "status",
    );
    $[17] = credentials;
    $[18] = ae;
    $[19] = getMachineStatusRead;
    $[20] = getWebSetupRead;
    $[21] = ideInstallationStatus;
    $[22] = Ie;
  } else Ie = $[22];
  let ye;
  if ($[23] !== ne || $[24] !== mcpClients || $[25] !== messages || $[26] !== onClose || $[27] !== Ce) {
    ye = jsxProd_default(
      Tab,
      {
        title: "Config",
        children: jsxProd_default(fo, {
          fallback: null,
          children: jsxProd_default(Config, {
            mcpClients,
            messages,
            onClose,
            setTabsHidden,
            onIsSearchModeChange: setConfigOwnsEsc,
            unclaimedPaneClick: Ce,
            contentHeight: ne,
          }),
        }),
      },
      "config",
    );
    $[23] = ne;
    $[24] = mcpClients;
    $[25] = messages;
    $[26] = onClose;
    $[27] = Ce;
    $[28] = ye;
  } else ye = $[28];
  let children;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(renderGatewayUsageNotice, {});
    $[29] = children;
  } else children = $[29];
  let _e;
  if ($[30] !== onClose) {
    _e = jsxProd_default(
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
    $[31] = _e;
  } else _e = $[31];
  let Ne;
  if ($[32] !== onClose) {
    Ne = jsxProd_default(
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
    $[33] = Ne;
  } else Ne = $[33];
  let at;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    at = [];
    $[34] = at;
  } else at = $[34];
  let t8;
  if ($[35] !== _e || $[36] !== Ne || $[37] !== Ie || $[38] !== ye) {
    t8 = [Ie, ye, _e, Ne, ...at];
    $[35] = _e;
    $[36] = Ne;
    $[37] = Ie;
    $[38] = ye;
    $[39] = t8;
  } else t8 = $[39];
  let tabs = t8;
  let onClick;
  if ($[40] !== Ce) {
    onClick = (Ge) => {
      if (!Ge.isWindowActivation) Ce.emit();
      Ge.allowDefault();
    };
    $[40] = Ce;
    $[41] = onClick;
  } else onClick = $[41];
  const initialHeaderFocused = defaultTab !== "Config" && defaultTab !== "Gates";
  const contentHeight = insideModal ? undefined : Math.max(0, Math.min(ne - 1, rows - 5));
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
  let kt;
  if ($[48] !== onClick || $[49] !== children_2) {
    kt = jsxProd_default(Pane, {
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
    $[50] = kt;
  } else kt = $[50];
  return kt;
}
export { Settings };
