/**
 * components/ProTrialStartScreen.tsx
 *
 * 2.1.316 新增：Pro 套餐 Claude Code 试用开通确认界面（开始、出错、上报 tengu_pro_trial_*）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5qm79scx.js (2)
 * attribution: placement 2
 */
import { init_react_production, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-5qm79scx.js:14105-14109 placement
init_react_production();
//@ chunk-5qm79scx.js:14109-15370 placement
/**
 * Pro 套餐 Claude Code 试用开通确认界面（开始、出错、上报 tengu_pro_trial_*）。
 */
function ProTrialStartScreen(props) {
  let i = w(11);
  let { onDone, storageV5, credentials } = props;
  let [o, C] = y("idle");
  let D;
  if (i[0] !== credentials || i[1] !== onDone || i[2] !== o || i[3] !== storageV5) {
    D = {
      "confirm:yes": () => {
        if (o === "starting") {
          return;
        }
        if (o === "error") {
          onDone();
          return;
        }
        C("starting");
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
            C("error");
          });
      },
    };
    i[0] = credentials;
    i[1] = onDone;
    i[2] = o;
    i[3] = storageV5;
    i[4] = D;
  } else D = i[4];
  let k;
  if (i[5] === MEMO_CACHE_SENTINEL) {
    k = {
      context: "Confirmation",
    };
    i[5] = k;
  } else k = i[5];
  MessageActionsKeybindings(D, k);
  let x;
  if (i[6] === MEMO_CACHE_SENTINEL) {
    x = trialDurationDays();
    i[6] = x;
  } else x = i[6];
  let B = x;
  let H;
  if (i[7] === MEMO_CACHE_SENTINEL) {
    H = jsxProd_default(WelcomeV2, {});
    i[7] = H;
  } else H = i[7];
  let R;
  if (i[8] === MEMO_CACHE_SENTINEL) {
    R = jsxProd_default(Text, {
      children:
        B !== null
          ? `Your Pro plan includes ${B} days of Claude Code.`
          : "Your Pro plan includes a Claude Code trial.",
    });
    i[8] = R;
  } else R = i[8];
  let V;
  if (i[9] !== o) {
    V = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      gap: 1,
      children: [
        H,
        R,
        o === "starting"
          ? jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children: " Starting your trial\u2026",
                }),
              ],
            })
          : o === "error"
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
    i[9] = o;
    i[10] = V;
  } else V = i[10];
  return V;
}
