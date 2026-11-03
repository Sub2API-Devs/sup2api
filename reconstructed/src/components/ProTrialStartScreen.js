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
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { startProTrial, Qgo } from "../services/api/proTrial.js";
import { isExpectedApiError, errorMessage } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WelcomeV2 } from "./LogoV2/WelcomeV2.js";
import { Text, Box } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";

//@ chunk-5qm79scx.js:14105-14109 placement
j();
/**
 * Pro 套餐 Claude Code 试用开通确认界面（开始、出错、上报 tengu_pro_trial_*）。
 */
//@ chunk-5qm79scx.js:14109-15370 placement
function ProTrialStartScreen(F) {
  let i = w(11),
    { onDone: onDone, storageV5: storageV5, credentials: credentials } = F,
    [o, C] = y("idle"),
    D;
  if (i[0] !== credentials || i[1] !== onDone || i[2] !== o || i[3] !== storageV5)
    ((D = {
      "confirm:yes": () => {
        if (o === "starting") {
          return;
        }
        if (o === "error") {
          onDone();
          return;
        }
        (C("starting"),
          logEvent("tengu_pro_trial_start_pressed", {}),
          startProTrial(storageV5, credentials)
            .then(() => {
              (logEvent("tengu_pro_trial_start_ok", {}), onDone());
            })
            .catch((g) => {
              if (isExpectedApiError(g))
                logForDebugging(`Failed to start pro trial: ${errorMessage(g)}`, { level: "error" });
              else logError(g);
              (logEvent("tengu_pro_trial_start_error", {}), C("error"));
            }));
      },
    }),
      (i[0] = credentials),
      (i[1] = onDone),
      (i[2] = o),
      (i[3] = storageV5),
      (i[4] = D));
  else D = i[4];
  let k;
  if (i[5] === MEMO_CACHE_SENTINEL) ((k = { context: "Confirmation" }), (i[5] = k));
  else k = i[5];
  MessageActionsKeybindings(D, k);
  let x;
  if (i[6] === MEMO_CACHE_SENTINEL) ((x = Qgo()), (i[6] = x));
  else x = i[6];
  let B = x,
    H;
  if (i[7] === MEMO_CACHE_SENTINEL) ((H = e(WelcomeV2, {})), (i[7] = H));
  else H = i[7];
  let R;
  if (i[8] === MEMO_CACHE_SENTINEL)
    ((R = e(Text, {
      children:
        B !== null
          ? `Your Pro plan includes ${B} days of Claude Code.`
          : "Your Pro plan includes a Claude Code trial.",
    })),
      (i[8] = R));
  else R = i[8];
  let V;
  if (i[9] !== o)
    ((V = r(Box, {
      flexDirection: "column",
      paddingX: 1,
      gap: 1,
      children: [
        H,
        R,
        o === "starting"
          ? r(Box, { children: [e(Spinner, {}), e(Text, { children: " Starting your trial\u2026" })] })
          : o === "error"
            ? r(Text, {
                color: "error",
                children: [
                  "Couldn't start your trial. Press ",
                  e(Text, { bold: !0, children: "Enter" }),
                  " to continue.",
                ],
              })
            : r(Text, {
                color: "permission",
                children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to start your trial"],
              }),
      ],
    })),
      (i[9] = o),
      (i[10] = V));
  else V = i[10];
  return V;
}
