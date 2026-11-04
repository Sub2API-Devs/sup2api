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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
function isAutoAllowSetting(option) {
  return option.value === "auto-allow";
}
//@ chunk-55w3ydvj.js:25385-28869 fingerprint (2.1.88 match: SandboxSettings, 0.678)
function SandboxSettings(props) {
  let $ = useMemoCache(36);
  let { onComplete, depCheck } = props;
  let sandboxEnabled;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    sandboxEnabled = SandboxManager.isSandboxingEnabled();
    $[0] = sandboxEnabled;
  } else sandboxEnabled = $[0];
  let enabled = sandboxEnabled;
  let autoAllowEnabled;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    autoAllowEnabled = SandboxManager.isAutoAllowBashIfSandboxedEnabled();
    $[1] = autoAllowEnabled;
  } else autoAllowEnabled = $[1];
  let autoAllow = autoAllowEnabled;
  let hasWarnings = depCheck.warnings.length > 0;
  let hasUnixSocketConfig;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    hasUnixSocketConfig = SandboxManager.isAllowAllUnixSocketsConfigured();
    $[2] = hasUnixSocketConfig;
  } else hasUnixSocketConfig = $[2];
  let showSocketWarning = hasWarnings && !hasUnixSocketConfig;
  let computeMode;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    computeMode = () => {
      if (!enabled) {
        return "disabled";
      }
      if (autoAllow) {
        return "auto-allow";
      }
      return "regular";
    };
    $[3] = computeMode;
  } else computeMode = $[3];
  let mode = computeMode;
  let forcedOn;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    forcedOn = shouldForceSandboxOn();
    $[4] = forcedOn;
  } else forcedOn = $[4];
  let isForced = forcedOn;
  let computedMode = mode();
  let currentMode = isForced && computedMode === "disabled" ? "regular" : computedMode;
  let supportsAutoAllow;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    supportsAutoAllow = SandboxManager.isAutoAllowSupported();
    $[5] = supportsAutoAllow;
  } else supportsAutoAllow = $[5];
  let supportsAutoAllow_2 = supportsAutoAllow;
  let autoAllowOptions;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    autoAllowOptions = supportsAutoAllow_2
      ? [
          {
            label: "Sandbox commands, with auto-allow",
            value: "auto-allow",
          },
        ]
      : [];
    $[6] = autoAllowOptions;
  } else autoAllowOptions = $[6];
  let options;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    options = [
      ...autoAllowOptions,
      {
        label: supportsAutoAllow_2 ? "Sandbox commands, with regular permissions" : "Sandbox commands",
        value: "regular",
      },
      ...(isForced
        ? []
        : [
            {
              label: "No Sandbox",
              value: "disabled",
            },
          ]),
    ];
    $[7] = options;
  } else options = $[7];
  let options_2 = options;
  let noSandboxHint;
  let t10;
  if ($[8] !== onComplete) {
    t10 = async function handleSelect(value) {
      let mode = value;
      let result;
      In: switch (mode) {
        case "auto-allow": {
          result = await SandboxManager.setSandboxSettings({
            enabled: true,
            autoAllowBashIfSandboxed: true,
          });
          onComplete(
            sandboxSettingsErrorText(result, "\u2713 Sandbox enabled with auto-allow for bash commands"),
          );
          break In;
        }
        case "regular": {
          result = await SandboxManager.setSandboxSettings({
            enabled: true,
            ...(supportsAutoAllow_2 && {
              autoAllowBashIfSandboxed: false,
            }),
          });
          onComplete(
            sandboxSettingsErrorText(
              result,
              supportsAutoAllow_2
                ? "\u2713 Sandbox enabled with regular bash permissions"
                : "\u2713 Sandbox enabled",
            ),
          );
          break In;
        }
        case "disabled": {
          result = await SandboxManager.setSandboxSettings({
            enabled: false,
            ...(supportsAutoAllow_2 && {
              autoAllowBashIfSandboxed: false,
            }),
          });
          onComplete(sandboxSettingsErrorText(result, "\u25CB Sandbox disabled"));
        }
      }
    };
    $[8] = onComplete;
    $[9] = t10;
  } else t10 = $[9];
  let handleSelect = t10;
  let onEscape;
  if ($[10] !== onComplete) {
    onEscape = () =>
      onComplete(undefined, {
        display: "skip",
      });
    $[10] = onComplete;
    $[11] = onEscape;
  } else onEscape = $[11];
  let onEscape_2 = onEscape;
  let escapeBindings;
  if ($[12] !== onEscape_2) {
    escapeBindings = {
      "confirm:no": onEscape_2,
    };
    $[12] = onEscape_2;
    $[13] = escapeBindings;
  } else escapeBindings = $[13];
  let t12;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t12 = {
      context: "Settings",
    };
    $[14] = t12;
  } else t12 = $[14];
  MessageActionsKeybindings(escapeBindings, t12);
  let globalExitKeybindings = useGlobalExitKeybindings(onEscape_2);
  let modeTab;
  if ($[15] !== handleSelect || $[16] !== onComplete || $[17] !== showSocketWarning) {
    modeTab = jsxProd_default(
      Tab,
      {
        title: "Mode",
        children: jsxProd_default(SandboxModeTab, {
          showSocketWarning,
          options: options_2,
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
    $[18] = modeTab;
  } else modeTab = $[18];
  let modeTab_2 = modeTab;
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
    $[24] !== hasWarnings ||
    $[25] !== modeTab_2 ||
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
          modeTab_2,
          ...(hasWarnings
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
    $[24] = hasWarnings;
    $[25] = modeTab_2;
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
  let tabsElement;
  if ($[29] !== children) {
    tabsElement = jsxProd_default(Tabs, {
      title: "Sandbox",
      color: "permission",
      defaultTab: "Mode",
      navFromContent: true,
      banner,
      children,
    });
    $[29] = children;
    $[30] = tabsElement;
  } else tabsElement = $[30];
  const children_2 = globalExitKeybindings.pending
    ? `Press ${globalExitKeybindings.keyName} again to close`
    : "\u2190/\u2192 to switch \xB7 \u2191/\u2193 to navigate \xB7 Enter to select \xB7 Esc to close";
  let hintBox;
  if ($[31] !== children_2) {
    hintBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: children_2,
      }),
    });
    $[31] = children_2;
    $[32] = hintBox;
  } else hintBox = $[32];
  let pane;
  if ($[33] !== tabsElement || $[34] !== hintBox) {
    pane = jsxProd_default_2(Pane, {
      color: "permission",
      children: [tabsElement, hintBox],
    });
    $[33] = tabsElement;
    $[34] = hintBox;
    $[35] = pane;
  } else pane = $[35];
  return pane;
}
//@ chunk-55w3ydvj.js:28869-30440 fingerprint (2.1.88 match: SandboxModeTab, 0.633)
function SandboxModeTab(props) {
  let $ = useMemoCache(24);
  let { showSocketWarning, options, currentMode, noSandboxHint, onSelect, onComplete } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let warningElement;
  if ($[0] !== showSocketWarning) {
    warningElement =
      showSocketWarning &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(StatusRow, {
          status: "warning",
          children: "Cannot block unix domain sockets (see Dependencies tab)",
        }),
      });
    $[0] = showSocketWarning;
    $[1] = warningElement;
  } else warningElement = $[1];
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
  let modelSelectorElement;
  if (
    $[5] !== currentMode ||
    $[6] !== focusHeader ||
    $[7] !== headerFocused ||
    $[8] !== onSelect ||
    $[9] !== options ||
    $[10] !== onCancel
  ) {
    modelSelectorElement = jsxProd_default(ModelSelector, {
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
    $[11] = modelSelectorElement;
  } else modelSelectorElement = $[11];
  let noSandboxNotice;
  if ($[12] !== noSandboxHint) {
    noSandboxNotice =
      noSandboxHint &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: noSandboxHint,
        }),
      });
    $[12] = noSandboxHint;
    $[13] = noSandboxNotice;
  } else noSandboxNotice = $[13];
  let autoAllowNotice;
  if ($[14] !== options) {
    autoAllowNotice =
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
    $[15] = autoAllowNotice;
  } else autoAllowNotice = $[15];
  let learnMoreLinkElement;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    learnMoreLinkElement = jsxProd_default(LearnMoreLink, {
      url: "https://code.claude.com/docs/en/sandboxing",
    });
    $[16] = learnMoreLinkElement;
  } else learnMoreLinkElement = $[16];
  let boxElement;
  if ($[17] !== autoAllowNotice) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children: [autoAllowNotice, learnMoreLinkElement],
    });
    $[17] = autoAllowNotice;
    $[18] = boxElement;
  } else boxElement = $[18];
  let t7;
  if (
    $[19] !== warningElement ||
    $[20] !== modelSelectorElement ||
    $[21] !== noSandboxNotice ||
    $[22] !== boxElement
  ) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [warningElement, t2, modelSelectorElement, noSandboxNotice, boxElement],
    });
    $[19] = warningElement;
    $[20] = modelSelectorElement;
    $[21] = noSandboxNotice;
    $[22] = boxElement;
    $[23] = t7;
  } else t7 = $[23];
  return t7;
}
export { SandboxSettings };
