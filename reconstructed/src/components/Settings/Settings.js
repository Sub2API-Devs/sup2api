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
import { Wjo, Gmn } from "../../utils/machineStatus.js";
import { createSignal } from "../../utils/signal.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, fo } from "../../../vendor/react/cjs/react.production.js";
import { Tl, useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useSession } from "../../context/session.js";
import { collectStatusDiagnostics, Status } from "./Status.js";
import { getCloudSessionsStatus } from "./CloudSessionsStatus.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { Config } from "./Config.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { renderGatewayUsageNotice, applyUsageFix } from "./Usage.js";
import { Stats } from "../Stats.js";
import { Pane } from "../design-system/Pane.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-9h8dr0qb.js:113320-113343 sole-consumer
function $f() {
  return [];
}
//@ chunk-9h8dr0qb.js:113343-113368 sole-consumer
function Bf() {
  return Wjo;
}
//@ chunk-9h8dr0qb.js:113368-113394 sole-consumer
function jf() {
  return createSignal();
}
/**
 * 设置对话框外壳：Status / Config / Usage / Stats（/ Gates 仅内部）标签页，关闭时发系统消息。
 */
//@ chunk-9h8dr0qb.js:113394-116279 fingerprint = Settings (0.737)
function Settings(t0) {
  let $ = w(51),
    {
      onClose: onClose,
      storageV5: storageV5,
      credentials: credentials,
      messages: messages,
      mcpClients: mcpClients,
      ideInstallationStatus: ideInstallationStatus,
      defaultTab: defaultTab,
    } = t0,
    [v, F] = y(defaultTab),
    [U, W] = y(!1),
    [M, B] = y(!1),
    [H] = y(!1),
    insideModal = Tl(),
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    ne = insideModal ? rows + 1 : Math.max(15, Math.min(Math.floor(rows * 0.8), 30)),
    V = useSession(),
    J;
  if ($[0] !== credentials || $[1] !== V || $[2] !== storageV5)
    ((J = () => collectStatusDiagnostics(V, storageV5, credentials).catch($f)),
      ($[0] = credentials),
      ($[1] = V),
      ($[2] = storageV5),
      ($[3] = J));
  else J = $[3];
  let [ae] = y(J),
    me = R(null),
    fe;
  if ($[4] !== credentials || $[5] !== V || $[6] !== storageV5)
    ((fe = () => {
      if (me.current === null) me.current = getCloudSessionsStatus(V.host, credentials, storageV5);
      return me.current;
    }),
      ($[4] = credentials),
      ($[5] = V),
      ($[6] = storageV5),
      ($[7] = fe));
  else fe = $[7];
  let De = fe,
    de = R(null),
    ve;
  if ($[8] !== V)
    ((ve = () => {
      if (de.current === null) de.current = Gmn(xo(V).cwd)?.catch(Bf);
      return de.current;
    }),
      ($[8] = V),
      ($[9] = ve));
  else ve = $[9];
  let pe = ve,
    [Ce] = y(jf),
    He;
  if ($[10] !== onClose)
    ((He = () => onClose("Settings dialog dismissed", { display: "system" })),
      ($[10] = onClose),
      ($[11] = He));
  else He = $[11];
  let xe = He;
  useGlobalExitKeybindings(xe);
  let Oe;
  if ($[12] !== xe || $[13] !== U)
    ((Oe = () => {
      if (U) {
        return;
      }
      xe();
    }),
      ($[12] = xe),
      ($[13] = U),
      ($[14] = Oe));
  else Oe = $[14];
  let Ve = Oe;
  const ke = !U && !(v === "Config" && M) && !(v === "Gates" && H) && v !== "Stats";
  let Ue;
  if ($[15] !== ke) ((Ue = { context: "Settings", isActive: ke }), ($[15] = ke), ($[16] = Ue));
  else Ue = $[16];
  useKeybinding("confirm:no", Ve, Ue);
  let Ie;
  if (
    $[17] !== credentials ||
    $[18] !== ae ||
    $[19] !== pe ||
    $[20] !== De ||
    $[21] !== ideInstallationStatus
  )
    ((Ie = e(
      Tab,
      {
        title: "Status",
        children: e(Status, {
          credentials: credentials,
          ideInstallationStatus: ideInstallationStatus,
          diagnosticsPromise: ae,
          getWebSetupRead: De,
          getMachineStatusRead: pe,
        }),
      },
      "status",
    )),
      ($[17] = credentials),
      ($[18] = ae),
      ($[19] = pe),
      ($[20] = De),
      ($[21] = ideInstallationStatus),
      ($[22] = Ie));
  else Ie = $[22];
  let ye;
  if ($[23] !== ne || $[24] !== mcpClients || $[25] !== messages || $[26] !== onClose || $[27] !== Ce)
    ((ye = e(
      Tab,
      {
        title: "Config",
        children: e(fo, {
          fallback: null,
          children: e(Config, {
            mcpClients: mcpClients,
            messages: messages,
            onClose: onClose,
            setTabsHidden: W,
            onIsSearchModeChange: B,
            unclaimedPaneClick: Ce,
            contentHeight: ne,
          }),
        }),
      },
      "config",
    )),
      ($[23] = ne),
      ($[24] = mcpClients),
      ($[25] = messages),
      ($[26] = onClose),
      ($[27] = Ce),
      ($[28] = ye));
  else ye = $[28];
  let We;
  if ($[29] === MEMO_CACHE_SENTINEL) ((We = e(renderGatewayUsageNotice, {})), ($[29] = We));
  else We = $[29];
  let _e;
  if ($[30] !== onClose)
    ((_e = e(
      Tab,
      { title: "Usage", children: e(applyUsageFix, { onClose: onClose, children: We }) },
      "usage",
    )),
      ($[30] = onClose),
      ($[31] = _e));
  else _e = $[31];
  let Ne;
  if ($[32] !== onClose)
    ((Ne = e(Tab, { title: "Stats", children: e(Stats, { onClose: onClose }) }, "stats")),
      ($[32] = onClose),
      ($[33] = Ne));
  else Ne = $[33];
  let at;
  if ($[34] === MEMO_CACHE_SENTINEL) ((at = []), ($[34] = at));
  else at = $[34];
  let ot;
  if ($[35] !== _e || $[36] !== Ne || $[37] !== Ie || $[38] !== ye)
    ((ot = [Ie, ye, _e, Ne, ...at]), ($[35] = _e), ($[36] = Ne), ($[37] = Ie), ($[38] = ye), ($[39] = ot));
  else ot = $[39];
  let st = ot,
    et;
  if ($[40] !== Ce)
    ((et = (Ge) => {
      if (!Ge.isWindowActivation) Ce.emit();
      Ge.allowDefault();
    }),
      ($[40] = Ce),
      ($[41] = et));
  else et = $[41];
  const Qe = defaultTab !== "Config" && defaultTab !== "Gates",
    ze = insideModal ? void 0 : Math.max(0, Math.min(ne - 1, rows - 5));
  let rt;
  if ($[42] !== v || $[43] !== Qe || $[44] !== ze || $[45] !== st || $[46] !== U)
    ((rt = e(Tabs, {
      title: "Settings",
      color: "permission",
      selectedTab: v,
      onTabChange: F,
      hidden: U,
      initialHeaderFocused: Qe,
      stableHeight: !0,
      contentHeight: ze,
      children: st,
    })),
      ($[42] = v),
      ($[43] = Qe),
      ($[44] = ze),
      ($[45] = st),
      ($[46] = U),
      ($[47] = rt));
  else rt = $[47];
  let kt;
  if ($[48] !== et || $[49] !== rt)
    ((kt = e(Pane, {
      color: "permission",
      children: e(Box, { flexDirection: "column", flexShrink: 0, onClick: et, children: rt }),
    })),
      ($[48] = et),
      ($[49] = rt),
      ($[50] = kt));
  else kt = $[50];
  return kt;
}

export { Settings };
