/**
 * components/Settings/Status.tsx
 *
 * /status 标签页：版本、会话名、cwd、账号/组织、认证方式、模型、MCP/插件/IDE 状态、设置来源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Settings/Status.tsx
 * pieces: chunk-6p6y0k3t.js (11), chunk-9h8dr0qb.js (1), chunk-ja34p3ys.js (1)
 * attribution: placement 1, fingerprint 7, layout 4, callgraph-witnessed 1
 */
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { Box, Text } from "../../ink/components/Text.js";
import { StatusIcon, STATUS_CONFIG } from "../design-system/StatusIcon.js";
import { env, udsEnv } from "../../utils/env.js";
import { nullStub, u_i } from "../../utils/externalBuildStubs.js";
import { Jn, wt } from "../../remote/remoteMode.js";
import { getCurrentSessionDisplayTitle } from "../../utils/sessionStorage.js";
import { getAllowedChannels, getMemoryToggledOff } from "../../bootstrap/state.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isChannelsEnabled } from "../../services/mcp/channelAllowlist.js";
import { isChannelsPolicyBlocked } from "../../services/mcp/channelNotification.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { getBuildRefSuffix } from "../../cli/earlyArgs.js";
import { isBgSession, isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getUdsInboxUnavailableReason } from "../../utils/udsMessaging.js";
import { g_n } from "../../utils/fullscreen.js";
import {
  buildAccountProperties,
  buildAPIProviderProperties,
  modelStatusLabel,
  mPs,
  buildIDEProperties,
  buildMcpProperties,
  pPs,
  fPs,
  buildSettingSourcesStatusProperties,
  buildSandboxProperties,
  SPs,
  buildInstallationDiagnostics,
  getSettingsStatusNotices,
  getProcessWrapperStatusNotices,
  buildMemoryDiagnostics,
  probeRefreshTokenDead,
  moveAntOnlyToEnd,
} from "../../utils/status.js";
import { getCloudSessionsStatusRows, Be, We, Ve, Ye, Xe, Ke, qe } from "./CloudSessionsStatus.js";
import {
  getComplianceTaints,
  normalizeComplianceTaints,
  MPn,
  complianceTaintLabel,
  POLICY_LIMITED_NOTICE,
} from "../../services/policyLimits/complianceTaints.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, P, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { Tl } from "../ScrollViewportContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { useAppState } from "../../state/AppState.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { useCwdDerived } from "../../utils/cwd.js";

