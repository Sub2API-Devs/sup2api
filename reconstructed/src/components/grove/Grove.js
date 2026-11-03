/**
 * components/grove/Grove.tsx
 *
 * Grove（消费者条款/隐私政策更新）对话框：接受并选择是否允许用于模型训练，以及隐私设置对话框；混入 auto 模式推荐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/grove/Grove.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-fggt3ccb.js (7)
 * attribution: affinity 1, callgraph-witnessed 1, placement 1, fingerprint 4, facade-exports 2
 */
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { Me } from "../design-system/ThemeProvider.js";
import {
  updateGroveSettings_2,
  getGroveNoticeConfig,
  recordGroveChoiceSeen,
  calculateShouldShowGrove,
  markGroveNoticeViewed,
  updateGroveSettings,
} from "../../services/api/grove.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Dialog } from "../design-system/Dialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { useOnFirstReveal } from "../permissions/PermissionRequestTitle.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { permissionModeIndicator } from "../../utils/permissions/PermissionMode.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";

//@ chunk-fggt3ccb.js:722-726 placement
j();
//@ chunk-fggt3ccb.js:726-784 fingerprint = _temp2 (1)
function He() {
  logEvent("tengu_grove_privacy_settings_viewed", {});
}
//@ chunk-fggt3ccb.js:784-1076 fingerprint = NEW_TERMS_ASCII (0.508)
var NEW_TERMS_ASCII_ART = ` _____________
 |          \\  \\
 | NEW TERMS \\__\\
 |              |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |              |
 |______________|`,
  ACCEPT_OPT_OUT_OPTION = {
    label: "Accept terms \xB7 Help improve our AI models: OFF",
    value: "accept_opt_out",
  };
