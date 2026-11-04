/**
 * components/permissions/ComputerUseApproval/ComputerUseApproval.tsx
 *
 * Computer Use 授权：macOS 辅助功能/屏幕录制权限面板，或应用列表与剪贴板/系统按键等能力授权。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/ComputerUseApproval/ComputerUseApproval.tsx
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 4, layout 5, fingerprint 6, file-local 1
 */
import { init_react_production, useState } from "../../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { EMPTY_SANDBOX_FLAGS } from "../../dialogs/dialogKinds.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "../../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { requireComputerUseSwift } from "../../../utils/computerUse/swiftLoader.js";
import { execFileNoThrow } from "../../../utils/execFileNoThrow.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Dialog } from "../../design-system/Dialog.js";
import { MAX_VISIBLE_ITEMS } from "../wrapWidth.js";
import { plural } from "../../../utils/stringUtils.js";
import { DiffFileList } from "../../diff/DiffFileList.js";
import { labelOrEmpty as labelOrEmpty_2 } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1237471-1237535 placement
function pathBasename(path) {
  return path.toLowerCase().split(/[\\/]/).pop() ?? "";
}
//@ chunk-18hwfzwa.js:1237535-1238502 placement
var KNOWN_TERMINAL_BUNDLE_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FINDER_BUNDLE_IDS;
var SYSTEM_SETTINGS_BUNDLE_IDS;
var WINDOWS_SHELL_EXECUTABLES;
var WINDOWS_TERMINAL_PREFIXES;
var SHELL_HOST_EXECUTABLES;
var SYSTEM_SETTINGS_EXECUTABLES;
var WINDOWS_SETTINGS_PREFIXES;
var KNOWN_RISK_BUNDLE_IDS;
deferInit("chunk-18hwfzwa.js:1237535", () => {
  KNOWN_TERMINAL_BUNDLE_IDS = new Set([
    "com.apple.Terminal",
    "com.googlecode.iterm2",
    "com.microsoft.VSCode",
    "dev.warp.Warp-Stable",
    "com.github.wez.wezterm",
    "org.alacritty",
    "io.alacritty",
    "net.kovidgoyal.kitty",
    "co.zeit.hyper",
    "com.mitchellh.ghostty",
    "com.todesktop.230313mzl4w4u92",
    "com.vscodium",
    "com.exafunction.windsurf",
    "dev.zed.Zed",
    "org.tabby",
    "com.jetbrains.intellij",
    "com.jetbrains.pycharm",
  ]);
  FINDER_BUNDLE_IDS = new Set(["com.apple.finder"]);
  SYSTEM_SETTINGS_BUNDLE_IDS = new Set(["com.apple.systempreferences"]);
  WINDOWS_SHELL_EXECUTABLES = new Set([
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "wt.exe",
    "windowsterminal.exe",
    "code.exe",
    "cursor.exe",
    "vscodium.exe",
    "windsurf.exe",
    "zed.exe",
    "alacritty.exe",
    "wezterm-gui.exe",
    "warp.exe",
    "hyper.exe",
    "tabby.exe",
    "idea64.exe",
    "pycharm64.exe",
    "conemu.exe",
    "conemu64.exe",
  ]);
  WINDOWS_TERMINAL_PREFIXES = [
    "Microsoft.WindowsTerminal_",
    "Microsoft.WindowsTerminalPreview_",
    "Microsoft.PowerShell_",
  ];
  SHELL_HOST_EXECUTABLES = new Set(["explorer.exe"]);
  SYSTEM_SETTINGS_EXECUTABLES = new Set(["systemsettings.exe"]);
  WINDOWS_SETTINGS_PREFIXES = ["windows.immersivecontrolpanel_"];
  KNOWN_RISK_BUNDLE_IDS = new Set([
    ...KNOWN_TERMINAL_BUNDLE_IDS,
    ...FINDER_BUNDLE_IDS,
    ...SYSTEM_SETTINGS_BUNDLE_IDS,
  ]);
});
//@ chunk-18hwfzwa.js:1238502-1238846 placement
function computerUseRiskCategory(bundleId) {
  if (KNOWN_TERMINAL_BUNDLE_IDS.has(bundleId)) return "shell";
  if (FINDER_BUNDLE_IDS.has(bundleId)) return "filesystem";
  if (SYSTEM_SETTINGS_BUNDLE_IDS.has(bundleId)) return "system_settings";
  if (WINDOWS_TERMINAL_PREFIXES.some((prefix) => bundleId.startsWith(prefix))) return "shell";
  if (WINDOWS_SETTINGS_PREFIXES.some((prefix) => bundleId.startsWith(prefix))) return "system_settings";
  let executableName = pathBasename(bundleId);
  if (WINDOWS_SHELL_EXECUTABLES.has(executableName)) return "shell";
  if (SHELL_HOST_EXECUTABLES.has(executableName)) return "filesystem";
  if (SYSTEM_SETTINGS_EXECUTABLES.has(executableName)) return "system_settings";
  return null;
}
//@ chunk-18hwfzwa.js:1238846-1238850 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1238846", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1238850-1238883 layout
function sumValues(a, b) {
  return a + b;
}
//@ chunk-18hwfzwa.js:1238883-1238913 layout
function selectSortValue(accumulator, item) {
  return item;
}
//@ chunk-18hwfzwa.js:1238913-1238995 fingerprint (2.1.88 match: _temp, 1)
function grantBundleIds(a) {
  return a.resolved && !a.alreadyGranted ? [a.resolved.bundleId] : [];
}
//@ chunk-18hwfzwa.js:1238995-1239026 layout
function toFlagPair(bundleId) {
  return [bundleId, true];
}
//@ chunk-18hwfzwa.js:1239026-1239099 file-local
function renderRequestedFlag(flag) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: ["  ", "\xB7 ", flag],
    },
    flag,
  );
}
//@ chunk-18hwfzwa.js:1239099-1239149 fingerprint (2.1.88 match: DENY_ALL_RESPONSE, 1)
var DENY_ALL_RESPONSE = {
  granted: [],
  denied: [],
  flags: EMPTY_SANDBOX_FLAGS,
};
var MIN_APP_LIST_ROWS = 8;
var MAX_APP_LIST_ROWS = 8;
//@ chunk-18hwfzwa.js:1239902-1240190 fingerprint (2.1.88 match: ComputerUseApproval, 0.846)
function ComputerUseApproval(props) {
  let $ = useMemoCache(4);
  let { request, onDone, wouldTakeAnswer } = props;
  let t1;
  if ($[0] !== onDone || $[1] !== request || $[2] !== wouldTakeAnswer) {
    t1 = request.tccState
      ? jsxProd_default(ComputerUseTccPanel, {
          tccState: request.tccState,
          onDone: () => onDone(DENY_ALL_RESPONSE),
          wouldTakeAnswer,
        })
      : jsxProd_default(ComputerUseAppListPanel, {
          request,
          onDone,
          wouldTakeAnswer,
        });
    $[0] = onDone;
    $[1] = request;
    $[2] = wouldTakeAnswer;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
//@ chunk-18hwfzwa.js:1240190-1243037 fingerprint (2.1.88 match: ComputerUseTccPanel, 0.79)
function ComputerUseTccPanel(props) {
  let $ = useMemoCache(39);
  let { tccState, onDone, wouldTakeAnswer } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuseInput;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    refuseInput = function shouldRefuseInput() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = refuseInput;
  } else refuseInput = $[3];
  let refuseInput_2 = refuseInput;
  let handleCancel;
  if ($[4] !== inputRefusalWindow || $[5] !== noteRefused || $[6] !== onDone || $[7] !== refusedWithin) {
    handleCancel = function onCancel() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      onDone();
    };
    $[4] = inputRefusalWindow;
    $[5] = noteRefused;
    $[6] = onDone;
    $[7] = refusedWithin;
    $[8] = handleCancel;
  } else handleCancel = $[8];
  let onCancel = handleCancel;
  let missingPermissionOptions;
  if ($[9] !== tccState.accessibility || $[10] !== tccState.screenRecording) {
    let optionsList = [];
    if (!tccState.accessibility) {
      let t1;
      if ($[12] === MEMO_CACHE_SENTINEL) {
        t1 = {
          label: "Open System Settings \u2192 Accessibility",
          value: "open_accessibility",
        };
        $[12] = t1;
      } else t1 = $[12];
      optionsList.push(t1);
    }
    if (!tccState.screenRecording) {
      let t1;
      if ($[13] === MEMO_CACHE_SENTINEL) {
        t1 = {
          label: "Open System Settings \u2192 Screen Recording",
          value: "open_screen_recording",
        };
        $[13] = t1;
      } else t1 = $[13];
      optionsList.push(t1);
    }
    missingPermissionOptions =
      (optionsList.push({
        label: "Try again",
        value: "retry",
      }),
      optionsList);
    $[9] = tccState.accessibility;
    $[10] = tccState.screenRecording;
    $[11] = missingPermissionOptions;
  } else missingPermissionOptions = $[11];
  let options = missingPermissionOptions;
  let t1;
  if (
    $[14] !== inputRefusalWindow ||
    $[15] !== noteRefused ||
    $[16] !== onDone ||
    $[17] !== refusedWithin ||
    $[18] !== wouldTakeAnswer
  ) {
    t1 = function onChange(value) {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      let computerUseSwift = requireComputerUseSwift();
      switch (value) {
        case "open_accessibility": {
          computerUseSwift.tcc.requestAccessibility();
          execFileNoThrow(
            "open",
            ["x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"],
            {
              useCwd: false,
            },
          );
          return;
        }
        case "open_screen_recording": {
          computerUseSwift.tcc.requestScreenRecording();
          execFileNoThrow(
            "open",
            ["x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"],
            {
              useCwd: false,
            },
          );
          return;
        }
        case "retry": {
          onDone();
          return;
        }
      }
    };
    $[14] = inputRefusalWindow;
    $[15] = noteRefused;
    $[16] = onDone;
    $[17] = refusedWithin;
    $[18] = wouldTakeAnswer;
    $[19] = t1;
  } else t1 = $[19];
  let onChange = t1;
  const t2 = tccState.accessibility
    ? `${figures_default.tick} granted`
    : `${figures_default.cross} not granted`;
  let t3;
  if ($[20] !== t2) {
    t3 = jsxProd_default_2(Text, {
      children: ["Accessibility:", " ", t2],
    });
    $[20] = t2;
    $[21] = t3;
  } else t3 = $[21];
  const t4 = tccState.screenRecording
    ? `${figures_default.tick} granted`
    : `${figures_default.cross} not granted`;
  let t5;
  if ($[22] !== t4) {
    t5 = jsxProd_default_2(Text, {
      children: ["Screen Recording:", " ", t4],
    });
    $[22] = t4;
    $[23] = t5;
  } else t5 = $[23];
  let tccStatusColumn;
  if ($[24] !== t3 || $[25] !== t5) {
    tccStatusColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t3, t5],
    });
    $[24] = t3;
    $[25] = t5;
    $[26] = tccStatusColumn;
  } else tccStatusColumn = $[26];
  let t7;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      dimColor: true,
      children:
        'Grant the missing permissions in System Settings, then select "Try again". macOS may require you to restart Claude Code after granting Screen Recording.',
    });
    $[27] = t7;
  } else t7 = $[27];
  let modelSelector;
  if ($[28] !== onCancel || $[29] !== onChange || $[30] !== options || $[31] !== refuseInput_2) {
    modelSelector = jsxProd_default(ModelSelector, {
      hideIndexes: true,
      refuseInput: refuseInput_2,
      selectedValue: NO_COMMITTED_ROW,
      options,
      onChange,
      onCancel,
    });
    $[28] = onCancel;
    $[29] = onChange;
    $[30] = options;
    $[31] = refuseInput_2;
    $[32] = modelSelector;
  } else modelSelector = $[32];
  let children;
  if ($[33] !== modelSelector || $[34] !== tccStatusColumn) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      gap: 1,
      children: [tccStatusColumn, t7, modelSelector],
    });
    $[33] = modelSelector;
    $[34] = tccStatusColumn;
    $[35] = children;
  } else children = $[35];
  let t10;
  if ($[36] !== onCancel || $[37] !== children) {
    t10 = jsxProd_default(Dialog, {
      title: "Computer Use needs macOS permissions",
      onCancel,
      children,
    });
    $[36] = onCancel;
    $[37] = children;
    $[38] = t10;
  } else t10 = $[38];
  return t10;
}
//@ chunk-18hwfzwa.js:1243037-1243164 fingerprint (2.1.88 match: SENTINEL_WARNING, 1)
var SENTINEL_WARNING = {
  shell: "equivalent to shell access",
  filesystem: "can read/write any file",
  system_settings: "can change system settings",
};
//@ chunk-18hwfzwa.js:1243164-1243429 layout (2.1.88 match: _temp, 0.838)
function dedupeComputerUseApps(a) {
  function score(app) {
    if (!app.resolved) return 0;
    let riskScore = computerUseRiskCategory(app.resolved.bundleId) ? 1 : 0;
    return 4 + (app.alreadyGranted ? 0 : 2) + riskScore;
  }
  let bestByKey = new Map();
  for (let app of a) {
    let dedupeKey = app.resolved?.bundleId ?? app.requestedName;
    let existing = bestByKey.get(dedupeKey);
    if (!existing || score(app) > score(existing)) bestByKey.set(dedupeKey, app);
  }
  return [...bestByKey.values()];
}
//@ chunk-18hwfzwa.js:1243429-1243511 layout (2.1.88 match: _temp, 1)
function riskSortRank(a) {
  return a.resolved && !a.alreadyGranted && computerUseRiskCategory(a.resolved.bundleId) ? 2 : 1;
}
//@ chunk-18hwfzwa.js:1243511-1248685 fingerprint (2.1.88 match: ComputerUseAppListPanel, 0.669)
function ComputerUseAppListPanel(props) {
  let $ = useMemoCache(79);
  let { request, onDone } = props;
  let apps;
  if ($[0] !== request.apps) {
    apps = dedupeComputerUseApps(request.apps);
    $[0] = request.apps;
    $[1] = apps;
  } else apps = $[1];
  let apps_2 = apps;
  let visResult;
  ze: {
    let ranks;
    let rankSum;
    if ($[2] !== apps_2) {
      ranks = apps_2.map(riskSortRank);
      rankSum = ranks.reduce(sumValues, 0);
      $[2] = apps_2;
      $[3] = ranks;
      $[4] = rankSum;
    } else {
      ranks = $[3];
      rankSum = $[4];
    }
    if (rankSum <= MAX_VISIBLE_ITEMS) {
      let allVisible;
      if ($[5] !== apps_2) {
        allVisible = {
          visibleApps: apps_2,
          hiddenCount: 0,
        };
        $[5] = apps_2;
        $[6] = allVisible;
      } else allVisible = $[6];
      visResult = allVisible;
      break ze;
    }
    let visibleIndexes;
    if ($[7] !== apps_2 || $[8] !== ranks) {
      const mapped = apps_2.map(selectSortValue);
      let compareRanks;
      if ($[10] !== ranks) {
        compareRanks = (left, right) => ranks[right] - ranks[left] || left - right;
        $[10] = ranks;
        $[11] = compareRanks;
      } else compareRanks = $[11];
      let sorted = mapped.sort(compareRanks);
      visibleIndexes = new Set();
      let usedUnits = 0;
      for (const index of sorted) {
        if (usedUnits + ranks[index] > MAX_VISIBLE_ITEMS - 1) {
          continue;
        }
        visibleIndexes.add(index);
        usedUnits = usedUnits + ranks[index];
      }
      $[7] = apps_2;
      $[8] = ranks;
      $[9] = visibleIndexes;
    } else visibleIndexes = $[9];
    let visibleApps;
    if ($[12] !== apps_2 || $[13] !== visibleIndexes) {
      let isVisible;
      if ($[15] !== visibleIndexes) {
        isVisible = (app, index) => visibleIndexes.has(index);
        $[15] = visibleIndexes;
        $[16] = isVisible;
      } else isVisible = $[16];
      visibleApps = apps_2.filter(isVisible);
      $[12] = apps_2;
      $[13] = visibleIndexes;
      $[14] = visibleApps;
    } else visibleApps = $[14];
    const hiddenCount = apps_2.length - visibleIndexes.size;
    let visResult_2;
    if ($[17] !== visibleApps || $[18] !== hiddenCount) {
      visResult_2 = {
        visibleApps,
        hiddenCount,
      };
      $[17] = visibleApps;
      $[18] = hiddenCount;
      $[19] = visResult_2;
    } else visResult_2 = $[19];
    visResult = visResult_2;
  }
  let { visibleApps, hiddenCount } = visResult;
  let initialChecked;
  if ($[20] !== visibleApps) {
    initialChecked = () => new Set(visibleApps.flatMap(grantBundleIds));
    $[20] = visibleApps;
    $[21] = initialChecked;
  } else initialChecked = $[21];
  let [checked] = useState(initialChecked);
  let t2;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    t2 = ["clipboardRead", "clipboardWrite", "systemKeyCombos"];
    $[22] = t2;
  } else t2 = $[22];
  let ALL_FLAG_KEYS = t2;
  let requestedFlags;
  if ($[23] !== request.requestedFlags) {
    requestedFlags = ALL_FLAG_KEYS.filter((k) => request.requestedFlags[k]);
    $[23] = request.requestedFlags;
    $[24] = requestedFlags;
  } else requestedFlags = $[24];
  let requestedFlags_2 = requestedFlags;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let refuseInput;
  if ($[25] !== inputRefusalWindow || $[26] !== noteRefused || $[27] !== refusedWithin) {
    refuseInput = function shouldRefuseInput() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[25] = inputRefusalWindow;
    $[26] = noteRefused;
    $[27] = refusedWithin;
    $[28] = refuseInput;
  } else refuseInput = $[28];
  let refuseInput_2 = refuseInput;
  let settle = settleKey(epoch);
  let denyOption;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    denyOption = {
      label: jsxProd_default_2(Text, {
        children: [
          "Deny, and tell Claude what to do differently ",
          jsxProd_default(Text, {
            bold: true,
            children: "(esc)",
          }),
        ],
      }),
      value: "deny",
    };
    $[29] = denyOption;
  } else denyOption = $[29];
  const size = checked.size;
  let t5;
  if ($[30] !== checked.size) {
    t5 = plural(checked.size, "app");
    $[30] = checked.size;
    $[31] = t5;
  } else t5 = $[31];
  const label = `Allow for this session (${size} ${t5})`;
  let options;
  if ($[32] !== label) {
    options = [
      denyOption,
      {
        label,
        value: "allow_all",
      },
    ];
    $[32] = label;
    $[33] = options;
  } else options = $[33];
  let options_2 = options;
  let respond;
  if (
    $[34] !== apps_2 ||
    $[35] !== checked ||
    $[36] !== inputRefusalWindow ||
    $[37] !== noteRefused ||
    $[38] !== onDone ||
    $[39] !== refusedWithin ||
    $[40] !== requestedFlags_2 ||
    $[41] !== visibleApps
  ) {
    respond = function respond(allow) {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!allow) {
        onDone(DENY_ALL_RESPONSE);
        return;
      }
      let now = Date.now();
      let granted = apps_2.flatMap((a_0) =>
        a_0.resolved && checked.has(a_0.resolved.bundleId)
          ? [
              {
                bundleId: a_0.resolved.bundleId,
                displayName: a_0.resolved.displayName,
                grantedAt: now,
              },
            ]
          : [],
      );
      let visibleSet = new Set(visibleApps);
      let denied = apps_2.flatMap((a_1) => {
        if (!a_1.resolved) {
          return [
            {
              bundleId: a_1.requestedName,
              reason: "not_installed",
            },
          ];
        }
        if (checked.has(a_1.resolved.bundleId) || !visibleSet.has(a_1) || a_1.alreadyGranted) {
          return [];
        }
        return [
          {
            bundleId: a_1.resolved.bundleId,
            reason: "user_denied",
          },
        ];
      });
      let flags = {
        ...EMPTY_SANDBOX_FLAGS,
        ...Object.fromEntries(requestedFlags_2.map(toFlagPair)),
      };
      onDone({
        granted,
        denied,
        flags,
      });
    };
    $[34] = apps_2;
    $[35] = checked;
    $[36] = inputRefusalWindow;
    $[37] = noteRefused;
    $[38] = onDone;
    $[39] = refusedWithin;
    $[40] = requestedFlags_2;
    $[41] = visibleApps;
    $[42] = respond;
  } else respond = $[42];
  let respond_2 = respond;
  let onCancel;
  if ($[43] !== respond_2) {
    onCancel = () => respond_2(false);
    $[43] = respond_2;
    $[44] = onCancel;
  } else onCancel = $[44];
  let t12;
  if ($[45] !== request.reason) {
    t12 = request.reason
      ? jsxProd_default(DiffFileList, {
          reason: request.reason,
        })
      : null;
    $[45] = request.reason;
    $[46] = t12;
  } else t12 = $[46];
  let appRows;
  if ($[47] !== checked || $[48] !== visibleApps) {
    let t14;
    if ($[50] !== checked) {
      t14 = (a_3) => {
        let resolved = a_3.resolved;
        if (!resolved) {
          return jsxProd_default_2(
            Text,
            {
              dimColor: true,
              children: [
                "  ",
                figures_default.circle,
                " ",
                labelOrEmpty_2(a_3.requestedName),
                " ",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "(not installed)",
                }),
              ],
            },
            a_3.requestedName,
          );
        }
        if (a_3.alreadyGranted) {
          return jsxProd_default_2(
            Text,
            {
              dimColor: true,
              children: [
                "  ",
                figures_default.tick,
                " ",
                labelOrEmpty_2(resolved.displayName),
                " ",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "(already granted)",
                }),
              ],
            },
            resolved.bundleId,
          );
        }
        let sentinel = computerUseRiskCategory(resolved.bundleId);
        let isChecked = checked.has(resolved.bundleId);
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                children: [
                  "  ",
                  isChecked ? figures_default.circleFilled : figures_default.circle,
                  " ",
                  labelOrEmpty_2(resolved.displayName),
                ],
              }),
              sentinel
                ? jsxProd_default_2(Text, {
                    bold: true,
                    children: ["    ", figures_default.warning, " ", SENTINEL_WARNING[sentinel]],
                  })
                : null,
            ],
          },
          resolved.bundleId,
        );
      };
      $[50] = checked;
      $[51] = t14;
    } else t14 = $[51];
    appRows = visibleApps.map(t14);
    $[47] = checked;
    $[48] = visibleApps;
    $[49] = appRows;
  } else appRows = $[49];
  let hiddenNote;
  if ($[52] !== hiddenCount) {
    hiddenNote =
      hiddenCount > 0
        ? jsxProd_default_2(Text, {
            bold: true,
            children: [
              "  ",
              "\u2026 +",
              hiddenCount,
              " more ",
              plural(hiddenCount, "app"),
              " not shown, and not included in this grant.",
            ],
          })
        : null;
    $[52] = hiddenCount;
    $[53] = hiddenNote;
  } else hiddenNote = $[53];
  let t14;
  if ($[54] !== appRows || $[55] !== hiddenNote) {
    t14 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [appRows, hiddenNote],
    });
    $[54] = appRows;
    $[55] = hiddenNote;
    $[56] = t14;
  } else t14 = $[56];
  let t15;
  if ($[57] !== requestedFlags_2) {
    t15 =
      requestedFlags_2.length > 0
        ? jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Also requested:",
              }),
              requestedFlags_2.map(renderRequestedFlag),
            ],
          })
        : null;
    $[57] = requestedFlags_2;
    $[58] = t15;
  } else t15 = $[58];
  let t16;
  if ($[59] !== request.willHide) {
    t16 =
      request.willHide && request.willHide.length > 0
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              request.willHide.length,
              " other",
              " ",
              plural(request.willHide.length, "app"),
              " will be hidden while Claude works.",
            ],
          })
        : null;
    $[59] = request.willHide;
    $[60] = t16;
  } else t16 = $[60];
  let onChange;
  let onCancel_2;
  if ($[61] !== respond_2) {
    onChange = (v) => respond_2(v === "allow_all");
    onCancel_2 = () => respond_2(false);
    $[61] = respond_2;
    $[62] = onChange;
    $[63] = onCancel_2;
  } else {
    onChange = $[62];
    onCancel_2 = $[63];
  }
  let t19;
  if (
    $[64] !== settle.remountKey ||
    $[65] !== options_2 ||
    $[66] !== refuseInput_2 ||
    $[67] !== onChange ||
    $[68] !== onCancel_2
  ) {
    t19 = jsxProd_default(
      ModelSelector,
      {
        hideIndexes: true,
        disablePrintableKeybindings: true,
        selectedValue: NO_COMMITTED_ROW,
        options: options_2,
        refuseInput: refuseInput_2,
        defaultFocusValue: "deny",
        onChange,
        onCancel: onCancel_2,
      },
      settle.remountKey,
    );
    $[64] = settle.remountKey;
    $[65] = options_2;
    $[66] = refuseInput_2;
    $[67] = onChange;
    $[68] = onCancel_2;
    $[69] = t19;
  } else t19 = $[69];
  let children;
  if ($[70] !== t12 || $[71] !== t14 || $[72] !== t15 || $[73] !== t16 || $[74] !== t19) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      gap: 1,
      children: [t12, t14, t15, t16, t19],
    });
    $[70] = t12;
    $[71] = t14;
    $[72] = t15;
    $[73] = t16;
    $[74] = t19;
    $[75] = children;
  } else children = $[75];
  let t21;
  if ($[76] !== onCancel || $[77] !== children) {
    t21 = jsxProd_default(Dialog, {
      title: "Computer Use wants to control these apps",
      onCancel,
      children,
    });
    $[76] = onCancel;
    $[77] = children;
    $[78] = t21;
  } else t21 = $[78];
  return t21;
}
export { MAX_APP_LIST_ROWS, MIN_APP_LIST_ROWS, ComputerUseApproval };