//@ chunk-6p6y0k3t.js:2135-2384 placement = isRow (0.477)
function renderPropertyRows(tt, Y) {
  return [
    Y > 0 &&
      r(
        FlexDirectionRow.Row,
        { children: [e(Fragment, { children: " " }), e(Fragment, { children: "" })] },
        `gap-${Y}`,
      ),
    ...tt.map((o, ot) => {
      let { label: label, value: nt } = o;
      return r(
        FlexDirectionRow.Row,
        {
          children: [
            e(Fragment, { children: label !== void 0 ? `${label}:` : "" }),
            e(PropertyValue, { value: nt }),
          ],
        },
        `${Y}-${ot}`,
      );
    }),
  ];
}
//@ chunk-6p6y0k3t.js:2384-2542 fingerprint = _temp5 (0.929)
function renderDiagnosticRow(diagnostic, i) {
  return r(
    Box,
    {
      flexDirection: "row",
      gap: 1,
      paddingX: 1,
      children: [
        e(StatusIcon, { status: "warning" }),
        typeof diagnostic === "string" ? e(Text, { wrap: "wrap", children: diagnostic }) : diagnostic,
      ],
    },
    i,
  );
}
//@ chunk-6p6y0k3t.js:2542-2582 layout
var Syo = " (details in the --debug log)";
//@ chunk-6p6y0k3t.js:2582-4511 callgraph-witnessed = buildPrimarySection (0.197)
function buildPrimarySection({
  sessionId: sessionId,
  remoteSessionName: remoteSessionName,
  cwd: cwd,
  accountStatus: accountStatus,
  machineStatus: machineStatus,
  webSetupStatus: webSetupStatus,
}) {
  let CLAUDE_CODE_TMUX_SESSION = env.CLAUDE_CODE_TMUX_SESSION,
    sessionId_2 = nullStub(),
    C = u_i(),
    p = Jn()?.sessionId,
    nameValue =
      remoteSessionName ??
      getCurrentSessionDisplayTitle(sessionId) ??
      e(Text, { dimColor: !0, children: "/rename to add a name" }),
    m = getAllowedChannels(),
    f = "";
  if (m.length > 0) {
    let joined = m
        .map((h) => (h.kind === "plugin" ? `plugin:${h.name}@${h.marketplace}` : `server:${h.name}`))
        .join(", "),
      g =
        getAPIProvider() !== "firstParty"
          ? "not available on third-party providers"
          : !isChannelsEnabled()
            ? "not currently available"
            : isChannelsPolicyBlocked(getSettingsForSource("policySettings"))
              ? "blocked by org policy"
              : void 0;
    f = g ? `Configured but not active (${g}): ${joined}` : `Listening for messages from ${joined}`;
  }
  return [
    {
      label: "Version",
      value: `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}${getBuildRefSuffix()}`,
    },
    ...[],
    { label: "Session name", value: nameValue },
    { label: p === sessionId ? "Cloud session ID" : "Session ID", value: sessionId },
    ...(p !== void 0 && p !== sessionId ? [{ label: "Cloud session ID", value: p }] : []),
    {
      label: "Session kind",
      value: !isBgSession()
        ? "interactive"
        : isUnattendedBgSession()
          ? "background job \xB7 unattended"
          : "background job \xB7 attached",
    },
    ...(CLAUDE_CODE_TMUX_SESSION ? [{ label: "tmux session", value: CLAUDE_CODE_TMUX_SESSION }] : []),
    ...(f ? [{ label: "Channels", value: f }] : []),
    ...(isCrossSessionMessagingEnabled() && udsEnv.CLAUDE_CODE_MESSAGING_SOCKET
      ? [{ label: "Peer address", value: `uds:${udsEnv.CLAUDE_CODE_MESSAGING_SOCKET}` }]
      : []),
    ...(isCrossSessionMessagingEnabled() &&
    !udsEnv.CLAUDE_CODE_MESSAGING_SOCKET &&
    getUdsInboxUnavailableReason() !== void 0
      ? [{ label: "Peer address", value: `unavailable \u2014 ${getUdsInboxUnavailableReason()}${Syo}` }]
      : []),
    ...(getMemoryToggledOff()
      ? [
          {
            label: "Memory",
            value: g_n()
              ? "Paused for this session \xB7 /pause-memory to resume"
              : "Paused for this session \xB7 see /account-memory",
          },
        ]
      : []),
    ...[],
    { label: "cwd", value: cwd },
    ...buildAccountProperties(accountStatus),
    ...getCloudSessionsStatusRows(webSetupStatus),
    ...getComplianceRows(),
    ...buildAPIProviderProperties(),
  ];
}
//@ chunk-6p6y0k3t.js:4511-4713 layout
function getComplianceRows() {
  let o = getComplianceTaints();
  if (o.length === 0) return [];
  return [
    {
      label: "Organization configuration",
      value: normalizeComplianceTaints(o).map((t) => (MPn(t) ? complianceTaintLabel(t) : t)),
    },
    ...(o.includes("hipaa") ? [{ value: e(Text, { dimColor: !0, children: POLICY_LIMITED_NOTICE }) }] : []),
  ];
}
//@ chunk-6p6y0k3t.js:4713-4947 fingerprint = buildSecondarySection (0.947)
function buildSecondarySection({
  mainLoopModel: mainLoopModel,
  mcp: mcp,
  theme: theme,
  ideInstallationStatus: ideInstallationStatus,
  permissionMode: permissionMode,
}) {
  return [
    { label: "Model", value: modelStatusLabel(mainLoopModel) },
    ...mPs(),
    ...(wt()
      ? []
      : [
          ...buildIDEProperties(mcp.clients, ideInstallationStatus, theme),
          ...buildMcpProperties(mcp.clients, theme),
          ...pPs(),
          ...fPs(),
        ]),
    ...buildSettingSourcesStatusProperties(),
    ...buildSandboxProperties(permissionMode),
    ...SPs(),
  ];
}
/**
 * 并行收集 /status 页的诊断：安装诊断、设置状态提示、进程包装器提示，以及（非远程视图时）记忆文件诊断，合并成一个列表。
 */
//@ chunk-6p6y0k3t.js:4947-5048 layout
async function collectStatusDiagnostics(o, t, a) {
  return (
    await Promise.all([
      buildInstallationDiagnostics(),
      getSettingsStatusNotices(t),
      getProcessWrapperStatusNotices(t),
      wt() ? [] : buildMemoryDiagnostics(o, t, a),
    ])
  ).flat();
}
//@ chunk-6p6y0k3t.js:5048-5492 fingerprint = PropertyValue (1)
function PropertyValue(t0) {
  let $ = w(8),
    { value: value } = t0;
  if (Array.isArray(value)) {
    let l;
    if ($[0] !== value) {
      let d;
      if ($[2] !== value.length)
        ((d = (item, u) => r(Text, { children: [item, u < value.length - 1 ? "," : ""] }, u)),
          ($[2] = value.length),
          ($[3] = d));
      else d = $[3];
      l = value.map(d);
      (($[0] = value), ($[1] = l));
    } else l = $[1];
    let d;
    if ($[4] !== l)
      ((d = e(Box, { flexWrap: "wrap", columnGap: 1, flexShrink: 99, children: l })), ($[4] = l), ($[5] = d));
    else d = $[5];
    return d;
  }
  if (typeof value === "string") {
    let l;
    if ($[6] !== value) ((l = e(Text, { children: value })), ($[6] = value), ($[7] = l));
    else l = $[7];
    return l;
  }
  return value;
}
/**
 * /status：构造主区（版本、会话名、cwd、账号、认证、API 提供商）与次区（模型、MCP、插件、IDE、内存文件、设置来源），以属性列表显示。
 */