//@ chunk-fggt3ccb.js:1076-2606 fingerprint = GracePeriodContentBody (0.417)
function GracePeriodContentBody() {
  let $ = w(9),
    m;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((m = r(Text, {
      children: [
        "An update to our Consumer Terms and Privacy Policy will take effect on",
        " ",
        e(Text, { bold: !0, children: "October 8, 2025" }),
        ". You can accept the updated terms today.",
      ],
    })),
      ($[0] = m));
  else m = $[0];
  let f;
  if ($[1] === MEMO_CACHE_SENTINEL) ((f = e(Text, { children: "What's changing?" })), ($[1] = f));
  else f = $[1];
  let i, _;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((i = e(Text, { children: "\xB7 " })),
      (_ = e(Text, { bold: !0, children: "Help improve our AI models " })),
      ($[2] = i),
      ($[3] = _));
  else ((i = $[2]), (_ = $[3]));
  let v;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((v = e(Box, {
      paddingLeft: 1,
      children: r(Text, {
        children: [
          i,
          _,
          r(Text, {
            children: [
              "\u2014 Allow the use of your chats and coding sessions to train and improve Anthropic AI models. Change anytime in your Privacy Settings (",
              e(Link, { url: "https://claude.ai/settings/data-privacy-controls" }),
              ").",
            ],
          }),
        ],
      }),
    })),
      ($[4] = v));
  else v = $[4];
  let t;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((t = r(Box, {
      flexDirection: "column",
      children: [
        f,
        v,
        e(Box, {
          paddingLeft: 1,
          children: r(Text, {
            children: [
              e(Text, { children: "\xB7 " }),
              e(Text, { bold: !0, children: "Updates to data retention " }),
              e(Text, {
                children:
                  "\u2014 To help us improve our AI models and safety protections, we're extending data retention to 5 years.",
              }),
            ],
          }),
        }),
      ],
    })),
      ($[5] = t));
  else t = $[5];
  let k;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((k = e(Link, { url: "https://www.anthropic.com/news/updates-to-our-consumer-terms" })), ($[6] = k));
  else k = $[6];
  let h;
  if ($[7] === MEMO_CACHE_SENTINEL) ((h = e(Link, { url: "https://anthropic.com/legal/terms" })), ($[7] = h));
  else h = $[7];
  let d;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((d = r(Fragment, {
      children: [
        m,
        t,
        r(Text, {
          children: [
            "Learn more (",
            k,
            ") or read the updated Consumer Terms (",
            h,
            ") and Privacy Policy (",
            e(Link, { url: "https://anthropic.com/legal/privacy" }),
            ")",
          ],
        }),
      ],
    })),
      ($[8] = d));
  else d = $[8];
  return d;
}
//@ chunk-fggt3ccb.js:2606-3961 fingerprint = PostGracePeriodContentBody (0.462)
function PostGracePeriodContentBody() {
  let $ = w(7),
    m;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((m = e(Text, { children: "We've updated our Consumer Terms and Privacy Policy." })), ($[0] = m));
  else m = $[0];
  let f;
  if ($[1] === MEMO_CACHE_SENTINEL) ((f = e(Text, { children: "What's changing?" })), ($[1] = f));
  else f = $[1];
  let i;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((i = r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { bold: !0, children: "Help improve our AI models" }),
        e(Text, {
          children:
            "Allow the use of your chats and coding sessions to train and improve Anthropic AI models. You can change this anytime in Privacy Settings",
        }),
        e(Link, { url: "https://claude.ai/settings/data-privacy-controls" }),
      ],
    })),
      ($[2] = i));
  else i = $[2];
  let _;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((_ = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        f,
        i,
        r(Box, {
          flexDirection: "column",
          children: [
            e(Text, { bold: !0, children: "How this affects data retention" }),
            e(Text, {
              children:
                "Turning ON the improve Claude setting extends data retention from 30 days to 5 years. Turning it OFF keeps the default 30-day data retention. Delete data anytime.",
            }),
          ],
        }),
      ],
    })),
      ($[3] = _));
  else _ = $[3];
  let v;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((v = e(Link, { url: "https://www.anthropic.com/news/updates-to-our-consumer-terms" })), ($[4] = v));
  else v = $[4];
  let t;
  if ($[5] === MEMO_CACHE_SENTINEL) ((t = e(Link, { url: "https://anthropic.com/legal/terms" })), ($[5] = t));
  else t = $[5];
  let k;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((k = r(Fragment, {
      children: [
        m,
        _,
        r(Text, {
          children: [
            "Learn more (",
            v,
            ") or read the updated Consumer Terms (",
            t,
            ") and Privacy Policy (",
            e(Link, { url: "https://anthropic.com/legal/privacy" }),
            ")",
          ],
        }),
      ],
    })),
      ($[6] = k));
  else k = $[6];
  return k;
}
/**
 * 条款更新对话框：宽限期内可接受新条款、选择是否允许用于训练（accept_opt_in/opt_out），宽限期后必须选择；记录 tengu_grove_policy_*。
 */
