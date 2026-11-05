/**
 * components/ProTrialStartScreen.tsx
 *
 * 2.1.316 新增：Pro 套餐 Claude Code 试用开通确认界面（开始、出错、上报 tengu_pro_trial_*）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wphv12b5.js (2)
 * attribution: placement 2
 */
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { startProTrial, trialDurationDays } from "../services/api/proTrial.js";
import { isExpectedApiError, errorMessage } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WelcomeV2 } from "./LogoV2/WelcomeV2.js";
import { Text, Box } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";

//@ chunk-wphv12b5.js:15253-15257 placement
init_react_production();
//@ chunk-wphv12b5.js:15257-16518 placement
/**
 * Pro 套餐 Claude Code 试用开通确认界面（开始、出错、上报 tengu_pro_trial_*）。
 */
function ProTrialStartScreen(props) {
  let $ = useMemoCache(11);
  let { onDone, storageV5, credentials } = props;
  let [status, setStatus] = useState("idle");
  let keybindings;
  if ($[0] !== credentials || $[1] !== onDone || $[2] !== status || $[3] !== storageV5) {
    keybindings = {
      "confirm:yes": () => {
        if (status === "starting") {
          return;
        }
        if (status === "error") {
          onDone();
          return;
        }
        setStatus("starting");
        logEvent("tengu_pro_trial_start_pressed", {});
        startProTrial(storageV5, credentials)
          .then(() => {
            logEvent("tengu_pro_trial_start_ok", {});
            onDone();
          })
          .catch((error) => {
            if (isExpectedApiError(error))
              logForDebugging(`Failed to start pro trial: ${errorMessage(error)}`, {
                level: "error",
              });
            else logError(error);
            logEvent("tengu_pro_trial_start_error", {});
            setStatus("error");
          });
      },
    };
    $[0] = credentials;
    $[1] = onDone;
    $[2] = status;
    $[3] = storageV5;
    $[4] = keybindings;
  } else keybindings = $[4];
  let confirmationKeybindings;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    confirmationKeybindings = {
      context: "Confirmation",
    };
    $[5] = confirmationKeybindings;
  } else confirmationKeybindings = $[5];
  MessageActionsKeybindings(keybindings, confirmationKeybindings);
  let trialDays;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    trialDays = trialDurationDays();
    $[6] = trialDays;
  } else trialDays = $[6];
  let trialDaysValue = trialDays;
  let welcomeV2Element;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    welcomeV2Element = jsxProd_default(WelcomeV2, {});
    $[7] = welcomeV2Element;
  } else welcomeV2Element = $[7];
  let textElement;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      children:
        trialDaysValue !== null
          ? `Your Pro plan includes ${trialDaysValue} days of Claude Code.`
          : "Your Pro plan includes a Claude Code trial.",
    });
    $[8] = textElement;
  } else textElement = $[8];
  let boxElement;
  if ($[9] !== status) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      gap: 1,
      children: [
        welcomeV2Element,
        textElement,
        status === "starting"
          ? jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children: " Starting your trial\u2026",
                }),
              ],
            })
          : status === "error"
            ? jsxProd_default_2(Text, {
                color: "error",
                children: [
                  "Couldn't start your trial. Press ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Enter",
                  }),
                  " to continue.",
                ],
              })
            : jsxProd_default_2(Text, {
                color: "permission",
                children: [
                  "Press ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Enter",
                  }),
                  " to start your trial",
                ],
              }),
      ],
    });
    $[9] = status;
    $[10] = boxElement;
  } else boxElement = $[10];
  return boxElement;
}
export { ProTrialStartScreen };
