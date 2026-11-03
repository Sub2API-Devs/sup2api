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
import { R, j, P } from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { isWithinRecentInput, So } from "../hooks/useRecentInputGuard.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function ChromeInstallFlow({ payload: payload, answer: answer }) {
  let { phase: phase, installPageOpened: installPageOpened } = payload,
    ee = R(phase),
    ke = useInputClock(),
    Re = R(Date.now()),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker();
  if (ee.current !== phase) ((ee.current = phase), (Re.current = Date.now()));
  function We() {
    if (isWithinRecentInput(ke, Re.current, So) || refusedWithin(So)) return (noteRefused(), !0);
    return !1;
  }
  function ze(At) {
    if (We()) return;
    answer(At);
  }
  let Xe = phase !== "waiting_install",
    rt = phase === "connected" ? "success" : phase === "failed" ? "error" : Xe ? "loading" : "pending",
    kt =
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
  return e(PermissionDialog_2, {
    color: "permission",
    title: "Setting up Claude in Chrome",
    children: r(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingX: 1,
      gap: 1,
      children: [
        phase !== "connected" &&
          phase !== "failed" &&
          e(Text, {
            dimColor: !0,
            children:
              "Finish setup in Chrome. This screen follows along and updates on its own as each step completes.",
          }),
        r(Box, {
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                e(StatusIcon, { status: Xe ? "success" : "loading", withSpace: !0 }),
                "Install the extension",
              ],
            }),
            !Xe &&
              e(Box, {
                paddingLeft: 3,
                children: e(Text, {
                  dimColor: !0,
                  children: installPageOpened
                    ? "Add Claude in Chrome from the page that just opened in Chrome."
                    : `Add Claude in Chrome from ${HTTPS_CLAUDE_AI_CHROME}.`,
                }),
              }),
            r(Text, { children: [e(StatusIcon, { status: rt, withSpace: !0 }), "Connect to Chrome"] }),
            phase === "stalled" &&
              e(Box, {
                paddingLeft: 3,
                children: e(Text, {
                  dimColor: !0,
                  children:
                    "Taking longer than expected. Check that the extension is added and that you're signed in to it in Chrome.",
                }),
              }),
            phase === "failed" &&
              e(Box, {
                paddingLeft: 3,
                children: e(Text, {
                  dimColor: !0,
                  children: "Couldn't connect to the extension. Finish setup later with /chrome.",
                }),
              }),
            phase === "connected" &&
              e(Box, {
                paddingLeft: 3,
                children: e(Text, {
                  dimColor: !0,
                  children:
                    "Browser tools are ready. Continuing keeps them enabled for future sessions too \u2014 manage anytime with /chrome.",
                }),
              }),
          ],
        }),
        e(
          ModelSelector,
          {
            hideIndexes: !0,
            selectedValue: NO_COMMITTED_ROW,
            options: kt,
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
j();
//@ chunk-18hwfzwa.js:1342503-1342560 placement
function GOo() {
  logEvent("tengu_chrome_install_upsell_shown", {});
}
//@ chunk-18hwfzwa.js:1342560-1342832 placement
var CHROME_EXTENSION_PROMPT_OPTIONS = [
  { value: "install", label: "Install extension", description: "Opens the install page in Chrome" },
  { value: "not_now", label: "Not now", description: "Continue without browser tools" },
  { value: "dont_ask_again", label: "Don't ask again", description: "Revisit anytime with /chrome" },
];
//@ chunk-18hwfzwa.js:1342832-1344083 placement
function ChromeSetupDialog(h) {
  let $ = w(17),
    { answer: answer } = h,
    L;
  if ($[0] === MEMO_CACHE_SENTINEL) ((L = []), ($[0] = L));
  else L = $[0];
  P(GOo, L);
  let ee = useInputClock(),
    ke;
  if ($[1] === MEMO_CACHE_SENTINEL) ((ke = Date.now()), ($[1] = ke));
  else ke = $[1];
  let Re = R(ke),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    ze;
  if ($[2] !== ee || $[3] !== noteRefused || $[4] !== refusedWithin)
    ((ze = function Xe() {
      if (isWithinRecentInput(ee, Re.current, So) || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[2] = ee),
      ($[3] = noteRefused),
      ($[4] = refusedWithin),
      ($[5] = ze));
  else ze = $[5];
  let Xe = ze,
    rt;
  if ($[6] !== answer || $[7] !== Xe)
    ((rt = function At(kt) {
      if (Xe()) {
        return;
      }
      answer(kt);
    }),
      ($[6] = answer),
      ($[7] = Xe),
      ($[8] = rt));
  else rt = $[8];
  let At = rt,
    It = settleKey(epoch, So),
    Ot;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((Ot = e(Text, {
      children:
        "This task could use your Chrome browser. The Claude in Chrome extension lets Claude navigate sites, click buttons, and fill forms in your existing session.",
    })),
      ($[9] = Ot));
  else Ot = $[9];
  let Et;
  if ($[10] !== At) ((Et = () => At("cancelled")), ($[10] = At), ($[11] = Et));
  else Et = $[11];
  let Dt;
  if ($[12] !== At || $[13] !== It.remountKey || $[14] !== Xe || $[15] !== Et)
    ((Dt = e(PermissionDialog_2, {
      color: "permission",
      title: "Claude wants to use your browser",
      children: r(Box, {
        flexDirection: "column",
        marginTop: 1,
        paddingX: 1,
        children: [
          Ot,
          e(Box, {
            marginTop: 1,
            children: e(
              ModelSelector,
              {
                hideIndexes: !0,
                selectedValue: NO_COMMITTED_ROW,
                refuseInput: Xe,
                defaultFocusValue: "not_now",
                options: CHROME_EXTENSION_PROMPT_OPTIONS,
                onChange: At,
                onCancel: Et,
              },
              It.remountKey,
            ),
          }),
        ],
      }),
    })),
      ($[12] = At),
      ($[13] = It.remountKey),
      ($[14] = Xe),
      ($[15] = Et),
      ($[16] = Dt));
  else Dt = $[16];
  return Dt;
}
//@ chunk-18hwfzwa.js:1344083-1344087 placement
j();

export { ChromeSetupDialog, ChromeInstallFlow };
