/**
 * components/ClaudeInChromeOnboarding.tsx
 *
 * Claude in Chrome 引导说明（需安装扩展）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClaudeInChromeOnboarding.tsx
 * pieces: chunk-hthm3h8y.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { logEvent } from "../services/analytics/index.js";
import { isChromeExtensionInstalled } from "../utils/claudeInChrome/setup.js";
import { logError } from "../utils/log.js";
import { saveGlobalConfig } from "../utils/config.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Newline } from "../ink/components/Input.js";
import { Link, Text, Box } from "../ink/components/Text.js";
import { HTTPS_CLAUDE_AI_CHROME, CHROME_PERMISSIONS_URL } from "../commands/chrome/chrome.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { NoticeAccent } from "./design-system/NoticeUnderScene.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-hthm3h8y.js:5447-5451 placement
j();
//@ chunk-hthm3h8y.js:5451-5518 fingerprint = _temp (1)
function V(current) {
  return { ...current, hasCompletedClaudeInChromeOnboarding: !0 };
}
//@ chunk-hthm3h8y.js:5561-7326 fingerprint = ClaudeInChromeOnboarding (0.392)
function ClaudeInChromeOnboarding(t0) {
  let $ = w(22),
    { onDone: onDone } = t0,
    [i, G] = y(!1),
    { storageV5: storageV5 } = Me(),
    I,
    E;
  if ($[0] !== storageV5)
    ((I = () => {
      (logEvent("tengu_claude_in_chrome_onboarding_shown", {}),
        isChromeExtensionInstalled().then(G).catch(logError),
        saveGlobalConfig(V, storageV5));
    }),
      (E = [storageV5]),
      ($[0] = storageV5),
      ($[1] = I),
      ($[2] = E));
  else ((I = $[1]), (E = $[2]));
  P(I, E);
  let d;
  if ($[3] !== onDone)
    ((d = (h) => {
      if (h.key === "return" && !h.ctrl && !h.meta) (h.preventDefault(), onDone());
    }),
      ($[3] = onDone),
      ($[4] = d));
  else d = $[4];
  let u;
  if ($[5] !== i)
    ((u =
      !i &&
      r(Fragment, {
        children: [
          e(Newline, {}),
          e(Newline, {}),
          "Requires the Chrome extension. Get started at",
          " ",
          e(Link, { url: HTTPS_CLAUDE_AI_CHROME }),
        ],
      })),
      ($[5] = i),
      ($[6] = u));
  else u = $[6];
  let p;
  if ($[7] !== u)
    ((p = r(Text, {
      children: [
        "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. You can navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
        u,
      ],
    })),
      ($[7] = u),
      ($[8] = p));
  else p = $[8];
  let f;
  if ($[9] !== i)
    ((f = i && r(Fragment, { children: [" ", "(", e(Link, { url: CHROME_PERMISSIONS_URL }), ")"] })),
      ($[9] = i),
      ($[10] = f));
  else f = $[10];
  let C;
  if ($[11] !== f)
    ((C = r(Text, {
      dimColor: !0,
      children: [
        "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on",
        f,
        ".",
      ],
    })),
      ($[11] = f),
      ($[12] = C));
  else C = $[12];
  let R;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((R = e(NoticeAccent, { bold: !0, color: "chromeYellow", children: "/chrome" })), ($[13] = R));
  else R = $[13];
  let _;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((_ = r(Text, {
      dimColor: !0,
      children: [
        "For more info, use",
        " ",
        R,
        " ",
        "or visit ",
        e(Link, { url: "https://code.claude.com/docs/en/chrome" }),
      ],
    })),
      ($[14] = _));
  else _ = $[14];
  let x;
  if ($[15] !== d || $[16] !== p || $[17] !== C)
    ((x = r(Box, {
      flexDirection: "column",
      gap: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: d,
      children: [p, C, _],
    })),
      ($[15] = d),
      ($[16] = p),
      ($[17] = C),
      ($[18] = x));
  else x = $[18];
  let k;
  if ($[19] !== onDone || $[20] !== x)
    ((k = e(Dialog, {
      title: "Claude in Chrome",
      onCancel: onDone,
      exitOnCtrlCD: !0,
      color: "chromeYellow",
      children: x,
    })),
      ($[19] = onDone),
      ($[20] = x),
      ($[21] = k));
  else k = $[21];
  return k;
}
