/**
 * components/sandbox/SandboxSettings.tsx
 *
 * /sandbox 设置对话框：模式（auto-allow/regular/disabled）、配置、依赖、覆盖标签页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxSettings.tsx
 * pieces: chunk-55w3ydvj.js (3)
 * attribution: affinity 1, fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { SandboxManager, shouldForceSandboxOn } from "../../utils/sandbox/sandbox-adapter.js";
import { sandboxSettingsErrorText } from "./WindowsSandboxStatus.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs, useTabHeaderFocus } from "../design-system/Tabs.js";
import { SandboxOverridesTab } from "./SandboxOverridesTab.js";
import { SandboxConfigTab } from "./SandboxConfigTab.js";
import { SandboxDependenciesTab } from "./SandboxDependenciesTab.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Pane } from "../design-system/Pane.js";
import { StatusRow } from "../Settings/Status.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { LearnMoreLink } from "../LearnMoreLink.js";

//@ chunk-55w3ydvj.js:25340-25385 affinity
function isAutoAllowSetting(A) {
  return A.value === "auto-allow";
}
//@ chunk-55w3ydvj.js:25385-28869 fingerprint = SandboxSettings (0.678)
function SandboxSettings(props) {
  let $ = w(36);
  let { onComplete, depCheck } = props;
  let m;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    m = SandboxManager.isSandboxingEnabled();
    $[0] = m;
  } else m = $[0];
  let u = m;
  let i;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    i = SandboxManager.isAutoAllowBashIfSandboxedEnabled();
    $[1] = i;
  } else i = $[1];
  let p = i;
  let a = depCheck.warnings.length > 0;
  let c;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    c = SandboxManager.isAllowAllUnixSocketsConfigured();
    $[2] = c;
  } else c = $[2];
  let showSocketWarning = a && !c;
  let b;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    b = () => {
      if (!u) {
        return "disabled";
      }
      if (p) {
        return "auto-allow";
      }
      return "regular";
    };
    $[3] = b;
  } else b = $[3];
  let x = b;
  let P;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    P = shouldForceSandboxOn();
    $[4] = P;
  } else P = $[4];
  let W = P;
  let v = x();
  let currentMode = W && v === "disabled" ? "regular" : v;
  let R;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    R = SandboxManager.isAutoAllowSupported();
    $[5] = R;
  } else R = $[5];
  let A = R;
  let G;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    G = A
      ? [
          {
            label: "Sandbox commands, with auto-allow",
            value: "auto-allow",
          },
        ]
      : [];
    $[6] = G;
  } else G = $[6];
  let M;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    M = [
      ...G,
      {
        label: A ? "Sandbox commands, with regular permissions" : "Sandbox commands",
        value: "regular",
      },
      ...(W
        ? []
        : [
            {
              label: "No Sandbox",
              value: "disabled",
            },
          ]),
    ];
    $[7] = M;
  } else M = $[7];
  let options = M;
  let noSandboxHint;
  let t10;
  if ($[8] !== onComplete) {
    t10 = async function handleSelect(value) {
      let mode = value;
      let V;
      In: switch (mode) {
        case "auto-allow": {
          V = await SandboxManager.setSandboxSettings({
            enabled: true,
            autoAllowBashIfSandboxed: true,
          });
          onComplete(sandboxSettingsErrorText(V, "\u2713 Sandbox enabled with auto-allow for bash commands"));
          break In;
        }
        case "regular": {
          V = await SandboxManager.setSandboxSettings({
            enabled: true,
            ...(A && {
              autoAllowBashIfSandboxed: false,
            }),
          });
          onComplete(
            sandboxSettingsErrorText(
              V,
              A ? "\u2713 Sandbox enabled with regular bash permissions" : "\u2713 Sandbox enabled",
            ),
          );
          break In;
        }
        case "disabled": {
          V = await SandboxManager.setSandboxSettings({
            enabled: false,
            ...(A && {
              autoAllowBashIfSandboxed: false,
            }),
          });
          onComplete(sandboxSettingsErrorText(V, "\u25CB Sandbox disabled"));
        }
      }
    };
    $[8] = onComplete;
    $[9] = t10;
  } else t10 = $[9];
  let handleSelect = t10;
  let Xe;
  if ($[10] !== onComplete) {
    Xe = () =>
      onComplete(undefined, {
        display: "skip",
      });
    $[10] = onComplete;
    $[11] = Xe;
  } else Xe = $[11];
  let re = Xe;
  let eo;
  if ($[12] !== re) {
    eo = {
      "confirm:no": re,
    };
    $[12] = re;
    $[13] = eo;
  } else eo = $[13];
  let t12;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t12 = {
      context: "Settings",
    };
    $[14] = t12;
  } else t12 = $[14];
  MessageActionsKeybindings(eo, t12);
  let globalExitKeybindings = useGlobalExitKeybindings(re);
  let no;
  if ($[15] !== handleSelect || $[16] !== onComplete || $[17] !== showSocketWarning) {
    no = jsxProd_default(
      Tab,
      {
        title: "Mode",
        children: jsxProd_default(SandboxModeTab, {
          showSocketWarning,
          options,
          currentMode,
          noSandboxHint,
          onSelect: handleSelect,
          onComplete,
        }),
      },
      "mode",
    );
    $[15] = handleSelect;
    $[16] = onComplete;
    $[17] = showSocketWarning;
    $[18] = no;
  } else no = $[18];
  let modeTab = no;
  let t14;
  if ($[19] !== onComplete) {
    t14 = jsxProd_default(
      Tab,
      {
        title: "Overrides",
        children: jsxProd_default(SandboxOverridesTab, {
          onComplete,
        }),
      },
      "overrides",
    );
    $[19] = onComplete;
    $[20] = t14;
  } else t14 = $[20];
  let overridesTab = t14;
  let t15;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    t15 = jsxProd_default(
      Tab,
      {
        title: "Config",
        children: jsxProd_default(SandboxConfigTab, {}),
      },
      "config",
    );
    $[21] = t15;
  } else t15 = $[21];
  let configTab = t15;
  let hasErrors = depCheck.errors.length > 0;
  let t16;
  if (
    $[22] !== depCheck ||
    $[23] !== hasErrors ||
    $[24] !== a ||
    $[25] !== modeTab ||
    $[26] !== overridesTab
  ) {
    t16 = hasErrors
      ? [
          jsxProd_default(
            Tab,
            {
              title: "Dependencies",
              children: jsxProd_default(SandboxDependenciesTab, {
                depCheck,
              }),
            },
            "dependencies",
          ),
        ]
      : [
          modeTab,
          ...(a
            ? [
                jsxProd_default(
                  Tab,
                  {
                    title: "Dependencies",
                    children: jsxProd_default(SandboxDependenciesTab, {
                      depCheck,
                    }),
                  },
                  "dependencies",
                ),
              ]
            : []),
          overridesTab,
          configTab,
        ];
    $[22] = depCheck;
    $[23] = hasErrors;
    $[24] = a;
    $[25] = modeTab;
    $[26] = overridesTab;
    $[27] = t16;
  } else t16 = $[27];
  let children = t16;
  let banner;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    banner = isRemoteSessionAvailable()
      ? jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: "wrap-trim",
            children:
              getRemoteCaps()?.sessionId !== undefined
                ? "Commands Claude runs on this computer use this sandbox; the cloud session's own sandbox, in its container, isn't shown or changed here."
                : "Commands Claude runs on this computer use this sandbox; the remote session's own sandbox isn't shown or changed here.",
          }),
        })
      : undefined;
    $[28] = banner;
  } else banner = $[28];
  let ie;
  if ($[29] !== children) {
    ie = jsxProd_default(Tabs, {
      title: "Sandbox",
      color: "permission",
      defaultTab: "Mode",
      navFromContent: true,
      banner,
      children,
    });
    $[29] = children;
    $[30] = ie;
  } else ie = $[30];
  const children_2 = globalExitKeybindings.pending
    ? `Press ${globalExitKeybindings.keyName} again to close`
    : "\u2190/\u2192 to switch \xB7 \u2191/\u2193 to navigate \xB7 Enter to select \xB7 Esc to close";
  let ae;
  if ($[31] !== children_2) {
    ae = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: children_2,
      }),
    });
    $[31] = children_2;
    $[32] = ae;
  } else ae = $[32];
  let lo;
  if ($[33] !== ie || $[34] !== ae) {
    lo = jsxProd_default_2(Pane, {
      color: "permission",
      children: [ie, ae],
    });
    $[33] = ie;
    $[34] = ae;
    $[35] = lo;
  } else lo = $[35];
  return lo;
}
//@ chunk-55w3ydvj.js:28869-30440 fingerprint = SandboxModeTab (0.633)
function SandboxModeTab(props) {
  let $ = w(24);
  let { showSocketWarning, options, currentMode, noSandboxHint, onSelect, onComplete } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let C;
  if ($[0] !== showSocketWarning) {
    C =
      showSocketWarning &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(StatusRow, {
          status: "warning",
          children: "Cannot block unix domain sockets (see Dependencies tab)",
        }),
      });
    $[0] = showSocketWarning;
    $[1] = C;
  } else C = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Configure mode",
      }),
    });
    $[2] = t2;
  } else t2 = $[2];
  let onCancel;
  if ($[3] !== onComplete) {
    onCancel = () =>
      onComplete(undefined, {
        display: "skip",
      });
    $[3] = onComplete;
    $[4] = onCancel;
  } else onCancel = $[4];
  let x;
  if (
    $[5] !== currentMode ||
    $[6] !== focusHeader ||
    $[7] !== headerFocused ||
    $[8] !== onSelect ||
    $[9] !== options ||
    $[10] !== onCancel
  ) {
    x = jsxProd_default(ModelSelector, {
      options,
      defaultValue: currentMode,
      defaultFocusValue: currentMode,
      onChange: onSelect,
      onCancel,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
    });
    $[5] = currentMode;
    $[6] = focusHeader;
    $[7] = headerFocused;
    $[8] = onSelect;
    $[9] = options;
    $[10] = onCancel;
    $[11] = x;
  } else x = $[11];
  let P;
  if ($[12] !== noSandboxHint) {
    P =
      noSandboxHint &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: noSandboxHint,
        }),
      });
    $[12] = noSandboxHint;
    $[13] = P;
  } else P = $[13];
  let W;
  if ($[14] !== options) {
    W =
      options.some(isAutoAllowSetting) &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: "Auto-allow mode:",
          }),
          " ",
          "Commands will try to run in the sandbox automatically, and attempts to run outside of the sandbox fallback to regular permissions. Explicit ask/deny rules are always respected.",
        ],
      });
    $[14] = options;
    $[15] = W;
  } else W = $[15];
  let v;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default(LearnMoreLink, {
      url: "https://code.claude.com/docs/en/sandboxing",
    });
    $[16] = v;
  } else v = $[16];
  let D;
  if ($[17] !== W) {
    D = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children: [W, v],
    });
    $[17] = W;
    $[18] = D;
  } else D = $[18];
  let t7;
  if ($[19] !== C || $[20] !== x || $[21] !== P || $[22] !== D) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [C, t2, x, P, D],
    });
    $[19] = C;
    $[20] = x;
    $[21] = P;
    $[22] = D;
    $[23] = t7;
  } else t7 = $[23];
  return t7;
}
export { SandboxSettings };
