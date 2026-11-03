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
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { Box, Text } from "../../ink/components/Text.js";
import { StatusIcon, STATUS_CONFIG } from "../design-system/StatusIcon.js";
import { env, udsEnv } from "../../utils/env.js";
import { nullStub, nullStub2 } from "../../utils/externalBuildStubs.js";
import { getRemoteCaps, isRemoteSessionAvailable } from "../../remote/remoteMode.js";
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
import { isRemoteSdkOrRemoteMode } from "../../utils/fullscreen.js";
import {
  buildAccountProperties,
  buildAPIProviderProperties,
  modelStatusLabel,
  modelStatusRows,
  buildIDEProperties,
  buildMcpProperties,
  toolSearchStatusRows,
  mcpStatusRows,
  buildSettingSourcesStatusProperties,
  buildSandboxProperties,
  extraStatusRows,
  buildInstallationDiagnostics,
  getSettingsStatusNotices,
  getProcessWrapperStatusNotices,
  buildMemoryDiagnostics,
  probeRefreshTokenDead,
  moveAntOnlyToEnd,
} from "../../utils/status.js";
import {
  getCloudSessionsStatusRows,
  selectMainLoopModel,
  selectMcp,
  selectPermissionMode,
  selectRemoteSessionName,
  selectSessionId,
  selectCwd,
  hasItems,
} from "./CloudSessionsStatus.js";
import {
  getComplianceTaints,
  normalizeComplianceTaints,
  isKnownComplianceTaint,
  complianceTaintLabel,
  POLICY_LIMITED_NOTICE,
} from "../../services/policyLimits/complianceTaints.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, P, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { useHasScrollViewport } from "../ScrollViewportContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { useAppState } from "../../state/AppState.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { useCwdDerived } from "../../utils/cwd.js";

//@ chunk-6p6y0k3t.js:2135-2384 placement = isRow (0.477)
function renderPropertyRows(tt, Y) {
  return [
    Y > 0 &&
      jsxProd_default_2(
        FlexDirectionRow.Row,
        {
          children: [
            jsxProd_default(Fragment, {
              children: " ",
            }),
            jsxProd_default(Fragment, {
              children: "",
            }),
          ],
        },
        `gap-${Y}`,
      ),
    ...tt.map((o, ot) => {
      let { label, value: nt } = o;
      return jsxProd_default_2(
        FlexDirectionRow.Row,
        {
          children: [
            jsxProd_default(Fragment, {
              children: label !== undefined ? `${label}:` : "",
            }),
            jsxProd_default(PropertyValue, {
              value: nt,
            }),
          ],
        },
        `${Y}-${ot}`,
      );
    }),
  ];
}
//@ chunk-6p6y0k3t.js:2384-2542 fingerprint = _temp5 (0.929)
function renderDiagnosticRow(diagnostic, i) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      gap: 1,
      paddingX: 1,
      children: [
        jsxProd_default(StatusIcon, {
          status: "warning",
        }),
        typeof diagnostic === "string"
          ? jsxProd_default(Text, {
              wrap: "wrap",
              children: diagnostic,
            })
          : diagnostic,
      ],
    },
    i,
  );
}
//@ chunk-6p6y0k3t.js:2542-2582 layout
/**
 * 导出值：DEBUG_DETAILS_SUFFIX（" (details in the --debug log)"）；位于「/status 标签页：版本、会话名、cwd、账号/组织、认证方式、模型、MCP/插件/IDE 状态、设置来源」模块。
 */
