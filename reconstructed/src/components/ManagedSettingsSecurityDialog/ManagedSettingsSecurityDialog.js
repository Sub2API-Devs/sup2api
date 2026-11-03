/**
 * components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx
 *
 * 托管设置（企业策略）含危险设置时的安全确认对话框：列出变化的危险项，要求用户批准或退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx
 * pieces: chunk-7sw8gya5.js (13)
 * attribution: placement 11, layout 1, fingerprint 1
 */
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { countCharInString, plural } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import { count } from "../../utils/collections.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  summarizeManagedSettingsRisk,
  extractDangerousSettings,
  hasDangerousManagedSettings,
  isTelemetryOnlyChange,
  hasDangerousSettings,
} from "./utils.js";
import { shellHelperRows } from "../../utils/settings/otelEndpointValidation.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { AgentNavigationFooter } from "../agents/AgentNavigationFooter.js";
import { Byline } from "../design-system/Byline.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";

//@ chunk-7sw8gya5.js:909-913 placement
init_react_production();
//@ chunk-7sw8gya5.js:913-941 layout
function incrementByOne(Tt) {
  return Tt + 1;
}
//@ chunk-7sw8gya5.js:941-1077 placement = renderToolResultMessage (0.676)
/**
 * 渲染一行 "· 文本"（灰色圆点前缀），供托管设置安全对话框使用。
 */
function renderToolResultMessage(children, Mt) {
  return jsxProd_default_2(
    Box,
    {
      paddingLeft: 2,
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 ",
        }),
        jsxProd_default(Text, {
          children,
        }),
      ],
    },
    Mt,
  );
}
//@ chunk-7sw8gya5.js:1077-1223 placement
function renderTailRow(children, Ot) {
  return jsxProd_default_2(
    Box,
    {
      paddingLeft: 2,
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 ",
        }),
        jsxProd_default(Text, {
          children,
        }),
      ],
    },
    `tail-${Ot}`,
  );
}
//@ chunk-7sw8gya5.js:1223-1254 placement
var DIALOG_MIN_ROWS = 20;
var DIALOG_MAX_ROWS = 40;
var DIALOG_HEADER_ROWS = 14;
var DIALOG_FOOTER_ROWS = 4;
var DIALOG_SIDE_PADDING = 6;
//@ chunk-7sw8gya5.js:1254-1325 placement
function textHeight(t, width) {
  let max = Math.max(1, width - DIALOG_SIDE_PADDING);
  return (
    countCharInString(
      wrapText(t, max, "wrap"),
      `
`,
    ) + 1
  );
}
//@ chunk-7sw8gya5.js:1325-1405 placement
function clampBodyRows(rows, columns, c) {
  let l = DIALOG_HEADER_ROWS + c.reduce((acc, h) => acc + textHeight(h, columns), 0);
  return Math.min(DIALOG_MAX_ROWS, rows - l);
}
//@ chunk-7sw8gya5.js:1405-1876 placement
/**
 * 托管设置确认框中"还有 N 项未显示"的说明行，附带其中执行命令、沙箱、隔离设置的数量，并提醒除非预期全部设置否则选 No。
 */
function hiddenSettingsLine(t, a, c, l, u, h) {
  let m = c ? `(at most ${DIALOG_MIN_ROWS} are listed)` : "(list trimmed to fit the screen)";
  let i =
    (l > 0 ? `, ${l} executing ${plural(l, "a command", "commands")}` : "") +
    (u > 0 ? `, ${u} ${plural(u, "sandbox setting")}` : "") +
    (h > 0 ? `, ${h} ${plural(h, "isolation setting")}` : "");
  return a
    ? `\u22EF and ${t} more not shown ${m}${i} \u2014 choose No unless you expected every one of these settings`
    : `${t} ${plural(t, "setting")} not shown ${m}${i} \u2014 choose No unless you expected every one of these settings`;
}
//@ chunk-7sw8gya5.js:1876-2392 placement
/**
 * 让危险设置列表适应屏幕：最多 z 行，优先保留首行与尾部若干行，按渲染高度在预算内填充，返回 {head, tail, elided}。
 */