//@ chunk-fggt3ccb.js:3961-8183 facade-exports = GroveDialog (0.687)
function GroveDialog(t0) {
  let $ = w(52),
    { showIfAlreadyViewed: showIfAlreadyViewed, location: location, onDone: onDone } = t0,
    [_, v] = y(null),
    [t, k] = y(null),
    [h, d] = y(!1),
    { credentials: credentials, storageV5: storageV5 } = Me(),
    J,
    T;
  if (
    $[0] !== credentials ||
    $[1] !== location ||
    $[2] !== onDone ||
    $[3] !== showIfAlreadyViewed ||
    $[4] !== storageV5
  )
    ((J = () => {
      let checkGroveSettings = async function X() {
        let [N, C] = await Promise.all([
          updateGroveSettings_2(credentials),
          getGroveNoticeConfig(credentials),
        ]);
        if (N.success) recordGroveChoiceSeen(N.data, storageV5, credentials);
        let config = C.success ? C.data : null;
        k(config);
        let shouldShow = calculateShouldShowGrove(N, C, showIfAlreadyViewed);
        if ((v(shouldShow), !shouldShow)) {
          onDone("skip_rendering");
          return;
        }
        (markGroveNoticeViewed(credentials),
          logEvent("tengu_grove_policy_viewed", {
            location: fromEnum(location),
            dismissable: config?.notice_is_grace_period,
          }));
      };
      checkGroveSettings();
    }),
      (T = [showIfAlreadyViewed, location, onDone, credentials, storageV5]),
      ($[0] = credentials),
      ($[1] = location),
      ($[2] = onDone),
      ($[3] = showIfAlreadyViewed),
      ($[4] = storageV5),
      ($[5] = J),
      ($[6] = T));
  else ((J = $[5]), (T = $[6]));
  if ((P(J, T), _ === null)) {
    return null;
  }
  if (!_) {
    return null;
  }
  let V;
  if ($[7] !== credentials || $[8] !== t?.notice_is_grace_period || $[9] !== onDone)
    ((V = async function g(value) {
      ee: switch (value) {
        case "accept_opt_in": {
          let F = (await updateGroveSettings(!0, credentials, { onlyIfUnset: !0 })) === !1;
          if (
            (logEvent("tengu_grove_policy_submitted", { state: !F, dismissable: t?.notice_is_grace_period }),
            F)
          ) {
            d(!0);
            return;
          }
          break ee;
        }
        case "accept_opt_out": {
          (await updateGroveSettings(!1, credentials),
            logEvent("tengu_grove_policy_submitted", { state: !1, dismissable: t?.notice_is_grace_period }));
          break ee;
        }
        case "defer": {
          logEvent("tengu_grove_policy_dismissed", { state: !0 });
          break ee;
        }
        case "escape": {
          logEvent("tengu_grove_policy_escaped", {});
        }
      }
      onDone(value);
    }),
      ($[7] = credentials),
      ($[8] = t?.notice_is_grace_period),
      ($[9] = onDone),
      ($[10] = V));
  else V = $[10];
  let g = V,
    Oe;
  if ($[11] !== t?.domain_excluded)
    ((Oe = t?.domain_excluded
      ? [
          {
            label: "Accept terms \xB7 Help improve our AI models: OFF (for emails with your domain)",
            value: "accept_opt_out",
          },
        ]
      : [
          { label: "Accept terms \xB7 Help improve our AI models: ON", value: "accept_opt_in" },
          ACCEPT_OPT_OUT_OPTION,
        ]),
      ($[11] = t?.domain_excluded),
      ($[12] = Oe));
  else Oe = $[12];
  let oe = Oe;
  if (t?.grove_locked_by_claude_science) {
    let E;
    if ($[13] === MEMO_CACHE_SENTINEL) ((E = [ACCEPT_OPT_OUT_OPTION]), ($[13] = E));
    else E = $[13];
    oe = E;
  }
  let E;
  if ($[14] !== t?.notice_is_grace_period || $[15] !== g)
    ((E = function R() {
      if (t?.notice_is_grace_period) {
        g("defer");
        return;
      }
      g("escape");
    }),
      ($[14] = t?.notice_is_grace_period),
      ($[15] = g),
      ($[16] = E));
  else E = $[16];
  let R = E,
    Ie;
  if ($[17] !== onDone)
    ((Ie = function O() {
      onDone("accept_opt_out");
    }),
      ($[17] = onDone),
      ($[18] = Ie));
  else Ie = $[18];
  let O = Ie;
  if (h) {
    const I = location !== "settings";
    let K;
    if ($[19] === MEMO_CACHE_SENTINEL)
      ((K = r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "continue" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "close" }),
        ],
      })),
        ($[19] = K));
    else K = $[19];
    let D;
    if ($[20] !== O) ((D = [{ action: "confirm:yes", run: O }]), ($[20] = O), ($[21] = D));
    else D = $[21];
    let W;
    if ($[22] === MEMO_CACHE_SENTINEL)
      ((W = e(Text, {
        children:
          "This setting wasn't turned on. It's off for your account. You can review it any time with /privacy-settings.",
      })),
        ($[22] = W));
    else W = $[22];
    let b;
    if ($[23] !== D)
      ((b = e(useDialogKeybindings, { scope: "Confirmation", claimFocus: !0, bindings: D, children: W })),
        ($[23] = D),
        ($[24] = b));
    else b = $[24];
    let Y;
    if ($[25] !== O || $[26] !== b || $[27] !== I)
      ((Y = e(Dialog, {
        title: "Help improve our AI models",
        color: "professionalBlue",
        onCancel: O,
        exitOnCtrlCD: I,
        inputGuide: K,
        children: b,
      })),
        ($[25] = O),
        ($[26] = b),
        ($[27] = I),
        ($[28] = Y));
    else Y = $[28];
    return Y;
  }
  const I = location !== "settings";
  let K;
  if ($[29] === MEMO_CACHE_SENTINEL)
    ((K = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      ],
    })),
      ($[29] = K));
  else K = $[29];
  let D;
  if ($[30] !== t?.notice_is_grace_period)
    ((D = e(Box, {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
      children: t?.notice_is_grace_period ? e(GracePeriodContentBody, {}) : e(PostGracePeriodContentBody, {}),
    })),
      ($[30] = t?.notice_is_grace_period),
      ($[31] = D));
  else D = $[31];
  let W;
  if ($[32] === MEMO_CACHE_SENTINEL)
    ((W = e(Box, {
      flexShrink: 0,
      children: e(Text, { color: "professionalBlue", children: NEW_TERMS_ASCII_ART }),
    })),
      ($[32] = W));
  else W = $[32];
  let b;
  if ($[33] !== D) ((b = r(Box, { flexDirection: "row", children: [D, W] })), ($[33] = D), ($[34] = b));
  else b = $[34];
  let Y;
  if ($[35] === MEMO_CACHE_SENTINEL)
    ((Y = r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { bold: !0, children: "Please select how you'd like to continue" }),
        e(Text, { children: "Your choice takes effect immediately upon confirmation." }),
      ],
    })),
      ($[35] = Y));
  else Y = $[35];
  let te;
  if ($[36] !== t?.notice_is_grace_period)
    ((te = t?.notice_is_grace_period ? [{ label: "Not now", value: "defer" }] : []),
      ($[36] = t?.notice_is_grace_period),
      ($[37] = te));
  else te = $[37];
  let ne;
  if ($[38] !== oe || $[39] !== te) ((ne = [...oe, ...te]), ($[38] = oe), ($[39] = te), ($[40] = ne));
  else ne = $[40];
  let ie;
  if ($[41] !== g) ((ie = (value_0) => g(value_0)), ($[41] = g), ($[42] = ie));
  else ie = $[42];
  let ae;
  if ($[43] !== R || $[44] !== ne || $[45] !== ie)
    ((ae = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Y, e(ModelSelector, { options: ne, onChange: ie, onCancel: R })],
    })),
      ($[43] = R),
      ($[44] = ne),
      ($[45] = ie),
      ($[46] = ae));
  else ae = $[46];
  let Se;
  if ($[47] !== R || $[48] !== b || $[49] !== ae || $[50] !== I)
    ((Se = r(Dialog, {
      title: "Updates to Consumer Terms and Policies",
      color: "professionalBlue",
      onCancel: R,
      exitOnCtrlCD: I,
      inputGuide: K,
      children: [b, ae],
    })),
      ($[47] = R),
      ($[48] = b),
      ($[49] = ae),
      ($[50] = I),
      ($[51] = Se));
  else Se = $[51];
  return Se;
}
//@ chunk-fggt3ccb.js:8183-10093 facade-exports = PrivacySettingsDialog (0.431)
function PrivacySettingsDialog(t0) {
  let $ = w(27),
    {
      settings: settings,
      domainExcluded: domainExcluded,
      lockedByClaudeScience: lockedByClaudeScience,
      onDone: onDone,
    } = t0,
    [v, t] = y(settings.grove_enabled),
    { credentials: credentials } = Me(),
    h = domainExcluded || lockedByClaudeScience,
    u;
  if ($[0] === MEMO_CACHE_SENTINEL) ((u = []), ($[0] = u));
  else u = $[0];
  P(He, u);
  let G;
  if ($[1] !== credentials || $[2] !== v || $[3] !== h)
    ((G = function T(o) {
      if (o.ctrl || o.meta) {
        return;
      }
      if (!h && (o.key === "tab" || o.key === "return" || o.key === " ")) {
        o.preventDefault();
        let newValue = !v;
        (t(newValue), updateGroveSettings(newValue, credentials));
      }
    }),
      ($[1] = credentials),
      ($[2] = v),
      ($[3] = h),
      ($[4] = G));
  else G = $[4];
  let T = G,
    N;
  if ($[5] === MEMO_CACHE_SENTINEL) ((N = e(Text, { color: "error", children: "false" })), ($[5] = N));
  else N = $[5];
  let C = N;
  if (lockedByClaudeScience) {
    let p;
    if ($[6] === MEMO_CACHE_SENTINEL) ((p = e(Text, { dimColor: !0, children: "false" })), ($[6] = p));
    else p = $[6];
    C = p;
  } else if (domainExcluded) {
    let p;
    if ($[7] === MEMO_CACHE_SENTINEL)
      ((p = e(Text, { color: "error", children: "false (for emails with your domain)" })), ($[7] = p));
    else p = $[7];
    C = p;
  } else if (v) {
    let p;
    if ($[8] === MEMO_CACHE_SENTINEL) ((p = e(Text, { color: "success", children: "true" })), ($[8] = p));
    else p = $[8];
    C = p;
  }
  let p;
  if ($[9] !== h)
    ((p = h
      ? e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })
      : r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: ["enter", "tab", "space"], action: "toggle" }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
          ],
        })),
      ($[9] = h),
      ($[10] = p));
  else p = $[10];
  let Q;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((Q = r(Text, {
      children: [
        "Review and manage your privacy settings at",
        " ",
        e(Link, { url: "https://claude.ai/settings/data-privacy-controls" }),
      ],
    })),
      ($[11] = Q));
  else Q = $[11];
  let X;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((X = e(Box, { width: 44, children: e(Text, { bold: !0, children: "Help improve our AI models" }) })),
      ($[12] = X));
  else X = $[12];
  let V;
  if ($[13] !== C) ((V = r(Box, { children: [X, e(Box, { children: C })] })), ($[13] = C), ($[14] = V));
  else V = $[14];
  let L;
  if ($[15] !== lockedByClaudeScience)
    ((L = lockedByClaudeScience && e(Text, { dimColor: !0, children: "Not available for this account." })),
      ($[15] = lockedByClaudeScience),
      ($[16] = L));
  else L = $[16];
  let F;
  if ($[17] !== V || $[18] !== L)
    ((F = r(Box, { flexDirection: "column", children: [V, L] })), ($[17] = V), ($[18] = L), ($[19] = F));
  else F = $[19];
  let ee;
  if ($[20] !== T || $[21] !== F)
    ((ee = r(FocusColumn, { gap: 1, onKeyDown: T, children: [Q, F] })),
      ($[20] = T),
      ($[21] = F),
      ($[22] = ee));
  else ee = $[22];
  let g;
  if ($[23] !== onDone || $[24] !== ee || $[25] !== p)
    ((g = e(Dialog, {
      title: "Data privacy",
      color: "professionalBlue",
      onCancel: onDone,
      inputGuide: p,
      children: ee,
    })),
      ($[23] = onDone),
      ($[24] = ee),
      ($[25] = p),
      ($[26] = g));
  else g = $[26];
  return g;
}
//@ chunk-18hwfzwa.js:1098349-1098382 affinity
function kwo() {
  return Date.now();
}
/**
 * 询问是否把 auto 模式设为默认权限模式的对话框；上报 tengu_auto_default_nudge_shown，带输入防抖拒绝。
 */