var DEBUG_DETAILS_SUFFIX = " (details in the --debug log)";
//@ chunk-6p6y0k3t.js:2582-4511 callgraph-witnessed = buildPrimarySection (0.197)
function buildPrimarySection({
  sessionId,
  remoteSessionName,
  cwd,
  accountStatus,
  machineStatus,
  webSetupStatus,
}) {
  let CLAUDE_CODE_TMUX_SESSION = env.CLAUDE_CODE_TMUX_SESSION;
  let sessionId_2 = nullStub();
  let C = nullStub2();
  let sessionId_3 = getRemoteCaps()?.sessionId;
  let nameValue =
    remoteSessionName ??
    getCurrentSessionDisplayTitle(sessionId) ??
    jsxProd_default(Text, {
      dimColor: true,
      children: "/rename to add a name",
    });
  let allowedChannels = getAllowedChannels();
  let f = "";
  if (allowedChannels.length > 0) {
    let joined = allowedChannels
      .map((allowedChannel) =>
        allowedChannel.kind === "plugin"
          ? `plugin:${allowedChannel.name}@${allowedChannel.marketplace}`
          : `server:${allowedChannel.name}`,
      )
      .join(", ");
    let g =
      getAPIProvider() !== "firstParty"
        ? "not available on third-party providers"
        : !isChannelsEnabled()
          ? "not currently available"
          : isChannelsPolicyBlocked(getSettingsForSource("policySettings"))
            ? "blocked by org policy"
            : undefined;
    f = g ? `Configured but not active (${g}): ${joined}` : `Listening for messages from ${joined}`;
  }
  return [
    {
      label: "Version",
      value: `${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      }${getBuildRefSuffix()}`,
    },
    ...[],
    {
      label: "Session name",
      value: nameValue,
    },
    {
      label: sessionId_3 === sessionId ? "Cloud session ID" : "Session ID",
      value: sessionId,
    },
    ...(sessionId_3 !== undefined && sessionId_3 !== sessionId
      ? [
          {
            label: "Cloud session ID",
            value: sessionId_3,
          },
        ]
      : []),
    {
      label: "Session kind",
      value: !isBgSession()
        ? "interactive"
        : isUnattendedBgSession()
          ? "background job \xB7 unattended"
          : "background job \xB7 attached",
    },
    ...(CLAUDE_CODE_TMUX_SESSION
      ? [
          {
            label: "tmux session",
            value: CLAUDE_CODE_TMUX_SESSION,
          },
        ]
      : []),
    ...(f
      ? [
          {
            label: "Channels",
            value: f,
          },
        ]
      : []),
    ...(isCrossSessionMessagingEnabled() && udsEnv.CLAUDE_CODE_MESSAGING_SOCKET
      ? [
          {
            label: "Peer address",
            value: `uds:${udsEnv.CLAUDE_CODE_MESSAGING_SOCKET}`,
          },
        ]
      : []),
    ...(isCrossSessionMessagingEnabled() &&
    !udsEnv.CLAUDE_CODE_MESSAGING_SOCKET &&
    getUdsInboxUnavailableReason() !== undefined
      ? [
          {
            label: "Peer address",
            value: `unavailable \u2014 ${getUdsInboxUnavailableReason()}${DEBUG_DETAILS_SUFFIX}`,
          },
        ]
      : []),
    ...(getMemoryToggledOff()
      ? [
          {
            label: "Memory",
            value: isRemoteSdkOrRemoteMode()
              ? "Paused for this session \xB7 /pause-memory to resume"
              : "Paused for this session \xB7 see /account-memory",
          },
        ]
      : []),
    ...[],
    {
      label: "cwd",
      value: cwd,
    },
    ...buildAccountProperties(accountStatus),
    ...getCloudSessionsStatusRows(webSetupStatus),
    ...getComplianceRows(),
    ...buildAPIProviderProperties(),
  ];
}
//@ chunk-6p6y0k3t.js:4511-4713 layout
function getComplianceRows() {
  let complianceTaints = getComplianceTaints();
  if (complianceTaints.length === 0) return [];
  return [
    {
      label: "Organization configuration",
      value: normalizeComplianceTaints(complianceTaints).map((t) =>
        isKnownComplianceTaint(t) ? complianceTaintLabel(t) : t,
      ),
    },
    ...(complianceTaints.includes("hipaa")
      ? [
          {
            value: jsxProd_default(Text, {
              dimColor: true,
              children: POLICY_LIMITED_NOTICE,
            }),
          },
        ]
      : []),
  ];
}
//@ chunk-6p6y0k3t.js:4713-4947 fingerprint = buildSecondarySection (0.947)
function buildSecondarySection({ mainLoopModel, mcp, theme, ideInstallationStatus, permissionMode }) {
  return [
    {
      label: "Model",
      value: modelStatusLabel(mainLoopModel),
    },
    ...modelStatusRows(),
    ...(isRemoteSessionAvailable()
      ? []
      : [
          ...buildIDEProperties(mcp.clients, ideInstallationStatus, theme),
          ...buildMcpProperties(mcp.clients, theme),
          ...toolSearchStatusRows(),
          ...mcpStatusRows(),
        ]),
    ...buildSettingSourcesStatusProperties(),
    ...buildSandboxProperties(permissionMode),
    ...extraStatusRows(),
  ];
}
//@ chunk-6p6y0k3t.js:4947-5048 layout
/**
 * 并行收集 /status 页的诊断：安装诊断、设置状态提示、进程包装器提示，以及（非远程视图时）记忆文件诊断，合并成一个列表。
 */
