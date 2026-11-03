/**
 * components/ChromeSetupDialog.tsx
 *
 * 2.1.316 新增。Claude in Chrome 设置对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { R, init_react_production, P } from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import {
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
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:1340424-1340532 placement
var CHROME_SETUP_SKIP_OPTION = {
  value: "skip",
  label: "Continue without browser tools",
  description: "Finish setup later with /chrome",
};
//@ chunk-18hwfzwa.js:1340532-1342499 placement
function ChromeInstallFlow({ payload, answer }) {
  let { phase, installPageOpened } = payload;
  let phaseRef = R(phase);
  let inputClock = useInputClock();
  let Re = R(Date.now());
  let { refusedWithin, noteRefused } = useRefusalTracker();
  if (phaseRef.current !== phase) {
    phaseRef.current = phase;
    Re.current = Date.now();
  }
  function We() {
    if (
      isWithinRecentInput(inputClock, Re.current, RECENT_INPUT_GUARD_MS_3) ||
      refusedWithin(RECENT_INPUT_GUARD_MS_3)
    ) {
      noteRefused();
      return true;
    }
    return false;
  }
  function ze(At) {
    if (We()) return;
    answer(At);
  }
  let Xe = phase !== "waiting_install";
  let status = phase === "connected" ? "success" : phase === "failed" ? "error" : Xe ? "loading" : "pending";
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
                  status: Xe ? "success" : "loading",
                  withSpace: true,
                }),
                "Install the extension",
              ],
            }),
            !Xe &&
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
            refuseInput: We,
            onChange: ze,
            onCancel: () => ze("cancelled"),
          },
          phase,
        ),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1342499-1342503 placement
init_react_production();
//@ chunk-18hwfzwa.js:1342503-1342560 placement
function logChromeUpsellShown() {
  logEvent("tengu_chrome_install_upsell_shown", {});
}
//@ chunk-18hwfzwa.js:1342560-1342832 placement
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
//@ chunk-18hwfzwa.js:1342832-1344083 placement
function ChromeSetupDialog(props) {
  let $ = w(17);
  let { answer } = props;
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    L = [];
    $[0] = L;
  } else L = $[0];
  P(logChromeUpsellShown, L);
  let inputClock = useInputClock();
  let ke;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    ke = Date.now();
    $[1] = ke;
  } else ke = $[1];
  let Re = R(ke);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let ze;
  if ($[2] !== inputClock || $[3] !== noteRefused || $[4] !== refusedWithin) {
    ze = function Xe() {
      if (
        isWithinRecentInput(inputClock, Re.current, RECENT_INPUT_GUARD_MS_3) ||
        refusedWithin(RECENT_INPUT_GUARD_MS_3)
      ) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[2] = inputClock;
    $[3] = noteRefused;
    $[4] = refusedWithin;
    $[5] = ze;
  } else ze = $[5];
  let Xe = ze;
  let rt;
  if ($[6] !== answer || $[7] !== Xe) {
    rt = function At(kt) {
      if (Xe()) {
        return;
      }
      answer(kt);
    };
    $[6] = answer;
    $[7] = Xe;
    $[8] = rt;
  } else rt = $[8];
  let At = rt;
  let It = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let Ot;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    Ot = jsxProd_default(Text, {
      children:
        "This task could use your Chrome browser. The Claude in Chrome extension lets Claude navigate sites, click buttons, and fill forms in your existing session.",
    });
    $[9] = Ot;
  } else Ot = $[9];
  let onCancel;
  if ($[10] !== At) {
    onCancel = () => At("cancelled");
    $[10] = At;
    $[11] = onCancel;
  } else onCancel = $[11];
  let Dt;
  if ($[12] !== At || $[13] !== It.remountKey || $[14] !== Xe || $[15] !== onCancel) {
    Dt = jsxProd_default(PermissionDialog_2, {
      color: "permission",
      title: "Claude wants to use your browser",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        paddingX: 1,
        children: [
          Ot,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(
              ModelSelector,
              {
                hideIndexes: true,
                selectedValue: NO_COMMITTED_ROW,
                refuseInput: Xe,
                defaultFocusValue: "not_now",
                options: CHROME_EXTENSION_PROMPT_OPTIONS,
                onChange: At,
                onCancel,
              },
              It.remountKey,
            ),
          }),
        ],
      }),
    });
    $[12] = At;
    $[13] = It.remountKey;
    $[14] = Xe;
    $[15] = onCancel;
    $[16] = Dt;
  } else Dt = $[16];
  return Dt;
}
//@ chunk-18hwfzwa.js:1344083-1344087 placement
init_react_production();
export { ChromeSetupDialog, ChromeInstallFlow };