//@ chunk-18hwfzwa.js:1098382-1100666 callgraph-witnessed = _temp (0.203)
function AutoModeDefaultNudgeDialog(exitState) {
  let $ = w(32),
    { currentMode: currentMode, onDone: onDone } = exitState,
    ee;
  if ($[0] !== currentMode)
    ((ee = () => {
      logEvent("tengu_auto_default_nudge_shown", { current_mode: fromEnum(currentMode) });
    }),
      ($[0] = currentMode),
      ($[1] = ee));
  else ee = $[1];
  useOnFirstReveal("impression", ee);
  let ke = useGlobalExitKeybindings(),
    Re = useIsScreenReaderEnabled(),
    Be = useRefusableAnswer(onDone),
    He = useInputClock(),
    [We] = y(kwo),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    rt;
  if ($[2] !== He || $[3] !== We || $[4] !== noteRefused || $[5] !== refusedWithin)
    ((rt = () => {
      if (isWithinRecentInput(He, We) || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[2] = He),
      ($[3] = We),
      ($[4] = noteRefused),
      ($[5] = refusedWithin),
      ($[6] = rt));
  else rt = $[6];
  let kt = rt,
    At;
  if ($[7] !== kt || $[8] !== Be)
    ((At = function Ot(It) {
      if (kt()) {
        Be.refuse(It);
        return;
      }
      Be.answer(It);
    }),
      ($[7] = kt),
      ($[8] = Be),
      ($[9] = At));
  else At = $[9];
  let Ot = At,
    Et;
  if ($[10] === MEMO_CACHE_SENTINEL) ((Et = nd(!1)), ($[10] = Et));
  else Et = $[10];
  let Dt = Et,
    Lt;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((Lt = e(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: e(Text, {
        children:
          "Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.",
      }),
    })),
      ($[11] = Lt));
  else Lt = $[11];
  const attempts = Be.attempts,
    Xt = Be.refused ?? void 0;
  let io;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((io = { label: "Yes, set auto mode as my default permission mode", value: "accept" }), ($[12] = io));
  else io = $[12];
  let so;
  if ($[13] !== currentMode)
    ((so = permissionModeIndicator(currentMode)), ($[13] = currentMode), ($[14] = so));
  else so = $[14];
  const po = `No, keep ${so}`;
  let ao;
  if ($[15] !== po) ((ao = [io, { label: po, value: "decline" }]), ($[15] = po), ($[16] = ao));
  else ao = $[16];
  let co;
  if ($[17] !== Ot) ((co = () => Ot("decline")), ($[17] = Ot), ($[18] = co));
  else co = $[18];
  let bo;
  if ($[19] !== Ot || $[20] !== kt || $[21] !== Be.attempts || $[22] !== ao || $[23] !== co || $[24] !== Xt)
    ((bo = e(Box, {
      children: e(
        ModelSelector,
        { defaultFocusValue: Xt, hideIndexes: !0, refuseInput: kt, options: ao, onChange: Ot, onCancel: co },
        attempts,
      ),
    })),
      ($[19] = Ot),
      ($[20] = kt),
      ($[21] = Be.attempts),
      ($[22] = ao),
      ($[23] = co),
      ($[24] = Xt),
      ($[25] = bo));
  else bo = $[25];
  let Ao;
  if ($[26] !== ke || $[27] !== Re)
    ((Ao =
      !1 &&
      (!Re || ke.pending) &&
      e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: ke.pending
            ? `Press ${ke.keyName} again to exit`
            : r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...Dt }),
                  e(ConfigurableShortcutHint, {
                    action: "select:cancel",
                    context: "Select",
                    fallback: "Esc",
                    description: "cancel",
                    ...Dt,
                  }),
                ],
              }),
        }),
      })),
      ($[26] = ke),
      ($[27] = Re),
      ($[28] = Ao));
  else Ao = $[28];
  let Bo;
  if ($[29] !== bo || $[30] !== Ao)
    ((Bo = e(PermissionDialog_2, {
      title: "Make auto mode your default permission mode?",
      children: r(Box, {
        flexDirection: "column",
        paddingX: !1 ? 0 : 2,
        paddingTop: 1,
        paddingBottom: !1 ? 0 : 1,
        children: [Lt, bo, Ao],
      }),
    })),
      ($[29] = bo),
      ($[30] = Ao),
      ($[31] = Bo));
  else Bo = $[31];
  return Bo;
}

export { AutoModeDefaultNudgeDialog, PrivacySettingsDialog, GroveDialog };