//@ chunk-6p6y0k3t.js:5492-6838 fingerprint = Status (0.588)
function Status(t0) {
  let $ = w(26),
    {
      credentials: credentials,
      ideInstallationStatus: ideInstallationStatus,
      diagnosticsPromise: diagnosticsPromise,
      getWebSetupRead: getWebSetupRead,
      getMachineStatusRead: getMachineStatusRead,
    } = t0,
    v;
  if ($[0] !== credentials)
    ((v = () => probeRefreshTokenDead(credentials)), ($[0] = credentials), ($[1] = v));
  else v = $[1];
  let [C] = y(v),
    p;
  if ($[2] !== getMachineStatusRead)
    ((p = () => getMachineStatusRead()), ($[2] = getMachineStatusRead), ($[3] = p));
  else p = $[3];
  let [E] = y(p),
    I;
  if ($[4] !== getWebSetupRead) ((I = () => getWebSetupRead()), ($[4] = getWebSetupRead), ($[5] = I));
  else I = $[5];
  let [m] = y(I),
    f;
  if ($[6] !== m) ((f = () => m?.current()), ($[6] = m), ($[7] = f));
  else f = $[7];
  let [b, g] = y(f),
    h,
    O;
  if ($[8] !== m)
    ((h = () => {
      let N = !0;
      return (
        m?.settled.then(() => {
          if (N) g(m.current());
        }),
        () => {
          N = !1;
        }
      );
    }),
      (O = [m]),
      ($[8] = m),
      ($[9] = h),
      ($[10] = O));
  else ((h = $[9]), (O = $[10]));
  P(h, O);
  let grow = Tl() ? 1 : void 0,
    M;
  if ($[11] !== C || $[12] !== ideInstallationStatus || $[13] !== E || $[14] !== b)
    ((M = e(fo, {
      fallback: null,
      children: e(StatusProperties, {
        ideInstallationStatus: ideInstallationStatus,
        accountStatusRead: C,
        machineStatusRead: E,
        webSetupStatus: b,
      }),
    })),
      ($[11] = C),
      ($[12] = ideInstallationStatus),
      ($[13] = E),
      ($[14] = b),
      ($[15] = M));
  else M = $[15];
  let A;
  if ($[16] !== diagnosticsPromise)
    ((A = e(fo, { fallback: null, children: e(Diagnostics, { promise: diagnosticsPromise }) })),
      ($[16] = diagnosticsPromise),
      ($[17] = A));
  else A = $[17];
  let L;
  if ($[18] !== grow || $[19] !== M || $[20] !== A)
    ((L = r(Box, { flexDirection: "column", gap: 1, flexGrow: grow, children: [M, A] })),
      ($[18] = grow),
      ($[19] = M),
      ($[20] = A),
      ($[21] = L));
  else L = $[21];
  let W;
  if ($[22] === MEMO_CACHE_SENTINEL)
    ((W = e(Text, {
      dimColor: !0,
      italic: !1,
      children: e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Settings",
        fallback: "Esc",
        description: "cancel",
        ...nd(!1),
      }),
    })),
      ($[22] = W));
  else W = $[22];
  let V;
  if ($[23] !== grow || $[24] !== L)
    ((V = r(Box, { flexDirection: "column", gap: 1, flexGrow: grow, children: [L, W] })),
      ($[23] = grow),
      ($[24] = L),
      ($[25] = V));
  else V = $[25];
  return V;
}
/**
 * /status 页的属性表：会话 id/名字、cwd、账号与机器状态、云会话设置、模型、MCP、主题、IDE、权限模式；远程/云会话下注明哪些行来自远端。
 */
