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
import { j, y } from "../../../../vendor/react/cjs/react.production.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { IO } from "../../dialogs/dialogKinds.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "../../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { requireComputerUseSwift } from "../../../utils/computerUse/swiftLoader.js";
import { execFileNoThrow } from "../../../utils/execFileNoThrow.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Dialog } from "../../design-system/Dialog.js";
import { yce } from "../wrapWidth.js";
import { plural } from "../../../utils/stringUtils.js";
import { DiffFileList } from "../../diff/DiffFileList.js";
import { labelOrEmpty } from "../../../utils/permissions/approvalPayloadSerialization.js";

//@ chunk-18hwfzwa.js:1237471-1237535 placement
function Rxo(h) {
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
  ]),
  hct = new Set(["com.apple.finder"]),
  yct = new Set(["com.apple.systempreferences"]),
  xxo = new Set([
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
  ]),
  Pxo = ["Microsoft.WindowsTerminal_", "Microsoft.WindowsTerminalPreview_", "Microsoft.PowerShell_"],
  Axo = new Set(["explorer.exe"]),
  Mxo = new Set(["systemsettings.exe"]),
  Ixo = ["windows.immersivecontrolpanel_"],
  kJr = new Set([...KNOWN_TERMINAL_BUNDLE_IDS, ...hct, ...yct]);
//@ chunk-18hwfzwa.js:1238502-1238846 placement
function computerUseRiskCategory(h) {
  if (KNOWN_TERMINAL_BUNDLE_IDS.has(h)) return "shell";
  if (hct.has(h)) return "filesystem";
  if (yct.has(h)) return "system_settings";
  if (Pxo.some((D) => h.startsWith(D))) return "shell";
  if (Ixo.some((D) => h.startsWith(D))) return "system_settings";
  let x = Rxo(h);
  if (xxo.has(x)) return "shell";
  if (Axo.has(x)) return "filesystem";
  if (Mxo.has(x)) return "system_settings";
  return null;
}
//@ chunk-18hwfzwa.js:1238846-1238850 placement
j();
//@ chunk-18hwfzwa.js:1238850-1238883 layout
function gPo(ts, Gn) {
  return ts + Gn;
}
//@ chunk-18hwfzwa.js:1238883-1238913 layout
function hPo(Ur, Zr) {
  return Zr;
}
//@ chunk-18hwfzwa.js:1238913-1238995 fingerprint = _temp (1)
function yPo(a) {
  return a.resolved && !a.alreadyGranted ? [a.resolved.bundleId] : [];
}
//@ chunk-18hwfzwa.js:1238995-1239026 layout
function SPo(zr) {
  return [zr, !0];
}
//@ chunk-18hwfzwa.js:1239026-1239099 file-local
function bPo(flag) {
  return r(Text, { dimColor: !0, children: ["  ", "\xB7 ", flag] }, flag);
}
//@ chunk-18hwfzwa.js:1239099-1239149 fingerprint = DENY_ALL_RESPONSE (1)
var E9 = { granted: [], denied: [], flags: IO },
  _9 = 8,
  Sct = 8;