function fitSettingsList(rows, width, budget) {
  if (rows.length === 0)
    return {
      head: [],
      tail: [],
      elided: 0,
    };
  let mapped = rows.map((o) => textHeight(o, width));
  let reduced = mapped.reduce((acc, C) => acc + C, 0);
  let max = Math.max(
    textHeight(hiddenSettingsLine(rows.length, true, false, rows.length, rows.length, rows.length), width),
    textHeight(hiddenSettingsLine(rows.length, true, true, rows.length, rows.length, rows.length), width),
  );
  if (rows.length <= DIALOG_MIN_ROWS && reduced <= Math.max(budget, max))
    return {
      head: rows,
      tail: [],
      elided: 0,
    };
  let m = max;
  let i = 0;
  let d = rows.length;
  let p = (o) => m + mapped[o] <= budget;
  if (p(0)) {
    m += mapped[0];
    i = 1;
  }
  while (d - 1 >= Math.max(i, rows.length - DIALOG_FOOTER_ROWS) && d - 1 > 0 && p(d - 1)) {
    d--;
    m += mapped[d];
  }
  while (i < d && i + (rows.length - d) < DIALOG_MIN_ROWS && p(i)) {
    m += mapped[i];
    i++;
  }
  return {
    head: rows.slice(0, i),
    tail: rows.slice(d),
    elided: d - i,
  };
}
//@ chunk-7sw8gya5.js:2392-2892 placement
/**
 * 汇总托管设置各类别数量的文字（命令设置、沙箱、隔离、环境变量、hooks），用逗号连接。
 */
function describeSettingCounts(settings, { commandRows, sandboxRows, isolationRows, envRows, categoryRows }) {
  let hookSlots = count(Object.values(settings.payloadSlots), (p) => p?.shellSettings.hooks !== undefined);
  let commandCount = commandRows.length - hookSlots;
  let parts = [];
  if (commandCount > 0) parts.push(`${plural(commandCount, "command setting")} \xD7${commandCount}`);
  if (sandboxRows.length > 0)
    parts.push(`${plural(sandboxRows.length, "sandbox setting")} \xD7${sandboxRows.length}`);
  if (isolationRows.length > 0)
    parts.push(`${plural(isolationRows.length, "isolation setting")} \xD7${isolationRows.length}`);
  if (envRows.length > 0) parts.push(`${plural(envRows.length, "env var")} \xD7${envRows.length}`);
  if (categoryRows.length > 0 || hookSlots > 0) parts.push("hooks");
  return parts.join(", ");
}
//@ chunk-7sw8gya5.js:2892-3898 placement
/**
 * 托管设置确认对话框三种文案：危险设置（可执行代码/截获流量）、仅遥测目的地、VM 隔离设置。
 */
var RISKY_SETTINGS_COPY = {
  intro:
    "Your organization has configured managed settings that could allow execution of arbitrary code or interception of your prompts and responses.",
  listLabel: "Settings requiring approval:",
  advice:
    "Only accept if you trust your organization's IT administration and expect these settings to be configured.",
  risk: "these can run code or redirect traffic on this machine.",
};
var TELEMETRY_SETTINGS_COPY = {
  intro:
    "Your organization has configured Claude Code to send telemetry to the destination below. Depending on your organization's settings, this can include the content of your prompts and responses.",
  listLabel: "Telemetry destination:",
  advice: "Only accept if you recognize this as your organization's telemetry collector.",
  risk: "this redirects where telemetry from this machine is sent.",
};
var ISOLATION_SETTINGS_COPY = {
  intro:
    "Your organization has configured virtual machine (VM) isolation settings for Claude Code on this machine.",
  listLabel: RISKY_SETTINGS_COPY.listLabel,
  advice: RISKY_SETTINGS_COPY.advice,
  risk: "these can change where Claude Code runs or what it can connect to.",
};
var ACCENT_COLOR = RECENT_INPUT_GUARD_MS;
//@ chunk-7sw8gya5.js:3898-3998 placement
/**
 * 托管设置安全对话框的外壳：以 reveal 作为 key 渲染对话框，使每次重新显示都重置内部状态。
 */
function ManagedSettingsSecurityDialogHost(t) {
  let a = w(2);
  let c;
  if (a[0] !== t) {
    c = jsxProd_default(
      ManagedSettingsSecurityDialog,
      {
        ...t,
      },
      t.reveal,
    );
    a[0] = t;
    a[1] = c;
  } else c = a[1];
  return c;
}
//@ chunk-7sw8gya5.js:3998-9257 fingerprint = ManagedSettingsSecurityDialog (0.312)
/**
 * 托管设置安全对话框：比较危险设置与上次批准时是否变化，列出变化项（hooks、apiKeyHelper、env 等），批准后记录，拒绝则退出。
 */
