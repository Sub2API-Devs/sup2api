/**
 * components/ClaudeMdExternalIncludesDialog.tsx
 *
 * CLAUDE.md 或 .claude/rules 引用工作目录外文件时的允许确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClaudeMdExternalIncludesDialog.tsx
 * pieces: chunk-e6aww6q8.js (1), chunk-jz0q3n7b.js (5)
 * attribution: fingerprint 2, placement 1, file-last-pair 1, facade-exports 2
 */
import { j, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { hr } from "../utils/invisibleChars.js";
import { saveCurrentProjectConfig, getCurrentProjectConfig } from "../utils/config.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { yce } from "./permissions/wrapWidth.js";
import { Dialog } from "./design-system/Dialog.js";
import { plural } from "../utils/stringUtils.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { hasExternalClaudeMdIncludes, getMemoryFilesCached } from "../utils/claudemd.js";

//@ chunk-jz0q3n7b.js:746-750 placement
j();
//@ chunk-jz0q3n7b.js:750-810 fingerprint = _temp (1)
function me() {
  logEvent("tengu_claude_md_includes_dialog_shown", {});
}
//@ chunk-jz0q3n7b.js:810-909 file-last-pair
function ge(include, i) {
  return r(Text, { dimColor: !0, wrap: "truncate-middle", children: ["  ", hr(include.path)] }, i);
}
//@ chunk-jz0q3n7b.js:909-1153 facade-exports = _temp2 (0.486)
function recordExternalIncludesDecision(g, h, o) {
  (saveCurrentProjectConfig(
    (l) => ({ ...l, hasClaudeMdExternalIncludesApproved: g, hasClaudeMdExternalIncludesWarningShown: !0 }),
    o,
  ),
    logEvent(
      g
        ? "tengu_claude_md_external_includes_dialog_accepted"
        : "tengu_claude_md_external_includes_dialog_declined",
      { source: fromEnum(h) },
    ));
}
/**
 * 外部 CLAUDE.md 引用确认：列出工作目录外被 @ 引用的文件，允许或拒绝（记录 tengu_claude_md_external_includes_dialog_*）。
 */
//@ chunk-jz0q3n7b.js:1153-3617 facade-exports = ClaudeMdExternalIncludesDialog (0.44)
function ClaudeMdExternalIncludesDialog(t0) {
  let $ = w(37),
    { onDone: onDone, isStandaloneDialog: isStandaloneDialog, externalIncludes: externalIncludes } = t0,
    { storageV5: storageV5 } = Me(),
    G;
  if ($[0] === MEMO_CACHE_SENTINEL) ((G = []), ($[0] = G));
  else G = $[0];
  P(me, G);
  let d = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    z;
  if ($[1] !== d || $[2] !== noteRefused || $[3] !== refusedWithin)
    ((z = function I() {
      if (d() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[1] = d),
      ($[2] = noteRefused),
      ($[3] = refusedWithin),
      ($[4] = z));
  else z = $[4];
  let I = z,
    k = useMountTime(),
    L = settleKey(epoch),
    H;
  if ($[5] !== externalIncludes) ((H = externalIncludes ?? []), ($[5] = externalIncludes), ($[6] = H));
  else H = $[6];
  let f = H,
    J;
  if ($[7] !== f) ((J = f.length <= yce ? f : f.slice(0, yce - 2)), ($[7] = f), ($[8] = J));
  else J = $[8];
  let Q = J,
    sliced = f.slice(Q.length),
    X = R(!1),
    ee;
  if (
    $[9] !== d ||
    $[10] !== noteRefused ||
    $[11] !== onDone ||
    $[12] !== refusedWithin ||
    $[13] !== storageV5
  )
    ((ee = (value) => {
      if (d() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (X.current) {
        return;
      }
      ((X.current = !0), recordExternalIncludesDecision(value === "yes", "dialog", storageV5), onDone());
    }),
      ($[9] = d),
      ($[10] = noteRefused),
      ($[11] = onDone),
      ($[12] = refusedWithin),
      ($[13] = storageV5),
      ($[14] = ee));
  else ee = $[14];
  let i = ee,
    te;
  if ($[15] !== i)
    ((te = () => {
      i("no");
    }),
      ($[15] = i),
      ($[16] = te));
  else te = $[16];
  let M = te;
  const B = Dialog,
    xe = "Allow external CLAUDE.md file imports?",
    Ce = "warning",
    t4 = !isStandaloneDialog,
    t5 = !isStandaloneDialog;
  let y;
  if ($[17] === MEMO_CACHE_SENTINEL)
    ((y = e(Text, {
      children:
        "This project's CLAUDE.md or .claude/rules imports files outside the current working directory. Never allow this for third-party repositories.",
    })),
      ($[17] = y));
  else y = $[17];
  const F =
    externalIncludes &&
    externalIncludes.length > 0 &&
    r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { dimColor: !0, children: "External imports:" }),
        Q.map(ge),
        sliced.length > 0
          ? r(Fragment, {
              children: [
                r(Text, {
                  dimColor: !0,
                  wrap: "truncate",
                  children: [
                    "  ",
                    "\u2026 +",
                    sliced.length,
                    " ",
                    plural(sliced.length, "import"),
                    " not shown.",
                  ],
                }),
                r(Text, {
                  dimColor: !0,
                  wrap: "truncate",
                  children: ["  ", "Yes covers those too, plus any this project adds later."],
                }),
              ],
            })
          : null,
      ],
    });
  let oe;
  if ($[18] === MEMO_CACHE_SENTINEL)
    ((oe = r(Text, {
      dimColor: !0,
      children: [
        "Important: Only use Claude Code with files you trust. Accessing untrusted files may pose security risks",
        " ",
        e(Link, { url: "https://code.claude.com/docs/en/security" }),
        " ",
      ],
    })),
      ($[18] = oe));
  else oe = $[18];
  let x, C;
  if ($[19] !== i) ((x = () => i("yes")), (C = () => i("no")), ($[19] = i), ($[20] = x), ($[21] = C));
  else ((x = $[20]), (C = $[21]));
  let D;
  if ($[22] !== L.remountKey || $[23] !== I || $[24] !== k || $[25] !== x || $[26] !== C)
    ((D = e(
      ConfirmSelect,
      {
        refuseInput: I,
        openedAt: k,
        hideIndexes: !0,
        confirmLabel: "Yes, allow external imports",
        cancelLabel: "No, disable external imports",
        cancelFirst: !0,
        focus: "cancel",
        onConfirm: x,
        onCancel: C,
      },
      L.remountKey,
    )),
      ($[22] = L.remountKey),
      ($[23] = I),
      ($[24] = k),
      ($[25] = x),
      ($[26] = C),
      ($[27] = D));
  else D = $[27];
  let ne;
  if (
    $[28] !== B ||
    $[29] !== M ||
    $[30] !== isStandaloneDialog ||
    $[31] !== t5 ||
    $[32] !== y ||
    $[33] !== F ||
    $[34] !== D ||
    $[35] !== t4
  )
    ((ne = r(B, {
      title: xe,
      color: Ce,
      onCancel: M,
      exitOnCtrlCD: isStandaloneDialog,
      hideBorder: t4,
      hideInputGuide: t5,
      children: [y, F, oe, D],
    })),
      ($[28] = B),
      ($[29] = M),
      ($[30] = isStandaloneDialog),
      ($[31] = t5),
      ($[32] = y),
      ($[33] = F),
      ($[34] = D),
      ($[35] = t4),
      ($[36] = ne));
  else ne = $[36];
  return ne;
}
/**
 * 尚未批准或提示过、且 CLAUDE.md 引用了外部文件时返回 true。
 */
//@ chunk-e6aww6q8.js:1353129-1353286 fingerprint = _temp3 (1)
async function shouldShowExternalIncludesDialog(e, n) {
  let r = getCurrentProjectConfig();
  if (r.hasClaudeMdExternalIncludesApproved || r.hasClaudeMdExternalIncludesWarningShown) return !1;
  return hasExternalClaudeMdIncludes(await getMemoryFilesCached(e, !0, n));
}

export { shouldShowExternalIncludesDialog, recordExternalIncludesDecision, ClaudeMdExternalIncludesDialog };
