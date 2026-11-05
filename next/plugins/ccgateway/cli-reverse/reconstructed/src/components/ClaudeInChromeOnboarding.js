/**
 * components/ClaudeInChromeOnboarding.tsx
 *
 * Claude in Chrome 引导说明（需安装扩展）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClaudeInChromeOnboarding.tsx
 * pieces: chunk-9kwkaaet.js (3)
 * attribution: placement 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { logEvent } from "../services/analytics/index.js";
import { isChromeExtensionInstalled } from "../utils/claudeInChrome/setup.js";
import { logError } from "../utils/log.js";
import { saveGlobalConfig } from "../utils/config.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Newline } from "../ink/components/Input.js";
import { Link, Text, Box } from "../ink/components/Text.js";
import { HTTPS_CLAUDE_AI_CHROME, CHROME_PERMISSIONS_URL } from "../commands/chrome/chrome.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { NoticeAccent } from "./design-system/NoticeUnderScene.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-9kwkaaet.js:5784-5788 placement
init_react_production();
//@ chunk-9kwkaaet.js:5788-5855 fingerprint (2.1.88 match: _temp, 1)
function markClaudeInChromeOnboarded(current) {
  return {
    ...current,
    hasCompletedClaudeInChromeOnboarding: true,
  };
}
//@ chunk-9kwkaaet.js:5898-7665 fingerprint (2.1.88 match: ClaudeInChromeOnboarding, 0.392)
function ClaudeInChromeOnboarding(props) {
  let $ = useMemoCache(22);
  let { onDone } = props;
  let [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  let { storageV5 } = useTheme_2();
  let chromeProps;
  let t2;
  if ($[0] !== storageV5) {
    chromeProps = () => {
      logEvent("tengu_claude_in_chrome_onboarding_shown", {});
      isChromeExtensionInstalled().then(setIsExtensionInstalled).catch(logError);
      saveGlobalConfig(markClaudeInChromeOnboarded, storageV5);
    };
    t2 = [storageV5];
    $[0] = storageV5;
    $[1] = chromeProps;
    $[2] = t2;
  } else {
    chromeProps = $[1];
    t2 = $[2];
  }
  useEffect(chromeProps, t2);
  let onKeyDown;
  if ($[3] !== onDone) {
    onKeyDown = (event) => {
      if (event.key === "return" && !event.ctrl && !event.meta) {
        event.preventDefault();
        onDone();
      }
    };
    $[3] = onDone;
    $[4] = onKeyDown;
  } else onKeyDown = $[4];
  let t4;
  if ($[5] !== isExtensionInstalled) {
    t4 =
      !isExtensionInstalled &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Newline, {}),
          jsxProd_default(Newline, {}),
          "Requires the Chrome extension. Get started at",
          " ",
          jsxProd_default(Link, {
            url: HTTPS_CLAUDE_AI_CHROME,
          }),
        ],
      });
    $[5] = isExtensionInstalled;
    $[6] = t4;
  } else t4 = $[6];
  let t5;
  if ($[7] !== t4) {
    t5 = jsxProd_default_2(Text, {
      children: [
        "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. You can navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
        t4,
      ],
    });
    $[7] = t4;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if ($[9] !== isExtensionInstalled) {
    t6 =
      isExtensionInstalled &&
      jsxProd_default_2(Fragment, {
        children: [
          " ",
          "(",
          jsxProd_default(Link, {
            url: CHROME_PERMISSIONS_URL,
          }),
          ")",
        ],
      });
    $[9] = isExtensionInstalled;
    $[10] = t6;
  } else t6 = $[10];
  let t7;
  if ($[11] !== t6) {
    t7 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on",
        t6,
        ".",
      ],
    });
    $[11] = t6;
    $[12] = t7;
  } else t7 = $[12];
  let t8;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(NoticeAccent, {
      bold: true,
      color: "chromeYellow",
      children: "/chrome",
    });
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t9 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "For more info, use",
        " ",
        t8,
        " ",
        "or visit ",
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/chrome",
        }),
      ],
    });
    $[14] = t9;
  } else t9 = $[14];
  let children;
  if ($[15] !== onKeyDown || $[16] !== t5 || $[17] !== t7) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: [t5, t7, t9],
    });
    $[15] = onKeyDown;
    $[16] = t5;
    $[17] = t7;
    $[18] = children;
  } else children = $[18];
  let t11;
  if ($[19] !== onDone || $[20] !== children) {
    t11 = jsxProd_default(Dialog, {
      title: "Claude in Chrome",
      onCancel: onDone,
      exitOnCtrlCD: true,
      color: "chromeYellow",
      children,
    });
    $[19] = onDone;
    $[20] = children;
    $[21] = t11;
  } else t11 = $[21];
  return t11;
}
export { ClaudeInChromeOnboarding };