//@ chunk-18hwfzwa.js:1239902-1240190 fingerprint = ComputerUseApproval (0.846)
function ComputerUseApproval(t0) {
  let $ = w(4),
    { request: request, onDone: onDone, wouldTakeAnswer: wouldTakeAnswer } = t0,
    t1;
  if ($[0] !== onDone || $[1] !== request || $[2] !== wouldTakeAnswer)
    ((t1 = request.tccState
      ? e(ComputerUseTccPanel, {
          tccState: request.tccState,
          onDone: () => onDone(E9),
          wouldTakeAnswer: wouldTakeAnswer,
        })
      : e(ComputerUseAppListPanel, { request: request, onDone: onDone, wouldTakeAnswer: wouldTakeAnswer })),
      ($[0] = onDone),
      ($[1] = request),
      ($[2] = wouldTakeAnswer),
      ($[3] = t1));
  else t1 = $[3];
  return t1;
}
//@ chunk-18hwfzwa.js:1240190-1243037 fingerprint = ComputerUseTccPanel (0.79)
function ComputerUseTccPanel(t0) {
  let $ = w(39),
    { tccState: tccState, onDone: onDone, wouldTakeAnswer: wouldTakeAnswer } = t0,
    ee = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    He;
  if ($[0] !== ee || $[1] !== noteRefused || $[2] !== refusedWithin)
    ((He = function We() {
      if (ee() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[0] = ee),
      ($[1] = noteRefused),
      ($[2] = refusedWithin),
      ($[3] = He));
  else He = $[3];
  let We = He,
    ze;
  if ($[4] !== ee || $[5] !== noteRefused || $[6] !== onDone || $[7] !== refusedWithin)
    ((ze = function Xe() {
      if (ee() || refusedWithin()) {
        noteRefused();
        return;
      }
      onDone();
    }),
      ($[4] = ee),
      ($[5] = noteRefused),
      ($[6] = onDone),
      ($[7] = refusedWithin),
      ($[8] = ze));
  else ze = $[8];
  let Xe = ze,
    rt;
  if ($[9] !== tccState.accessibility || $[10] !== tccState.screenRecording) {
    let kt = [];
    if (!tccState.accessibility) {
      let At;
      if ($[12] === MEMO_CACHE_SENTINEL)
        ((At = { label: "Open System Settings \u2192 Accessibility", value: "open_accessibility" }),
          ($[12] = At));
      else At = $[12];
      kt.push(At);
    }
    if (!tccState.screenRecording) {
      let At;
      if ($[13] === MEMO_CACHE_SENTINEL)
        ((At = { label: "Open System Settings \u2192 Screen Recording", value: "open_screen_recording" }),
          ($[13] = At));
      else At = $[13];
      kt.push(At);
    }
    rt = (kt.push({ label: "Try again", value: "retry" }), kt);
    (($[9] = tccState.accessibility), ($[10] = tccState.screenRecording), ($[11] = rt));
  } else rt = $[11];
  let It = rt,
    At;
  if (
    $[14] !== ee ||
    $[15] !== noteRefused ||
    $[16] !== onDone ||
    $[17] !== refusedWithin ||
    $[18] !== wouldTakeAnswer
  )
    ((At = function Dt(value) {
      if (ee() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      let Et = requireComputerUseSwift();
      switch (value) {
        case "open_accessibility": {
          (Et.tcc.requestAccessibility(),
            execFileNoThrow(
              "open",
              ["x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"],
              { useCwd: !1 },
            ));
          return;
        }
        case "open_screen_recording": {
          (Et.tcc.requestScreenRecording(),
            execFileNoThrow(
              "open",
              ["x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"],
              { useCwd: !1 },
            ));
          return;
        }
        case "retry": {
          onDone();
          return;
        }
      }
    }),
      ($[14] = ee),
      ($[15] = noteRefused),
      ($[16] = onDone),
      ($[17] = refusedWithin),
      ($[18] = wouldTakeAnswer),
      ($[19] = At));
  else At = $[19];
  let Dt = At;
  const Lt = tccState.accessibility ? `${re.tick} granted` : `${re.cross} not granted`;
  let oo;
  if ($[20] !== Lt) ((oo = r(Text, { children: ["Accessibility:", " ", Lt] })), ($[20] = Lt), ($[21] = oo));
  else oo = $[21];
  const Xt = tccState.screenRecording ? `${re.tick} granted` : `${re.cross} not granted`;
  let io;
  if ($[22] !== Xt)
    ((io = r(Text, { children: ["Screen Recording:", " ", Xt] })), ($[22] = Xt), ($[23] = io));
  else io = $[23];
  let so;
  if ($[24] !== oo || $[25] !== io)
    ((so = r(Box, { flexDirection: "column", children: [oo, io] })),
      ($[24] = oo),
      ($[25] = io),
      ($[26] = so));
  else so = $[26];
  let po;
  if ($[27] === MEMO_CACHE_SENTINEL)
    ((po = e(Text, {
      dimColor: !0,
      children:
        'Grant the missing permissions in System Settings, then select "Try again". macOS may require you to restart Claude Code after granting Screen Recording.',
    })),
      ($[27] = po));
  else po = $[27];
  let ao;
  if ($[28] !== Xe || $[29] !== Dt || $[30] !== It || $[31] !== We)
    ((ao = e(ModelSelector, {
      hideIndexes: !0,
      refuseInput: We,
      selectedValue: NO_COMMITTED_ROW,
      options: It,
      onChange: Dt,
      onCancel: Xe,
    })),
      ($[28] = Xe),
      ($[29] = Dt),
      ($[30] = It),
      ($[31] = We),
      ($[32] = ao));
  else ao = $[32];
  let co;
  if ($[33] !== ao || $[34] !== so)
    ((co = r(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, gap: 1, children: [so, po, ao] })),
      ($[33] = ao),
      ($[34] = so),
      ($[35] = co));
  else co = $[35];
  let bo;
  if ($[36] !== Xe || $[37] !== co)
    ((bo = e(Dialog, { title: "Computer Use needs macOS permissions", onCancel: Xe, children: co })),
      ($[36] = Xe),
      ($[37] = co),
      ($[38] = bo));
  else bo = $[38];
  return bo;
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
    let ee = L.resolved?.bundleId ?? L.requestedName,
      ke = D.get(ee);
    if (!ke || x(L) > x(ke)) D.set(ee, L);
  }
  return [...D.values()];
}
//@ chunk-18hwfzwa.js:1243429-1243511 layout = _temp (1)
function Pct(a) {
  return a.resolved && !a.alreadyGranted && computerUseRiskCategory(a.resolved.bundleId) ? 2 : 1;
}
//@ chunk-18hwfzwa.js:1243511-1248685 fingerprint = ComputerUseAppListPanel (0.669)
function ComputerUseAppListPanel(t0) {
  let $ = w(79),
    { request: request, onDone: onDone } = t0,
    ee;
  if ($[0] !== request.apps) ((ee = dedupeComputerUseApps(request.apps)), ($[0] = request.apps), ($[1] = ee));
  else ee = $[1];
  let ke = ee,
    Re;
  ze: {
    let Be, He;
    if ($[2] !== ke) ((Be = ke.map(Pct)), (He = Be.reduce(gPo, 0)), ($[2] = ke), ($[3] = Be), ($[4] = He));
    else ((Be = $[3]), (He = $[4]));
    if (He <= yce) {
      let We;
      if ($[5] !== ke) ((We = { visibleApps: ke, hiddenCount: 0 }), ($[5] = ke), ($[6] = We));
      else We = $[6];
      Re = We;
      break ze;
    }
    let Xe;
    if ($[7] !== ke || $[8] !== Be) {
      const mapped = ke.map(hPo);
      let rt;
      if ($[10] !== Be) ((rt = (kt, At) => Be[At] - Be[kt] || kt - At), ($[10] = Be), ($[11] = rt));
      else rt = $[11];
      let sorted = mapped.sort(rt);
      Xe = new Set();
      let Ot = 0;
      for (const Et of sorted) {
        if (Ot + Be[Et] > yce - 1) {
          continue;
        }
        (Xe.add(Et), (Ot = Ot + Be[Et]));
      }
      (($[7] = ke), ($[8] = Be), ($[9] = Xe));
    } else Xe = $[9];
    let We;
    if ($[12] !== ke || $[13] !== Xe) {
      let rt;
      if ($[15] !== Xe) ((rt = (Dt, Lt) => Xe.has(Lt)), ($[15] = Xe), ($[16] = rt));
      else rt = $[16];
      We = ke.filter(rt);
      (($[12] = ke), ($[13] = Xe), ($[14] = We));
    } else We = $[14];
    const rt = ke.length - Xe.size;
    let oo;
    if ($[17] !== We || $[18] !== rt)
      ((oo = { visibleApps: We, hiddenCount: rt }), ($[17] = We), ($[18] = rt), ($[19] = oo));
    else oo = $[19];
    Re = oo;
  }
  let { visibleApps: visibleApps, hiddenCount: hiddenCount } = Re,
    He;
  if ($[20] !== visibleApps)
    ((He = () => new Set(visibleApps.flatMap(yPo))), ($[20] = visibleApps), ($[21] = He));
  else He = $[21];
  let [so] = y(He),
    We;
  if ($[22] === MEMO_CACHE_SENTINEL)
    ((We = ["clipboardRead", "clipboardWrite", "systemKeyCombos"]), ($[22] = We));
  else We = $[22];
  let po = We,
    rt;
  if ($[23] !== request.requestedFlags)
    ((rt = po.filter((ao) => request.requestedFlags[ao])), ($[23] = request.requestedFlags), ($[24] = rt));
  else rt = $[24];
  let co = rt,
    bo = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    oo;
  if ($[25] !== bo || $[26] !== noteRefused || $[27] !== refusedWithin)
    ((oo = function Ho() {
      if (bo() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[25] = bo),
      ($[26] = noteRefused),
      ($[27] = refusedWithin),
      ($[28] = oo));
  else oo = $[28];
  let Ho = oo,
    Io = settleKey(epoch),
    Wo;
  if ($[29] === MEMO_CACHE_SENTINEL)
    ((Wo = {
      label: r(Text, {
        children: ["Deny, and tell Claude what to do differently ", e(Text, { bold: !0, children: "(esc)" })],
      }),
      value: "deny",
    }),
      ($[29] = Wo));
  else Wo = $[29];
  const t4 = so.size;
  let Cn;
  if ($[30] !== so.size) ((Cn = plural(so.size, "app")), ($[30] = so.size), ($[31] = Cn));
  else Cn = $[31];
  const t6 = `Allow for this session (${t4} ${Cn})`;
  let vo;
  if ($[32] !== t6) ((vo = [Wo, { label: t6, value: "allow_all" }]), ($[32] = t6), ($[33] = vo));
  else vo = $[33];
  let Yo = vo,
    kn;
  if (
    $[34] !== ke ||
    $[35] !== so ||
    $[36] !== bo ||
    $[37] !== noteRefused ||
    $[38] !== onDone ||
    $[39] !== refusedWithin ||
    $[40] !== co ||
    $[41] !== visibleApps
  )
    ((kn = function on(allow) {
      if (bo() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!allow) {
        onDone(E9);
        return;
      }
      let now = Date.now();
      let granted = ke.flatMap((a_0) =>
        a_0.resolved && so.has(a_0.resolved.bundleId)
          ? [{ bundleId: a_0.resolved.bundleId, displayName: a_0.resolved.displayName, grantedAt: now }]
          : [],
      );
      let Mn = new Set(visibleApps);
      let flattened = ke.flatMap((a_1) => {
        if (!a_1.resolved) {
          return [{ bundleId: a_1.requestedName, reason: "not_installed" }];
        }
        if (so.has(a_1.resolved.bundleId) || !Mn.has(a_1) || a_1.alreadyGranted) {
          return [];
        }
        return [{ bundleId: a_1.resolved.bundleId, reason: "user_denied" }];
      });
      let flags = { ...IO, ...Object.fromEntries(co.map(SPo)) };
      onDone({ granted: granted, denied: flattened, flags: flags });
    }),
      ($[34] = ke),
      ($[35] = so),
      ($[36] = bo),
      ($[37] = noteRefused),
      ($[38] = onDone),
      ($[39] = refusedWithin),
      ($[40] = co),
      ($[41] = visibleApps),
      ($[42] = kn));
  else kn = $[42];
  let on = kn,
    _o;
  if ($[43] !== on) ((_o = () => on(!1)), ($[43] = on), ($[44] = _o));
  else _o = $[44];
  let cn;
  if ($[45] !== request.reason)
    ((cn = request.reason ? e(DiffFileList, { reason: request.reason }) : null),
      ($[45] = request.reason),
      ($[46] = cn));
  else cn = $[46];
  let Dn;
  if ($[47] !== so || $[48] !== visibleApps) {
    let wn;
    if ($[50] !== so)
      ((wn = (a_3) => {
        let resolved = a_3.resolved;
        if (!resolved) {
          return r(
            Text,
            {
              dimColor: !0,
              children: [
                "  ",
                re.circle,
                " ",
                labelOrEmpty(a_3.requestedName),
                " ",
                e(Text, { dimColor: !0, children: "(not installed)" }),
              ],
            },
            a_3.requestedName,
          );
        }
        if (a_3.alreadyGranted) {
          return r(
            Text,
            {
              dimColor: !0,
              children: [
                "  ",
                re.tick,
                " ",
                labelOrEmpty(resolved.displayName),
                " ",
                e(Text, { dimColor: !0, children: "(already granted)" }),
              ],
            },
            resolved.bundleId,
          );
        }
        let sentinel = computerUseRiskCategory(resolved.bundleId);
        let isChecked = so.has(resolved.bundleId);
        return r(
          Box,
          {
            flexDirection: "column",
            children: [
              r(Text, {
                children: [
                  "  ",
                  isChecked ? re.circleFilled : re.circle,
                  " ",
                  labelOrEmpty(resolved.displayName),
                ],
              }),
              sentinel
                ? r(Text, { bold: !0, children: ["    ", re.warning, " ", SENTINEL_WARNING[sentinel]] })
                : null,
            ],
          },
          resolved.bundleId,
        );
      }),
        ($[50] = so),
        ($[51] = wn));
    else wn = $[51];
    Dn = visibleApps.map(wn);
    (($[47] = so), ($[48] = visibleApps), ($[49] = Dn));
  } else Dn = $[49];
  let wn;
  if ($[52] !== hiddenCount)
    ((wn =
      hiddenCount > 0
        ? r(Text, {
            bold: !0,
            children: [
              "  ",
              "\u2026 +",
              hiddenCount,
              " more ",
              plural(hiddenCount, "app"),
              " not shown, and not included in this grant.",
            ],
          })
        : null),
      ($[52] = hiddenCount),
      ($[53] = wn));
  else wn = $[53];
  let Zn;
  if ($[54] !== Dn || $[55] !== wn)
    ((Zn = r(Box, { flexDirection: "column", children: [Dn, wn] })),
      ($[54] = Dn),
      ($[55] = wn),
      ($[56] = Zn));
  else Zn = $[56];
  let Un;
  if ($[57] !== co)
    ((Un =
      co.length > 0
        ? r(Box, {
            flexDirection: "column",
            children: [e(Text, { dimColor: !0, children: "Also requested:" }), co.map(bPo)],
          })
        : null),
      ($[57] = co),
      ($[58] = Un));
  else Un = $[58];
  let dr;
  if ($[59] !== request.willHide)
    ((dr =
      request.willHide && request.willHide.length > 0
        ? r(Text, {
            dimColor: !0,
            children: [
              request.willHide.length,
              " other",
              " ",
              plural(request.willHide.length, "app"),
              " will be hidden while Claude works.",
            ],
          })
        : null),
      ($[59] = request.willHide),
      ($[60] = dr));
  else dr = $[60];
  let or, pr;
  if ($[61] !== on)
    ((or = (Qn) => on(Qn === "allow_all")), (pr = () => on(!1)), ($[61] = on), ($[62] = or), ($[63] = pr));
  else ((or = $[62]), (pr = $[63]));
  let ur;
  if ($[64] !== Io.remountKey || $[65] !== Yo || $[66] !== Ho || $[67] !== or || $[68] !== pr)
    ((ur = e(
      ModelSelector,
      {
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        selectedValue: NO_COMMITTED_ROW,
        options: Yo,
        refuseInput: Ho,
        defaultFocusValue: "deny",
        onChange: or,
        onCancel: pr,
      },
      Io.remountKey,
    )),
      ($[64] = Io.remountKey),
      ($[65] = Yo),
      ($[66] = Ho),
      ($[67] = or),
      ($[68] = pr),
      ($[69] = ur));
  else ur = $[69];
  let Ir;
  if ($[70] !== cn || $[71] !== Zn || $[72] !== Un || $[73] !== dr || $[74] !== ur)
    ((Ir = r(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      gap: 1,
      children: [cn, Zn, Un, dr, ur],
    })),
      ($[70] = cn),
      ($[71] = Zn),
      ($[72] = Un),
      ($[73] = dr),
      ($[74] = ur),
      ($[75] = Ir));
  else Ir = $[75];
  let Pr;
  if ($[76] !== _o || $[77] !== Ir)
    ((Pr = e(Dialog, { title: "Computer Use wants to control these apps", onCancel: _o, children: Ir })),
      ($[76] = _o),
      ($[77] = Ir),
      ($[78] = Pr));
  else Pr = $[78];
  return Pr;
}

export { Sct, _9, ComputerUseApproval };
