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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs, useTabHeaderFocus } from "../design-system/Tabs.js";
import { SandboxOverridesTab } from "./SandboxOverridesTab.js";
import { SandboxConfigTab } from "./SandboxConfigTab.js";
import { SandboxDependenciesTab } from "./SandboxDependenciesTab.js";
import { wt, Jn } from "../../remote/remoteMode.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Pane } from "../design-system/Pane.js";
import { StatusRow } from "../Settings/Status.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { LearnMoreLink } from "../LearnMoreLink.js";

//@ chunk-55w3ydvj.js:25340-25385 affinity
function gt(A) {
  return A.value === "auto-allow";
}
//@ chunk-55w3ydvj.js:25385-28869 fingerprint = SandboxSettings (0.678)
function SandboxSettings(t0) {
  let $ = w(36),
    { onComplete: onComplete, depCheck: depCheck } = t0,
    m;
  if ($[0] === MEMO_CACHE_SENTINEL) ((m = SandboxManager.isSandboxingEnabled()), ($[0] = m));
  else m = $[0];
  let u = m,
    i;
  if ($[1] === MEMO_CACHE_SENTINEL) ((i = SandboxManager.isAutoAllowBashIfSandboxedEnabled()), ($[1] = i));
  else i = $[1];
  let p = i,
    a = depCheck.warnings.length > 0,
    c;
  if ($[2] === MEMO_CACHE_SENTINEL) ((c = SandboxManager.isAllowAllUnixSocketsConfigured()), ($[2] = c));
  else c = $[2];
  let showSocketWarning = a && !c,
    b;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((b = () => {
      if (!u) {
        return "disabled";
      }
      if (p) {
        return "auto-allow";
      }
      return "regular";
    }),
      ($[3] = b));
  else b = $[3];
  let x = b,
    P;
  if ($[4] === MEMO_CACHE_SENTINEL) ((P = shouldForceSandboxOn()), ($[4] = P));
  else P = $[4];
  let W = P,
    v = x(),
    D = W && v === "disabled" ? "regular" : v,
    R;
  if ($[5] === MEMO_CACHE_SENTINEL) ((R = SandboxManager.isAutoAllowSupported()), ($[5] = R));
  else R = $[5];
  let A = R,
    G;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((G = A ? [{ label: "Sandbox commands, with auto-allow", value: "auto-allow" }] : []), ($[6] = G));
  else G = $[6];
  let M;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((M = [
      ...G,
      { label: A ? "Sandbox commands, with regular permissions" : "Sandbox commands", value: "regular" },
      ...(W ? [] : [{ label: "No Sandbox", value: "disabled" }]),
    ]),
      ($[7] = M));
  else M = $[7];
  let q = M,
    ne,
    N;
  if ($[8] !== onComplete)
    ((N = async function se(value) {
      let ht = value;
      let V;
      In: switch (ht) {
        case "auto-allow": {
          ((V = await SandboxManager.setSandboxSettings({ enabled: !0, autoAllowBashIfSandboxed: !0 })),
            onComplete(
              sandboxSettingsErrorText(V, "\u2713 Sandbox enabled with auto-allow for bash commands"),
            ));
          break In;
        }
        case "regular": {
          ((V = await SandboxManager.setSandboxSettings({
            enabled: !0,
            ...(A && { autoAllowBashIfSandboxed: !1 }),
          })),
            onComplete(
              sandboxSettingsErrorText(
                V,
                A ? "\u2713 Sandbox enabled with regular bash permissions" : "\u2713 Sandbox enabled",
              ),
            ));
          break In;
        }
        case "disabled": {
          ((V = await SandboxManager.setSandboxSettings({
            enabled: !1,
            ...(A && { autoAllowBashIfSandboxed: !1 }),
          })),
            onComplete(sandboxSettingsErrorText(V, "\u25CB Sandbox disabled")));
        }
      }
    }),
      ($[8] = onComplete),
      ($[9] = N));
  else N = $[9];
  let se = N,
    Xe;
  if ($[10] !== onComplete)
    ((Xe = () => onComplete(void 0, { display: "skip" })), ($[10] = onComplete), ($[11] = Xe));
  else Xe = $[11];
  let re = Xe,
    eo;
  if ($[12] !== re) ((eo = { "confirm:no": re }), ($[12] = re), ($[13] = eo));
  else eo = $[13];
  let oo;
  if ($[14] === MEMO_CACHE_SENTINEL) ((oo = { context: "Settings" }), ($[14] = oo));
  else oo = $[14];
  MessageActionsKeybindings(eo, oo);
  let to = useGlobalExitKeybindings(re),
    no;
  if ($[15] !== se || $[16] !== onComplete || $[17] !== showSocketWarning)
    ((no = e(
      Tab,
      {
        title: "Mode",
        children: e(SandboxModeTab, {
          showSocketWarning: showSocketWarning,
          options: q,
          currentMode: D,
          noSandboxHint: ne,
          onSelect: se,
          onComplete: onComplete,
        }),
      },
      "mode",
    )),
      ($[15] = se),
      ($[16] = onComplete),
      ($[17] = showSocketWarning),
      ($[18] = no));
  else no = $[18];
  let xe = no,
    so;
  if ($[19] !== onComplete)
    ((so = e(
      Tab,
      { title: "Overrides", children: e(SandboxOverridesTab, { onComplete: onComplete }) },
      "overrides",
    )),
      ($[19] = onComplete),
      ($[20] = so));
  else so = $[20];
  let Se = so,
    ro;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((ro = e(Tab, { title: "Config", children: e(SandboxConfigTab, {}) }, "config")), ($[21] = ro));
  else ro = $[21];
  let Ct = ro,
    ke = depCheck.errors.length > 0,
    io;
  if ($[22] !== depCheck || $[23] !== ke || $[24] !== a || $[25] !== xe || $[26] !== Se)
    ((io = ke
      ? [
          e(
            Tab,
            { title: "Dependencies", children: e(SandboxDependenciesTab, { depCheck: depCheck }) },
            "dependencies",
          ),
        ]
      : [
          xe,
          ...(a
            ? [
                e(
                  Tab,
                  { title: "Dependencies", children: e(SandboxDependenciesTab, { depCheck: depCheck }) },
                  "dependencies",
                ),
              ]
            : []),
          Se,
          Ct,
        ]),
      ($[22] = depCheck),
      ($[23] = ke),
      ($[24] = a),
      ($[25] = xe),
      ($[26] = Se),
      ($[27] = io));
  else io = $[27];
  let ye = io,
    ao;
  if ($[28] === MEMO_CACHE_SENTINEL)
    ((ao = wt()
      ? e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            wrap: "wrap-trim",
            children:
              Jn()?.sessionId !== void 0
                ? "Commands Claude runs on this computer use this sandbox; the cloud session's own sandbox, in its container, isn't shown or changed here."
                : "Commands Claude runs on this computer use this sandbox; the remote session's own sandbox isn't shown or changed here.",
          }),
        })
      : void 0),
      ($[28] = ao));
  else ao = $[28];
  let ie;
  if ($[29] !== ye)
    ((ie = e(Tabs, {
      title: "Sandbox",
      color: "permission",
      defaultTab: "Mode",
      navFromContent: !0,
      banner: ao,
      children: ye,
    })),
      ($[29] = ye),
      ($[30] = ie));
  else ie = $[30];
  const Pe = to.pending
    ? `Press ${to.keyName} again to close`
    : "\u2190/\u2192 to switch \xB7 \u2191/\u2193 to navigate \xB7 Enter to select \xB7 Esc to close";
  let ae;
  if ($[31] !== Pe)
    ((ae = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: Pe }) })),
      ($[31] = Pe),
      ($[32] = ae));
  else ae = $[32];
  let lo;
  if ($[33] !== ie || $[34] !== ae)
    ((lo = r(Pane, { color: "permission", children: [ie, ae] })), ($[33] = ie), ($[34] = ae), ($[35] = lo));
  else lo = $[35];
  return lo;
}
//@ chunk-55w3ydvj.js:28869-30440 fingerprint = SandboxModeTab (0.633)
function SandboxModeTab(t0) {
  let $ = w(24),
    {
      showSocketWarning: showSocketWarning,
      options: options,
      currentMode: currentMode,
      noSandboxHint: noSandboxHint,
      onSelect: onSelect,
      onComplete: onComplete,
    } = t0,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    C;
  if ($[0] !== showSocketWarning)
    ((C =
      showSocketWarning &&
      e(Box, {
        marginBottom: 1,
        children: e(StatusRow, {
          status: "warning",
          children: "Cannot block unix domain sockets (see Dependencies tab)",
        }),
      })),
      ($[0] = showSocketWarning),
      ($[1] = C));
  else C = $[1];
  let g;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((g = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Configure mode" }) })),
      ($[2] = g));
  else g = $[2];
  let b;
  if ($[3] !== onComplete)
    ((b = () => onComplete(void 0, { display: "skip" })), ($[3] = onComplete), ($[4] = b));
  else b = $[4];
  let x;
  if (
    $[5] !== currentMode ||
    $[6] !== focusHeader ||
    $[7] !== headerFocused ||
    $[8] !== onSelect ||
    $[9] !== options ||
    $[10] !== b
  )
    ((x = e(ModelSelector, {
      options: options,
      defaultValue: currentMode,
      defaultFocusValue: currentMode,
      onChange: onSelect,
      onCancel: b,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
    })),
      ($[5] = currentMode),
      ($[6] = focusHeader),
      ($[7] = headerFocused),
      ($[8] = onSelect),
      ($[9] = options),
      ($[10] = b),
      ($[11] = x));
  else x = $[11];
  let P;
  if ($[12] !== noSandboxHint)
    ((P =
      noSandboxHint &&
      e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: noSandboxHint }) })),
      ($[12] = noSandboxHint),
      ($[13] = P));
  else P = $[13];
  let W;
  if ($[14] !== options)
    ((W =
      options.some(gt) &&
      r(Text, {
        dimColor: !0,
        children: [
          e(Text, { bold: !0, dimColor: !0, children: "Auto-allow mode:" }),
          " ",
          "Commands will try to run in the sandbox automatically, and attempts to run outside of the sandbox fallback to regular permissions. Explicit ask/deny rules are always respected.",
        ],
      })),
      ($[14] = options),
      ($[15] = W));
  else W = $[15];
  let v;
  if ($[16] === MEMO_CACHE_SENTINEL)
    ((v = e(LearnMoreLink, { url: "https://code.claude.com/docs/en/sandboxing" })), ($[16] = v));
  else v = $[16];
  let D;
  if ($[17] !== W)
    ((D = r(Box, { flexDirection: "column", marginTop: 1, gap: 1, children: [W, v] })),
      ($[17] = W),
      ($[18] = D));
  else D = $[18];
  let R;
  if ($[19] !== C || $[20] !== x || $[21] !== P || $[22] !== D)
    ((R = r(Box, { flexDirection: "column", children: [C, g, x, P, D] })),
      ($[19] = C),
      ($[20] = x),
      ($[21] = P),
      ($[22] = D),
      ($[23] = R));
  else R = $[23];
  return R;
}

export { SandboxSettings };