//@ chunk-6p6y0k3t.js:6838-7975 layout
function StatusProperties(props) {
  let $ = w(18),
    {
      ideInstallationStatus: ideInstallationStatus,
      accountStatusRead: accountStatusRead,
      machineStatusRead: machineStatusRead,
      webSetupStatus: webSetupStatus,
    } = props,
    c = accountStatusRead === void 0 ? void 0 : Qr(accountStatusRead),
    u = machineStatusRead === void 0 ? void 0 : Qr(machineStatusRead),
    mainLoopModel = useAppState(Be),
    C = useMainLoopModelSetting() ?? mainLoopModel,
    mcp = useAppState(We),
    mode = useAppState(Ve),
    remoteSessionName = useAppState(Ye),
    [m] = useTheme(),
    id = useSession(Xe),
    b = useCwdDerived(useSession(Ke)),
    h;
  if (
    $[0] !== c ||
    $[1] !== b ||
    $[2] !== ideInstallationStatus ||
    $[3] !== u ||
    $[4] !== C ||
    $[5] !== mcp ||
    $[6] !== mode ||
    $[7] !== remoteSessionName ||
    $[8] !== id ||
    $[9] !== m ||
    $[10] !== webSetupStatus
  )
    ((h = moveAntOnlyToEnd([
      buildPrimarySection({
        sessionId: id,
        remoteSessionName: remoteSessionName,
        cwd: b,
        accountStatus: c,
        machineStatus: u,
        webSetupStatus: webSetupStatus,
      }),
      buildSecondarySection({
        mainLoopModel: C,
        mcp: mcp,
        theme: m,
        ideInstallationStatus: ideInstallationStatus,
        permissionMode: mode,
      }),
    ])),
      ($[0] = c),
      ($[1] = b),
      ($[2] = ideInstallationStatus),
      ($[3] = u),
      ($[4] = C),
      ($[5] = mcp),
      ($[6] = mode),
      ($[7] = remoteSessionName),
      ($[8] = id),
      ($[9] = m),
      ($[10] = webSetupStatus),
      ($[11] = h));
  else h = $[11];
  let O = h,
    N;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((N =
      wt() &&
      r(Text, {
        dimColor: !0,
        children: [
          "Model and cwd are the",
          " ",
          Jn()?.sessionId ? "cloud" : "remote",
          " session's; the other rows describe this terminal. /mcp asks the session too.",
        ],
      })),
      ($[12] = N));
  else N = $[12];
  let R;
  if ($[13] === MEMO_CACHE_SENTINEL) ((R = [{ bold: !0 }, { width: "fill" }]), ($[13] = R));
  else R = $[13];
  let M;
  if ($[14] !== O) ((M = O.filter(qe).flatMap(renderPropertyRows)), ($[14] = O), ($[15] = M));
  else M = $[15];
  let A;
  if ($[16] !== M)
    ((A = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [N, e(FlexDirectionRow, { columns: R, children: M })],
    })),
      ($[16] = M),
      ($[17] = A));
  else A = $[17];
  return A;
}
//@ chunk-6p6y0k3t.js:7975-8307 fingerprint = Diagnostics (0.464)
function Diagnostics(t0) {
  let $ = w(5),
    { promise: promise } = t0,
    diagnostics = Qr(promise);
  if (diagnostics.length === 0) {
    return null;
  }
  let d;
  if ($[0] === MEMO_CACHE_SENTINEL) ((d = e(Text, { bold: !0, children: "System diagnostics" })), ($[0] = d));
  else d = $[0];
  let c;
  if ($[1] !== diagnostics) ((c = diagnostics.map(renderDiagnosticRow)), ($[1] = diagnostics), ($[2] = c));
  else c = $[2];
  let u;
  if ($[3] !== c)
    ((u = r(Box, { flexDirection: "column", paddingBottom: 1, children: [d, c] })), ($[3] = c), ($[4] = u));
  else u = $[4];
  return u;
}
//@ chunk-9h8dr0qb.js:42639-42676 fingerprint = _temp2 (0.693)
function selectMcpCommands(s_0) {
  return s_0.mcp.commands;
}
//@ chunk-ja34p3ys.js:340-785 fingerprint = _temp3 (0.656)
function StatusRow(x) {
  let $ = w(9),
    { status: status, children: children } = x,
    { color: color } = STATUS_CONFIG[status],
    c;
  if ($[0] !== status)
    ((c = e(Box, { width: 2, flexShrink: 0, children: e(StatusIcon, { status: status }) })),
      ($[0] = status),
      ($[1] = c));
  else c = $[1];
  const u = !color;
  let a;
  if ($[2] !== children || $[3] !== color || $[4] !== u)
    ((a = e(Box, {
      flexGrow: 1,
      flexShrink: 1,
      children: e(Text, { color: color, dimColor: u, children: children }),
    })),
      ($[2] = children),
      ($[3] = color),
      ($[4] = u),
      ($[5] = a));
  else a = $[5];
  let d;
  if ($[6] !== c || $[7] !== a)
    ((d = r(Box, { flexDirection: "row", children: [c, a] })), ($[6] = c), ($[7] = a), ($[8] = d));
  else d = $[8];
  return d;
}

export {
  buildPrimarySection,
  buildSecondarySection,
  Syo,
  StatusRow,
  selectMcpCommands,
  collectStatusDiagnostics,
  Status,
};
