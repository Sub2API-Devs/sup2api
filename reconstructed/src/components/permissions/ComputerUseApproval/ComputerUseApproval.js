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
import { init_react_production, y } from "../../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { EMPTY_SANDBOX_FLAGS } from "../../dialogs/dialogKinds.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:1237471-1237535 placement
function pathBasename(h) {
  return h.toLowerCase().split(/[\\/]/).pop() ?? "";
}
//@ chunk-18hwfzwa.js:1237535-1238502 placement
var KNOWN_TERMINAL_BUNDLE_IDS = new Set([
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
var FINDER_BUNDLE_IDS = new Set(["com.apple.finder"]);
var SYSTEM_SETTINGS_BUNDLE_IDS = new Set(["com.apple.systempreferences"]);
var WINDOWS_SHELL_EXECUTABLES = new Set([
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
var WINDOWS_TERMINAL_PREFIXES = [
  "Microsoft.WindowsTerminal_",
  "Microsoft.WindowsTerminalPreview_",
  "Microsoft.PowerShell_",
];
var SHELL_HOST_EXECUTABLES = new Set(["explorer.exe"]);
var SYSTEM_SETTINGS_EXECUTABLES = new Set(["systemsettings.exe"]);
var WINDOWS_SETTINGS_PREFIXES = ["windows.immersivecontrolpanel_"];
var KNOWN_RISK_BUNDLE_IDS = new Set([
  ...KNOWN_TERMINAL_BUNDLE_IDS,
  ...FINDER_BUNDLE_IDS,
  ...SYSTEM_SETTINGS_BUNDLE_IDS,
]);
//@ chunk-18hwfzwa.js:1238502-1238846 placement
function computerUseRiskCategory(bundleId) {
  if (KNOWN_TERMINAL_BUNDLE_IDS.has(bundleId)) return "shell";
  if (FINDER_BUNDLE_IDS.has(bundleId)) return "filesystem";
  if (SYSTEM_SETTINGS_BUNDLE_IDS.has(bundleId)) return "system_settings";
  if (WINDOWS_TERMINAL_PREFIXES.some((D) => bundleId.startsWith(D))) return "shell";
  if (WINDOWS_SETTINGS_PREFIXES.some((D) => bundleId.startsWith(D))) return "system_settings";
  let x = pathBasename(bundleId);
  if (WINDOWS_SHELL_EXECUTABLES.has(x)) return "shell";
  if (SHELL_HOST_EXECUTABLES.has(x)) return "filesystem";
  if (SYSTEM_SETTINGS_EXECUTABLES.has(x)) return "system_settings";
  return null;
}
//@ chunk-18hwfzwa.js:1238846-1238850 placement
init_react_production();
//@ chunk-18hwfzwa.js:1238850-1238883 layout
function sumValues(ts, Gn) {
  return ts + Gn;
}
//@ chunk-18hwfzwa.js:1238883-1238913 layout
function selectSortValue(Ur, Zr) {
  return Zr;
}
//@ chunk-18hwfzwa.js:1238913-1238995 fingerprint = _temp (1)
function grantBundleIds(a) {
  return a.resolved && !a.alreadyGranted ? [a.resolved.bundleId] : [];
}
//@ chunk-18hwfzwa.js:1238995-1239026 layout
function toFlagPair(zr) {
  return [zr, true];
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
//@ chunk-18hwfzwa.js:1239099-1239149 fingerprint = DENY_ALL_RESPONSE (1)
var DENY_ALL_RESPONSE = {
  granted: [],
  denied: [],
  flags: EMPTY_SANDBOX_FLAGS,
};
var MIN_APP_LIST_ROWS = 8;
var MAX_APP_LIST_ROWS = 8;
//@ chunk-18hwfzwa.js:1239902-1240190 fingerprint = ComputerUseApproval (0.846)
function ComputerUseApproval(props) {
  let $ = w(4);
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
//@ chunk-18hwfzwa.js:1240190-1243037 fingerprint = ComputerUseTccPanel (0.79)
function ComputerUseTccPanel(props) {
  let $ = w(39);
  let { tccState, onDone, wouldTakeAnswer } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let He;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    He = function We() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = He;
  } else He = $[3];
  let refuseInput = He;
  let ze;
  if ($[4] !== inputRefusalWindow || $[5] !== noteRefused || $[6] !== onDone || $[7] !== refusedWithin) {
    ze = function Xe() {
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
    $[8] = ze;
  } else ze = $[8];
  let onCancel = ze;
  let rt;
  if ($[9] !== tccState.accessibility || $[10] !== tccState.screenRecording) {
    let kt = [];
    if (!tccState.accessibility) {
      let t1;
      if ($[12] === MEMO_CACHE_SENTINEL) {
        t1 = {
          label: "Open System Settings \u2192 Accessibility",
          value: "open_accessibility",
        };
        $[12] = t1;
      } else t1 = $[12];
      kt.push(t1);
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
      kt.push(t1);
    }
    rt =
      (kt.push({
        label: "Try again",
        value: "retry",
      }),
      kt);
    $[9] = tccState.accessibility;
    $[10] = tccState.screenRecording;
    $[11] = rt;
  } else rt = $[11];
  let options = rt;
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
      let Et = requireComputerUseSwift();
      switch (value) {
        case "open_accessibility": {
          Et.tcc.requestAccessibility();
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
          Et.tcc.requestScreenRecording();
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
  let so;
  if ($[24] !== t3 || $[25] !== t5) {
    so = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t3, t5],
    });
    $[24] = t3;
    $[25] = t5;
    $[26] = so;
  } else so = $[26];
  let t7;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      dimColor: true,
      children:
        'Grant the missing permissions in System Settings, then select "Try again". macOS may require you to restart Claude Code after granting Screen Recording.',
    });
    $[27] = t7;
  } else t7 = $[27];
  let ao;
  if ($[28] !== onCancel || $[29] !== onChange || $[30] !== options || $[31] !== refuseInput) {
    ao = jsxProd_default(ModelSelector, {
      hideIndexes: true,
      refuseInput,
      selectedValue: NO_COMMITTED_ROW,
      options,
      onChange,
      onCancel,
    });
    $[28] = onCancel;
    $[29] = onChange;
    $[30] = options;
    $[31] = refuseInput;
    $[32] = ao;
  } else ao = $[32];
  let children;
  if ($[33] !== ao || $[34] !== so) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      gap: 1,
      children: [so, t7, ao],
    });
    $[33] = ao;
    $[34] = so;
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
//@ chunk-18hwfzwa.js:1243037-1243164 fingerprint = SENTINEL_WARNING (1)
var SENTINEL_WARNING = {
  shell: "equivalent to shell access",
  filesystem: "can read/write any file",
  system_settings: "can change system settings",
};
//@ chunk-18hwfzwa.js:1243164-1243429 layout = _temp (0.838)
function dedupeComputerUseApps(a) {
  function x(L) {
    if (!L.resolved) return 0;
    let ee = computerUseRiskCategory(L.resolved.bundleId) ? 1 : 0;
    return 4 + (L.alreadyGranted ? 0 : 2) + ee;
  }
  let D = new Map();
  for (let L of a) {
    let ee = L.resolved?.bundleId ?? L.requestedName;
    let ke = D.get(ee);
    if (!ke || x(L) > x(ke)) D.set(ee, L);
  }
  return [...D.values()];
}
//@ chunk-18hwfzwa.js:1243429-1243511 layout = _temp (1)
function riskSortRank(a) {
  return a.resolved && !a.alreadyGranted && computerUseRiskCategory(a.resolved.bundleId) ? 2 : 1;
}
//@ chunk-18hwfzwa.js:1243511-1248685 fingerprint = ComputerUseAppListPanel (0.669)
function ComputerUseAppListPanel(props) {
  let $ = w(79);
  let { request, onDone } = props;
  let ee;
  if ($[0] !== request.apps) {
    ee = dedupeComputerUseApps(request.apps);
    $[0] = request.apps;
    $[1] = ee;
  } else ee = $[1];
  let ke = ee;
  let Re;
  ze: {
    let Be;
    let He;
    if ($[2] !== ke) {
      Be = ke.map(riskSortRank);
      He = Be.reduce(sumValues, 0);
      $[2] = ke;
      $[3] = Be;
      $[4] = He;
    } else {
      Be = $[3];
      He = $[4];
    }
    if (He <= MAX_VISIBLE_ITEMS) {
      let We;
      if ($[5] !== ke) {
        We = {
          visibleApps: ke,
          hiddenCount: 0,
        };
        $[5] = ke;
        $[6] = We;
      } else We = $[6];
      Re = We;
      break ze;
    }
    let Xe;
    if ($[7] !== ke || $[8] !== Be) {
      const mapped = ke.map(selectSortValue);
      let rt;
      if ($[10] !== Be) {
        rt = (kt, At) => Be[At] - Be[kt] || kt - At;
        $[10] = Be;
        $[11] = rt;
      } else rt = $[11];
      let sorted = mapped.sort(rt);
      Xe = new Set();
      let Ot = 0;
      for (const Et of sorted) {
        if (Ot + Be[Et] > MAX_VISIBLE_ITEMS - 1) {
          continue;
        }
        Xe.add(Et);
        Ot = Ot + Be[Et];
      }
      $[7] = ke;
      $[8] = Be;
      $[9] = Xe;
    } else Xe = $[9];
    let visibleApps;
    if ($[12] !== ke || $[13] !== Xe) {
      let rt;
      if ($[15] !== Xe) {
        rt = (Dt, Lt) => Xe.has(Lt);
        $[15] = Xe;
        $[16] = rt;
      } else rt = $[16];
      visibleApps = ke.filter(rt);
      $[12] = ke;
      $[13] = Xe;
      $[14] = visibleApps;
    } else visibleApps = $[14];
    const hiddenCount = ke.length - Xe.size;
    let oo;
    if ($[17] !== visibleApps || $[18] !== hiddenCount) {
      oo = {
        visibleApps,
        hiddenCount,
      };
      $[17] = visibleApps;
      $[18] = hiddenCount;
      $[19] = oo;
    } else oo = $[19];
    Re = oo;
  }
  let { visibleApps, hiddenCount } = Re;
  let He;
  if ($[20] !== visibleApps) {
    He = () => new Set(visibleApps.flatMap(grantBundleIds));
    $[20] = visibleApps;
    $[21] = He;
  } else He = $[21];
  let [checked] = y(He);
  let t2;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    t2 = ["clipboardRead", "clipboardWrite", "systemKeyCombos"];
    $[22] = t2;
  } else t2 = $[22];
  let ALL_FLAG_KEYS = t2;
  let rt;
  if ($[23] !== request.requestedFlags) {
    rt = ALL_FLAG_KEYS.filter((k) => request.requestedFlags[k]);
    $[23] = request.requestedFlags;
    $[24] = rt;
  } else rt = $[24];
  let co = rt;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let oo;
  if ($[25] !== inputRefusalWindow || $[26] !== noteRefused || $[27] !== refusedWithin) {
    oo = function Ho() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[25] = inputRefusalWindow;
    $[26] = noteRefused;
    $[27] = refusedWithin;
    $[28] = oo;
  } else oo = $[28];
  let refuseInput = oo;
  let Io = settleKey(epoch);
  let Wo;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    Wo = {
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
    $[29] = Wo;
  } else Wo = $[29];
  const size = checked.size;
  let t5;
  if ($[30] !== checked.size) {
    t5 = plural(checked.size, "app");
    $[30] = checked.size;
    $[31] = t5;
  } else t5 = $[31];
  const label = `Allow for this session (${size} ${t5})`;
  let vo;
  if ($[32] !== label) {
    vo = [
      Wo,
      {
        label,
        value: "allow_all",
      },
    ];
    $[32] = label;
    $[33] = vo;
  } else vo = $[33];
  let options = vo;
  let kn;
  if (
    $[34] !== ke ||
    $[35] !== checked ||
    $[36] !== inputRefusalWindow ||
    $[37] !== noteRefused ||
    $[38] !== onDone ||
    $[39] !== refusedWithin ||
    $[40] !== co ||
    $[41] !== visibleApps
  ) {
    kn = function respond(allow) {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!allow) {
        onDone(DENY_ALL_RESPONSE);
        return;
      }
      let now = Date.now();
      let granted = ke.flatMap((a_0) =>
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
      let Mn = new Set(visibleApps);
      let denied = ke.flatMap((a_1) => {
        if (!a_1.resolved) {
          return [
            {
              bundleId: a_1.requestedName,
              reason: "not_installed",
            },
          ];
        }
        if (checked.has(a_1.resolved.bundleId) || !Mn.has(a_1) || a_1.alreadyGranted) {
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
        ...Object.fromEntries(co.map(toFlagPair)),
      };
      onDone({
        granted,
        denied,
        flags,
      });
    };
    $[34] = ke;
    $[35] = checked;
    $[36] = inputRefusalWindow;
    $[37] = noteRefused;
    $[38] = onDone;
    $[39] = refusedWithin;
    $[40] = co;
    $[41] = visibleApps;
    $[42] = kn;
  } else kn = $[42];
  let respond = kn;
  let onCancel;
  if ($[43] !== respond) {
    onCancel = () => respond(false);
    $[43] = respond;
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
  let Dn;
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
    Dn = visibleApps.map(t14);
    $[47] = checked;
    $[48] = visibleApps;
    $[49] = Dn;
  } else Dn = $[49];
  let wn;
  if ($[52] !== hiddenCount) {
    wn =
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
    $[53] = wn;
  } else wn = $[53];
  let t14;
  if ($[54] !== Dn || $[55] !== wn) {
    t14 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Dn, wn],
    });
    $[54] = Dn;
    $[55] = wn;
    $[56] = t14;
  } else t14 = $[56];
  let t15;
  if ($[57] !== co) {
    t15 =
      co.length > 0
        ? jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Also requested:",
              }),
              co.map(renderRequestedFlag),
            ],
          })
        : null;
    $[57] = co;
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
  if ($[61] !== respond) {
    onChange = (v) => respond(v === "allow_all");
    onCancel_2 = () => respond(false);
    $[61] = respond;
    $[62] = onChange;
    $[63] = onCancel_2;
  } else {
    onChange = $[62];
    onCancel_2 = $[63];
  }
  let t19;
  if (
    $[64] !== Io.remountKey ||
    $[65] !== options ||
    $[66] !== refuseInput ||
    $[67] !== onChange ||
    $[68] !== onCancel_2
  ) {
    t19 = jsxProd_default(
      ModelSelector,
      {
        hideIndexes: true,
        disablePrintableKeybindings: true,
        selectedValue: NO_COMMITTED_ROW,
        options,
        refuseInput,
        defaultFocusValue: "deny",
        onChange,
        onCancel: onCancel_2,
      },
      Io.remountKey,
    );
    $[64] = Io.remountKey;
    $[65] = options;
    $[66] = refuseInput;
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