async function collectStatusDiagnostics(session, storageV5, credentials) {
  return (
    await Promise.all([
      buildInstallationDiagnostics(),
      getSettingsStatusNotices(storageV5),
      getProcessWrapperStatusNotices(storageV5),
      isRemoteSessionAvailable() ? [] : buildMemoryDiagnostics(session, storageV5, credentials),
    ])
  ).flat();
}
//@ chunk-6p6y0k3t.js:5048-5492 fingerprint = PropertyValue (1)
function PropertyValue(props) {
  let $ = w(8);
  let { value } = props;
  if (Array.isArray(value)) {
    let children;
    if ($[0] !== value) {
      let t2;
      if ($[2] !== value.length) {
        t2 = (item, i) =>
          jsxProd_default_2(
            Text,
            {
              children: [item, i < value.length - 1 ? "," : ""],
            },
            i,
          );
        $[2] = value.length;
        $[3] = t2;
      } else t2 = $[3];
      children = value.map(t2);
      $[0] = value;
      $[1] = children;
    } else children = $[1];
    let t2;
    if ($[4] !== children) {
      t2 = jsxProd_default(Box, {
        flexWrap: "wrap",
        columnGap: 1,
        flexShrink: 99,
        children,
      });
      $[4] = children;
      $[5] = t2;
    } else t2 = $[5];
    return t2;
  }
  if (typeof value === "string") {
    let t1;
    if ($[6] !== value) {
      t1 = jsxProd_default(Text, {
        children: value,
      });
      $[6] = value;
      $[7] = t1;
    } else t1 = $[7];
    return t1;
  }
  return value;
}
//@ chunk-6p6y0k3t.js:5492-6838 fingerprint = Status (0.588)
/**
 * /status：构造主区（版本、会话名、cwd、账号、认证、API 提供商）与次区（模型、MCP、插件、IDE、内存文件、设置来源），以属性列表显示。
 */
function Status(props) {
  let $ = w(26);
  let { credentials, ideInstallationStatus, diagnosticsPromise, getWebSetupRead, getMachineStatusRead } =
    props;
  let v;
  if ($[0] !== credentials) {
    v = () => probeRefreshTokenDead(credentials);
    $[0] = credentials;
    $[1] = v;
  } else v = $[1];
  let [C] = y(v);
  let p;
  if ($[2] !== getMachineStatusRead) {
    p = () => getMachineStatusRead();
    $[2] = getMachineStatusRead;
    $[3] = p;
  } else p = $[3];
  let [E] = y(p);
  let I;
  if ($[4] !== getWebSetupRead) {
    I = () => getWebSetupRead();
    $[4] = getWebSetupRead;
    $[5] = I;
  } else I = $[5];
  let [m] = y(I);
  let f;
  if ($[6] !== m) {
    f = () => m?.current();
    $[6] = m;
    $[7] = f;
  } else f = $[7];
  let [b, g] = y(f);
  let h;
  let O;
  if ($[8] !== m) {
    h = () => {
      let N = true;
      m?.settled.then(() => {
        if (N) g(m.current());
      });
      return () => {
        N = false;
      };
    };
    O = [m];
    $[8] = m;
    $[9] = h;
    $[10] = O;
  } else {
    h = $[9];
    O = $[10];
  }
  P(h, O);
  let grow = useHasScrollViewport() ? 1 : undefined;
  let M;
  if ($[11] !== C || $[12] !== ideInstallationStatus || $[13] !== E || $[14] !== b) {
    M = jsxProd_default(fo, {
      fallback: null,
      children: jsxProd_default(StatusProperties, {
        ideInstallationStatus,
        accountStatusRead: C,
        machineStatusRead: E,
        webSetupStatus: b,
      }),
    });
    $[11] = C;
    $[12] = ideInstallationStatus;
    $[13] = E;
    $[14] = b;
    $[15] = M;
  } else M = $[15];
  let t5;
  if ($[16] !== diagnosticsPromise) {
    t5 = jsxProd_default(fo, {
      fallback: null,
      children: jsxProd_default(Diagnostics, {
        promise: diagnosticsPromise,
      }),
    });
    $[16] = diagnosticsPromise;
    $[17] = t5;
  } else t5 = $[17];
  let t6;
  if ($[18] !== grow || $[19] !== M || $[20] !== t5) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      flexGrow: grow,
      children: [M, t5],
    });
    $[18] = grow;
    $[19] = M;
    $[20] = t5;
    $[21] = t6;
  } else t6 = $[21];
  let t7;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Settings",
        fallback: "Esc",
        description: "cancel",
        ...stableEmptyObject(false),
      }),
    });
    $[22] = t7;
  } else t7 = $[22];
  let t8;
  if ($[23] !== grow || $[24] !== t6) {
    t8 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      flexGrow: grow,
      children: [t6, t7],
    });
    $[23] = grow;
    $[24] = t6;
    $[25] = t8;
  } else t8 = $[25];
  return t8;
}
//@ chunk-6p6y0k3t.js:6838-7975 layout
/**
 * /status 页的属性表：会话 id/名字、cwd、账号与机器状态、云会话设置、模型、MCP、主题、IDE、权限模式；远程/云会话下注明哪些行来自远端。
 */
