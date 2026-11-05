/**
 * components/ChromeSetupDialog.tsx
 *
 * 2.1.316 新增。Claude in Chrome 设置对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { useRefusalTracker, useMountTime, settleKey } from "./CustomSelect/selectTypeahead.js";
import {
  useRecentInputStamp,
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
} from "../hooks/useRecentInputGuard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { HTTPS_CLAUDE_AI_CHROME } from "../commands/chrome/chrome.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { logEvent } from "../services/analytics/index.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1362741-1362745 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1362741", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1362745-1362853 placement
var CHROME_SETUP_SKIP_OPTION = {
  value: "skip",
  label: "Continue without browser tools",
  description: "Finish setup later with /chrome",
};
//@ chunk-czq1j3j2.js:1362853-1364846 placement
function ChromeInstallFlow({ payload, answer }) {
  let { phase, installPageOpened } = payload;
  let phaseRef = useRef(phase);
  let inputClock = useInputClock();
  let phaseStartedAtRef = useRef(Date.now());
  let { refusedWithin, noteRefused } = useRefusalTracker();
  if (phaseRef.current !== phase) {
    phaseRef.current = phase;
    phaseStartedAtRef.current = Date.now();
  }
  let usePhaseStamp = useRecentInputStamp(phaseStartedAtRef.current);
  function refuseInput() {
    if (
      isWithinRecentInput(inputClock, usePhaseStamp(phaseStartedAtRef.current), RECENT_INPUT_GUARD_MS_3) ||
      refusedWithin(RECENT_INPUT_GUARD_MS_3)
    ) {
      noteRefused();
      return true;
    }
    return false;
  }
  function handleAnswer(value) {
    if (refuseInput()) return;
    answer(value);
  }
  let installDone = phase !== "waiting_install";
  let status =
    phase === "connected" ? "success" : phase === "failed" ? "error" : installDone ? "loading" : "pending";
  let options =
    phase === "connected"
      ? [
          {
            value: "continue",
            label: "Continue with browser tools",
            description: "Claude picks the task back up in your browser",
          },
          CHROME_SETUP_SKIP_OPTION,
        ]
      : phase === "stalled"
        ? [
            {
              value: "keep_waiting",
              label: "Keep waiting",
              description: "Setup keeps checking for the connection",
            },
            CHROME_SETUP_SKIP_OPTION,
          ]
        : [CHROME_SETUP_SKIP_OPTION];
  return jsxProd_default(PermissionDialog_2, {
    color: "permission",
    title: "Setting up Claude in Chrome",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingX: 1,
      gap: 1,
      children: [
        phase !== "connected" &&
          phase !== "failed" &&
          jsxProd_default(Text, {
            dimColor: true,
            children:
              "Finish setup in Chrome. This screen follows along and updates on its own as each step completes.",
          }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(StatusIcon, {
                  status: installDone ? "success" : "loading",
                  withSpace: true,
                }),
                "Install the extension",
              ],
            }),
            !installDone &&
              jsxProd_default(Box, {
                paddingLeft: 3,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: installPageOpened
                    ? "Add Claude in Chrome from the page that just opened in Chrome."
                    : `Add Claude in Chrome from ${HTTPS_CLAUDE_AI_CHROME}.`,
                }),
              }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(StatusIcon, {
                  status,
                  withSpace: true,
                }),
                "Connect to Chrome",
              ],
            }),
            phase === "stalled" &&
              jsxProd_default(Box, {
                paddingLeft: 3,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children:
                    "Taking longer than expected. Check that the extension is added and that you're signed in to it in Chrome.",
                }),
              }),
            phase === "failed" &&
              jsxProd_default(Box, {
                paddingLeft: 3,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: "Couldn't connect to the extension. Finish setup later with /chrome.",
                }),
              }),
            phase === "connected" &&
              jsxProd_default(Box, {
                paddingLeft: 3,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children:
                    "Browser tools are ready. Continuing keeps them enabled for future sessions too \u2014 manage anytime with /chrome.",
                }),
              }),
          ],
        }),
        jsxProd_default(
          ModelSelector,
          {
            hideIndexes: true,
            selectedValue: NO_COMMITTED_ROW,
            options,
            refuseInput,
            onChange: handleAnswer,
            onCancel: () => handleAnswer("cancelled"),
          },
          phase,
        ),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1364846-1364850 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1364846", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1364850-1364907 placement
function logChromeUpsellShown() {
  logEvent("tengu_chrome_install_upsell_shown", {});
}
//@ chunk-czq1j3j2.js:1364907-1365179 placement
var CHROME_EXTENSION_PROMPT_OPTIONS = [
  {
    value: "install",
    label: "Install extension",
    description: "Opens the install page in Chrome",
  },
  {
    value: "not_now",
    label: "Not now",
    description: "Continue without browser tools",
  },
  {
    value: "dont_ask_again",
    label: "Don't ask again",
    description: "Revisit anytime with /chrome",
  },
];
//@ chunk-czq1j3j2.js:1365179-1366388 placement
function ChromeSetupDialog(props) {
  let $ = useMemoCache(17);
  let { answer } = props;
  let shownDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    shownDeps = [];
    $[0] = shownDeps;
  } else shownDeps = $[0];
  useEffect(logChromeUpsellShown, shownDeps);
  let inputClock = useInputClock();
  let shownAtRef = useMountTime();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let refuseInput;
  if ($[1] !== inputClock || $[2] !== noteRefused || $[3] !== shownAtRef || $[4] !== refusedWithin) {
    refuseInput = function refuseInputFn() {
      if (
        isWithinRecentInput(inputClock, shownAtRef(), RECENT_INPUT_GUARD_MS_3) ||
        refusedWithin(RECENT_INPUT_GUARD_MS_3)
      ) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[1] = inputClock;
    $[2] = noteRefused;
    $[3] = shownAtRef;
    $[4] = refusedWithin;
    $[5] = refuseInput;
  } else refuseInput = $[5];
  let isRefusing = refuseInput;
  let handleAnswer;
  if ($[6] !== answer || $[7] !== isRefusing) {
    handleAnswer = function value(value) {
      if (isRefusing()) {
        return;
      }
      answer(value);
    };
    $[6] = answer;
    $[7] = isRefusing;
    $[8] = handleAnswer;
  } else handleAnswer = $[8];
  let answerValue = handleAnswer;
  let settled = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let introText;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children:
        "This task could use your Chrome browser. The Claude in Chrome extension lets Claude navigate sites, click buttons, and fill forms in your existing session.",
    });
    $[9] = introText;
  } else introText = $[9];
  let onCancel;
  if ($[10] !== answerValue) {
    onCancel = () => answerValue("cancelled");
    $[10] = answerValue;
    $[11] = onCancel;
  } else onCancel = $[11];
  let dialog;
  if ($[12] !== answerValue || $[13] !== settled.remountKey || $[14] !== isRefusing || $[15] !== onCancel) {
    dialog = jsxProd_default(PermissionDialog_2, {
      color: "permission",
      title: "Claude wants to use your browser",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        paddingX: 1,
        children: [
          introText,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(
              ModelSelector,
              {
                hideIndexes: true,
                selectedValue: NO_COMMITTED_ROW,
                refuseInput: isRefusing,
                defaultFocusValue: "not_now",
                options: CHROME_EXTENSION_PROMPT_OPTIONS,
                onChange: answerValue,
                onCancel,
              },
              settled.remountKey,
            ),
          }),
        ],
      }),
    });
    $[12] = answerValue;
    $[13] = settled.remountKey;
    $[14] = isRefusing;
    $[15] = onCancel;
    $[16] = dialog;
  } else dialog = $[16];
  return dialog;
}
export { ChromeSetupDialog, ChromeInstallFlow };