function ManagedSettingsSecurityDialog(props) {
  let $ = w(98);
  let { settings, baseline, reveal, onAccept, onReject, wouldTakeAnswer } = props;
  let i = reveal !== "default";
  let { columns, rows } = useTerminalSize();
  let C;
  let x;
  let E;
  let ze;
  let I;
  let N;
  let rows_2;
  let Pe;
  let Rn;
  if ($[0] !== baseline || $[1] !== columns || $[2] !== settings || $[3] !== rows) {
    let dangerous = summarizeManagedSettingsRisk(settings);
    let dangerousSettings = extractDangerousSettings(baseline, dangerous);
    let settings_2 = hasDangerousManagedSettings(dangerousSettings.changed)
      ? dangerousSettings.changed
      : dangerous;
    x = isTelemetryOnlyChange(settings_2, settings)
      ? TELEMETRY_SETTINGS_COPY
      : hasDangerousSettings(settings_2, settings)
        ? ISOLATION_SETTINGS_COPY
        : RISKY_SETTINGS_COPY;
    let unchangedCount = settings_2 === dangerousSettings.changed ? dangerousSettings.unchangedCount : 0;
    let removedCount = dangerousSettings.removedCount;
    E =
      unchangedCount > 0
        ? `\uFF0B ${unchangedCount} other active ${plural(unchangedCount, "setting")} unchanged since your last approval`
        : null;
    let G;
    if ($[13] !== removedCount) {
      G =
        removedCount > 0
          ? `\u2212 ${removedCount} previously approved ${plural(removedCount, "setting")} no longer ${removedCount === 1 ? "requires" : "require"} approval`
          : null;
      $[13] = removedCount;
      $[14] = G;
    } else G = $[14];
    I = G;
    let settingsList = shellHelperRows(settings_2);
    N = `Approving applies: ${describeSettingCounts(settings_2, settingsList)} \u2014 ${x.risk}`;
    let budget = clampBodyRows(rows, columns, [x.intro, x.advice, N, ...(E ? [E] : []), ...(I ? [I] : [])]);
    let { commandRows, sandboxRows, isolationRows, envRows, categoryRows } = settingsList;
    C = commandRows;
    Pe = sandboxRows;
    ze = isolationRows;
    rows_2 = [...C, ...Pe, ...ze, ...envRows, ...categoryRows];
    Rn = fitSettingsList(rows_2, columns, budget);
    $[0] = baseline;
    $[1] = columns;
    $[2] = settings;
    $[3] = rows;
    $[4] = C;
    $[5] = x;
    $[6] = E;
    $[7] = ze;
    $[8] = I;
    $[9] = N;
    $[10] = rows_2;
    $[11] = Pe;
    $[12] = Rn;
  } else {
    C = $[4];
    x = $[5];
    E = $[6];
    ze = $[7];
    I = $[8];
    N = $[9];
    rows_2 = $[10];
    Pe = $[11];
    Rn = $[12];
  }
  let J = Rn;
  let qe = J.head.length;
  let Fe = rows_2.length - J.tail.length;
  let elidedCommandCount = Math.max(0, Math.min(C.length, Fe) - qe);
  let Ge = C.length + Pe.length;
  let elidedSandboxCount = Math.max(0, Math.min(Ge, Fe) - Math.max(C.length, qe));
  let xt = Ge + ze.length;
  let elidedIsolationCount = Math.max(0, Math.min(xt, Fe) - Math.max(Ge, qe));
  let G;
  if (
    $[15] !== x ||
    $[16] !== elidedCommandCount ||
    $[17] !== elidedIsolationCount ||
    $[18] !== elidedSandboxCount ||
    $[19] !== E ||
    $[20] !== I ||
    $[21] !== N ||
    $[22] !== J
  ) {
    G = {
      ...J,
      elidedCommandCount,
      elidedSandboxCount,
      elidedIsolationCount,
      copy: x,
      riskLine: N,
      hiddenLine: E,
      removedLine: I,
    };
    $[15] = x;
    $[16] = elidedCommandCount;
    $[17] = elidedIsolationCount;
    $[18] = elidedSandboxCount;
    $[19] = E;
    $[20] = I;
    $[21] = N;
    $[22] = J;
    $[23] = G;
  } else G = $[23];
  let {
    head,
    tail,
    elided,
    elidedCommandCount: elidedCommandCount_2,
    elidedSandboxCount: elidedSandboxCount_2,
    elidedIsolationCount: elidedIsolationCount_2,
    copy,
    riskLine,
    hiddenLine,
    removedLine,
  } = G;
  let ee;
  if ($[24] !== onAccept || $[25] !== onReject) {
    ee = (Lt) => (Lt === "confirm" ? onAccept() : onReject());
    $[24] = onAccept;
    $[25] = onReject;
    $[26] = ee;
  } else ee = $[26];
  let refusableAnswer = useRefusableAnswer(ee);
  let inputRefusalWindow = useInputRefusalWindow(ACCENT_COLOR);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let exitState = useMountTime();
  let [kt, Et] = y(0);
  let ne;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    ne = () => {
      Et(incrementByOne);
    };
    $[27] = ne;
  } else ne = $[27];
  let te;
  if ($[28] !== settings) {
    te = [settings];
    $[28] = settings;
    $[29] = te;
  } else te = $[29];
  P(ne, te);
  let St = settleKey(`${epoch}:${kt}`, ACCENT_COLOR);
  let En;
  if ($[30] !== i || $[31] !== inputRefusalWindow || $[32] !== noteRefused || $[33] !== refusedWithin) {
    En = function k() {
      if (!i) {
        return false;
      }
      if (inputRefusalWindow() || refusedWithin(ACCENT_COLOR)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[30] = i;
    $[31] = inputRefusalWindow;
    $[32] = noteRefused;
    $[33] = refusedWithin;
    $[34] = En;
  } else En = $[34];
  let k = En;
  let Sn;
  if ($[35] !== k || $[36] !== wouldTakeAnswer) {
    Sn = function re() {
      if (k()) {
        return true;
      }
      return wouldTakeAnswer?.() === false;
    };
    $[35] = k;
    $[36] = wouldTakeAnswer;
    $[37] = Sn;
  } else Sn = $[37];
  let refuseInput = Sn;
  let In;
  if ($[38] !== refusableAnswer || $[39] !== k) {
    In = function v(It) {
      if (k()) {
        return;
      }
      refusableAnswer.answer(It);
    };
    $[38] = refusableAnswer;
    $[39] = k;
    $[40] = In;
  } else In = $[40];
  let v = In;
  let Tn;
  if ($[41] !== v) {
    Tn = () => v("cancel");
    $[41] = v;
    $[42] = Tn;
  } else Tn = $[42];
  let An;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    An = {
      context: "Confirmation",
    };
    $[43] = An;
  } else An = $[43];
  useKeybinding("confirm:no", Tn, An);
  let ae;
  if ($[44] !== copy.intro) {
    ae = jsxProd_default(Text, {
      children: copy.intro,
    });
    $[44] = copy.intro;
    $[45] = ae;
  } else ae = $[45];
  let de;
  if ($[46] !== copy.listLabel) {
    de = jsxProd_default(Text, {
      dimColor: true,
      children: copy.listLabel,
    });
    $[46] = copy.listLabel;
    $[47] = de;
  } else de = $[47];
  let ce;
  if ($[48] !== head) {
    ce = head.map(renderToolResultMessage);
    $[48] = head;
    $[49] = ce;
  } else ce = $[49];
  let le;
  if (
    $[50] !== elided ||
    $[51] !== elidedCommandCount_2 ||
    $[52] !== elidedIsolationCount_2 ||
    $[53] !== elidedSandboxCount_2 ||
    $[54] !== head.length ||
    $[55] !== tail.length
  ) {
    le =
      elided > 0 &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          color: "warning",
          children: hiddenSettingsLine(
            elided,
            head.length + tail.length > 0,
            head.length + tail.length === DIALOG_MIN_ROWS,
            elidedCommandCount_2,
            elidedSandboxCount_2,
            elidedIsolationCount_2,
          ),
        }),
      });
    $[50] = elided;
    $[51] = elidedCommandCount_2;
    $[52] = elidedIsolationCount_2;
    $[53] = elidedSandboxCount_2;
    $[54] = head.length;
    $[55] = tail.length;
    $[56] = le;
  } else le = $[56];
  let ue;
  if ($[57] !== tail) {
    ue = tail.map(renderTailRow);
    $[57] = tail;
    $[58] = ue;
  } else ue = $[58];
  let he;
  if ($[59] !== hiddenLine) {
    he =
      hiddenLine &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: hiddenLine,
        }),
      });
    $[59] = hiddenLine;
    $[60] = he;
  } else he = $[60];
  let me;
  if ($[61] !== removedLine) {
    me =
      removedLine &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: removedLine,
        }),
      });
    $[61] = removedLine;
    $[62] = me;
  } else me = $[62];
  let pe;
  if ($[63] !== de || $[64] !== ce || $[65] !== le || $[66] !== ue || $[67] !== he || $[68] !== me) {
    pe = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [de, ce, le, ue, he, me],
    });
    $[63] = de;
    $[64] = ce;
    $[65] = le;
    $[66] = ue;
    $[67] = he;
    $[68] = me;
    $[69] = pe;
  } else pe = $[69];
  let ge;
  if ($[70] !== copy.advice) {
    ge = jsxProd_default(Text, {
      children: copy.advice,
    });
    $[70] = copy.advice;
    $[71] = ge;
  } else ge = $[71];
  let fe;
  if ($[72] !== riskLine) {
    fe = jsxProd_default(Text, {
      color: "warning",
      children: riskLine,
    });
    $[72] = riskLine;
    $[73] = fe;
  } else fe = $[73];
  const nn = i ? `${refusableAnswer.attempts}:${St.remountKey}` : `${refusableAnswer.attempts}`;
  const windowMs = i ? ACCENT_COLOR : undefined;
  const focus = i ? "cancel" : (refusableAnswer.refused ?? "confirm");
  let onConfirm;
  let onCancel;
  if ($[74] !== v) {
    onConfirm = () => v("confirm");
    onCancel = () => v("cancel");
    $[74] = v;
    $[75] = onConfirm;
    $[76] = onCancel;
  } else {
    onConfirm = $[75];
    onCancel = $[76];
  }
  let be;
  if (
    $[77] !== i ||
    $[78] !== refuseInput ||
    $[79] !== exitState ||
    $[80] !== nn ||
    $[81] !== windowMs ||
    $[82] !== focus ||
    $[83] !== onConfirm ||
    $[84] !== onCancel
  ) {
    be = jsxProd_default(
      ConfirmSelect,
      {
        openedAt: exitState,
        windowMs,
        refuseInput,
        confirmLabel: "Yes, I trust these settings",
        cancelLabel: "No, exit Claude Code",
        cancelFirst: i,
        focus,
        hideIndexes: i,
        disablePrintableKeybindings: i,
        onConfirm,
        onCancel,
      },
      nn,
    );
    $[77] = i;
    $[78] = refuseInput;
    $[79] = exitState;
    $[80] = nn;
    $[81] = windowMs;
    $[82] = focus;
    $[83] = onConfirm;
    $[84] = onCancel;
    $[85] = be;
  } else be = $[85];
  const action = i ? "select" : "confirm";
  let ve;
  if ($[86] !== action) {
    ve = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[86] = action;
    $[87] = ve;
  } else ve = $[87];
  let Mn;
  if ($[88] === MEMO_CACHE_SENTINEL) {
    Mn = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "exit",
    });
    $[88] = Mn;
  } else Mn = $[88];
  let Ce;
  if ($[89] !== ve) {
    Ce = jsxProd_default(AgentNavigationFooter, {
      children: jsxProd_default_2(Byline, {
        children: [ve, Mn],
      }),
    });
    $[89] = ve;
    $[90] = Ce;
  } else Ce = $[90];
  let Dn;
  if ($[91] !== ae || $[92] !== pe || $[93] !== ge || $[94] !== fe || $[95] !== be || $[96] !== Ce) {
    Dn = jsxProd_default(PermissionDialog_2, {
      color: "warning",
      titleColor: "warning",
      title: "Managed settings require approval",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingTop: 1,
        children: [ae, pe, ge, fe, be, Ce],
      }),
    });
    $[91] = ae;
    $[92] = pe;
    $[93] = ge;
    $[94] = fe;
    $[95] = be;
    $[96] = Ce;
    $[97] = Dn;
  } else Dn = $[97];
  return Dn;
}
export { ManagedSettingsSecurityDialogHost };