function StatusProperties(props) {
  let $ = w(18);
  let { ideInstallationStatus, accountStatusRead, machineStatusRead, webSetupStatus } = props;
  let accountStatus = accountStatusRead === undefined ? undefined : Qr(accountStatusRead);
  let machineStatus = machineStatusRead === undefined ? undefined : Qr(machineStatusRead);
  let mainLoopModel = useAppState(selectMainLoopModel);
  let mainLoopModel_2 = useMainLoopModelSetting() ?? mainLoopModel;
  let mcp = useAppState(selectMcp);
  let mode = useAppState(selectPermissionMode);
  let remoteSessionName = useAppState(selectRemoteSessionName);
  let [m] = useTheme();
  let id = useSession(selectSessionId);
  let cwd = useCwdDerived(useSession(selectCwd));
  let h;
  if (
    $[0] !== accountStatus ||
    $[1] !== cwd ||
    $[2] !== ideInstallationStatus ||
    $[3] !== machineStatus ||
    $[4] !== mainLoopModel_2 ||
    $[5] !== mcp ||
    $[6] !== mode ||
    $[7] !== remoteSessionName ||
    $[8] !== id ||
    $[9] !== m ||
    $[10] !== webSetupStatus
  ) {
    h = moveAntOnlyToEnd([
      buildPrimarySection({
        sessionId: id,
        remoteSessionName,
        cwd,
        accountStatus,
        machineStatus,
        webSetupStatus,
      }),
      buildSecondarySection({
        mainLoopModel: mainLoopModel_2,
        mcp,
        theme: m,
        ideInstallationStatus,
        permissionMode: mode,
      }),
    ]);
    $[0] = accountStatus;
    $[1] = cwd;
    $[2] = ideInstallationStatus;
    $[3] = machineStatus;
    $[4] = mainLoopModel_2;
    $[5] = mcp;
    $[6] = mode;
    $[7] = remoteSessionName;
    $[8] = id;
    $[9] = m;
    $[10] = webSetupStatus;
    $[11] = h;
  } else h = $[11];
  let O = h;
  let N;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    N =
      isRemoteSessionAvailable() &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Model and cwd are the",
          " ",
          getRemoteCaps()?.sessionId ? "cloud" : "remote",
          " session's; the other rows describe this terminal. /mcp asks the session too.",
        ],
      });
    $[12] = N;
  } else N = $[12];
  let columns;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    columns = [
      {
        bold: true,
      },
      {
        width: "fill",
      },
    ];
    $[13] = columns;
  } else columns = $[13];
  let children;
  if ($[14] !== O) {
    children = O.filter(hasItems).flatMap(renderPropertyRows);
    $[14] = O;
    $[15] = children;
  } else children = $[15];
  let A;
  if ($[16] !== children) {
    A = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        N,
        jsxProd_default(FlexDirectionRow, {
          columns,
          children,
        }),
      ],
    });
    $[16] = children;
    $[17] = A;
  } else A = $[17];
  return A;
}
//@ chunk-6p6y0k3t.js:7975-8307 fingerprint = Diagnostics (0.464)
function Diagnostics(props) {
  let $ = w(5);
  let { promise } = props;
  let diagnostics = Qr(promise);
  if (diagnostics.length === 0) {
    return null;
  }
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      bold: true,
      children: "System diagnostics",
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== diagnostics) {
    t2 = diagnostics.map(renderDiagnosticRow);
    $[1] = diagnostics;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== t2) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingBottom: 1,
      children: [t1, t2],
    });
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
//@ chunk-9h8dr0qb.js:42639-42676 fingerprint = _temp2 (0.693)
function selectMcpCommands(s_0) {
  return s_0.mcp.commands;
}
//@ chunk-ja34p3ys.js:340-785 fingerprint = _temp3 (0.656)
function StatusRow(props) {
  let $ = w(9);
  let { status, children } = props;
  let { color } = STATUS_CONFIG[status];
  let c;
  if ($[0] !== status) {
    c = jsxProd_default(Box, {
      width: 2,
      flexShrink: 0,
      children: jsxProd_default(StatusIcon, {
        status,
      }),
    });
    $[0] = status;
    $[1] = c;
  } else c = $[1];
  const dimColor = !color;
  let a;
  if ($[2] !== children || $[3] !== color || $[4] !== dimColor) {
    a = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      children: jsxProd_default(Text, {
        color,
        dimColor,
        children,
      }),
    });
    $[2] = children;
    $[3] = color;
    $[4] = dimColor;
    $[5] = a;
  } else a = $[5];
  let d;
  if ($[6] !== c || $[7] !== a) {
    d = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [c, a],
    });
    $[6] = c;
    $[7] = a;
    $[8] = d;
  } else d = $[8];
  return d;
}
export {
  buildPrimarySection,
  buildSecondarySection,
  DEBUG_DETAILS_SUFFIX,
  StatusRow,
  selectMcpCommands,
  collectStatusDiagnostics,
  Status,
};
