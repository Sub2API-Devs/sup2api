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
import { init_react_production, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { stripInvisibleChars } from "../utils/invisibleChars.js";
import { saveCurrentProjectConfig, getCurrentProjectConfig } from "../utils/config.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { MAX_VISIBLE_ITEMS } from "./permissions/wrapWidth.js";
import { Dialog } from "./design-system/Dialog.js";
import { plural } from "../utils/stringUtils.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { hasExternalClaudeMdIncludes, getMemoryFilesCached } from "../utils/claudemd.js";

//@ chunk-jz0q3n7b.js:746-750 placement
init_react_production();
//@ chunk-jz0q3n7b.js:750-810 fingerprint = _temp (1)
function logClaudeMdIncludesShown() {
  logEvent("tengu_claude_md_includes_dialog_shown", {});
}
//@ chunk-jz0q3n7b.js:810-909 file-last-pair
function renderIncludePath(include, i) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      wrap: "truncate-middle",
      children: ["  ", stripInvisibleChars(include.path)],
    },
    i,
  );
}
//@ chunk-jz0q3n7b.js:909-1153 facade-exports = _temp2 (0.486)
function recordExternalIncludesDecision(g, h, storageV5) {
  saveCurrentProjectConfig(
    (l) => ({
      ...l,
      hasClaudeMdExternalIncludesApproved: g,
      hasClaudeMdExternalIncludesWarningShown: true,
    }),
    storageV5,
  );
  logEvent(
    g
      ? "tengu_claude_md_external_includes_dialog_accepted"
      : "tengu_claude_md_external_includes_dialog_declined",
    {
      source: fromEnum(h),
    },
  );
}
//@ chunk-jz0q3n7b.js:1153-3617 facade-exports = ClaudeMdExternalIncludesDialog (0.44)
/**
 * 外部 CLAUDE.md 引用确认：列出工作目录外被 @ 引用的文件，允许或拒绝（记录 tengu_claude_md_external_includes_dialog_*）。
 */
function ClaudeMdExternalIncludesDialog(props) {
  let $ = w(37);
  let { onDone, isStandaloneDialog, externalIncludes } = props;
  let { storageV5 } = useTheme_2();
  let G;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    G = [];
    $[0] = G;
  } else G = $[0];
  P(logClaudeMdIncludesShown, G);
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let z;
  if ($[1] !== inputRefusalWindow || $[2] !== noteRefused || $[3] !== refusedWithin) {
    z = function I() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[1] = inputRefusalWindow;
    $[2] = noteRefused;
    $[3] = refusedWithin;
    $[4] = z;
  } else z = $[4];
  let refuseInput = z;
  let openedAt = useMountTime();
  let L = settleKey(epoch);
  let H;
  if ($[5] !== externalIncludes) {
    H = externalIncludes ?? [];
    $[5] = externalIncludes;
    $[6] = H;
  } else H = $[6];
  let f = H;
  let J;
  if ($[7] !== f) {
    J = f.length <= MAX_VISIBLE_ITEMS ? f : f.slice(0, MAX_VISIBLE_ITEMS - 2);
    $[7] = f;
    $[8] = J;
  } else J = $[8];
  let Q = J;
  let sliced = f.slice(Q.length);
  let X = R(false);
  let ee;
  if (
    $[9] !== inputRefusalWindow ||
    $[10] !== noteRefused ||
    $[11] !== onDone ||
    $[12] !== refusedWithin ||
    $[13] !== storageV5
  ) {
    ee = (value) => {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (X.current) {
        return;
      }
      X.current = true;
      recordExternalIncludesDecision(value === "yes", "dialog", storageV5);
      onDone();
    };
    $[9] = inputRefusalWindow;
    $[10] = noteRefused;
    $[11] = onDone;
    $[12] = refusedWithin;
    $[13] = storageV5;
    $[14] = ee;
  } else ee = $[14];
  let i = ee;
  let te;
  if ($[15] !== i) {
    te = () => {
      i("no");
    };
    $[15] = i;
    $[16] = te;
  } else te = $[16];
  let onCancel = te;
  const B = Dialog;
  const title = "Allow external CLAUDE.md file imports?";
  const color = "warning";
  const hideBorder = !isStandaloneDialog;
  const hideInputGuide = !isStandaloneDialog;
  let y;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    y = jsxProd_default(Text, {
      children:
        "This project's CLAUDE.md or .claude/rules imports files outside the current working directory. Never allow this for third-party repositories.",
    });
    $[17] = y;
  } else y = $[17];
  const F =
    externalIncludes &&
    externalIncludes.length > 0 &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "External imports:",
        }),
        Q.map(renderIncludePath),
        sliced.length > 0
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default_2(Text, {
                  dimColor: true,
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
                jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "truncate",
                  children: ["  ", "Yes covers those too, plus any this project adds later."],
                }),
              ],
            })
          : null,
      ],
    });
  let oe;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    oe = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Important: Only use Claude Code with files you trust. Accessing untrusted files may pose security risks",
        " ",
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/security",
        }),
        " ",
      ],
    });
    $[18] = oe;
  } else oe = $[18];
  let onConfirm;
  let onCancel_2;
  if ($[19] !== i) {
    onConfirm = () => i("yes");
    onCancel_2 = () => i("no");
    $[19] = i;
    $[20] = onConfirm;
    $[21] = onCancel_2;
  } else {
    onConfirm = $[20];
    onCancel_2 = $[21];
  }
  let D;
  if (
    $[22] !== L.remountKey ||
    $[23] !== refuseInput ||
    $[24] !== openedAt ||
    $[25] !== onConfirm ||
    $[26] !== onCancel_2
  ) {
    D = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        confirmLabel: "Yes, allow external imports",
        cancelLabel: "No, disable external imports",
        cancelFirst: true,
        focus: "cancel",
        onConfirm,
        onCancel: onCancel_2,
      },
      L.remountKey,
    );
    $[22] = L.remountKey;
    $[23] = refuseInput;
    $[24] = openedAt;
    $[25] = onConfirm;
    $[26] = onCancel_2;
    $[27] = D;
  } else D = $[27];
  let ne;
  if (
    $[28] !== B ||
    $[29] !== onCancel ||
    $[30] !== isStandaloneDialog ||
    $[31] !== hideInputGuide ||
    $[32] !== y ||
    $[33] !== F ||
    $[34] !== D ||
    $[35] !== hideBorder
  ) {
    ne = jsxProd_default_2(B, {
      title,
      color,
      onCancel,
      exitOnCtrlCD: isStandaloneDialog,
      hideBorder,
      hideInputGuide,
      children: [y, F, oe, D],
    });
    $[28] = B;
    $[29] = onCancel;
    $[30] = isStandaloneDialog;
    $[31] = hideInputGuide;
    $[32] = y;
    $[33] = F;
    $[34] = D;
    $[35] = hideBorder;
    $[36] = ne;
  } else ne = $[36];
  return ne;
}
//@ chunk-e6aww6q8.js:1353129-1353286 fingerprint = _temp3 (1)
/**
 * 尚未批准或提示过、且 CLAUDE.md 引用了外部文件时返回 true。
 */
async function shouldShowExternalIncludesDialog(session, storageV5) {
  let currentProjectConfig = getCurrentProjectConfig();
  if (
    currentProjectConfig.hasClaudeMdExternalIncludesApproved ||
    currentProjectConfig.hasClaudeMdExternalIncludesWarningShown
  )
    return false;
  return hasExternalClaudeMdIncludes(await getMemoryFilesCached(session, true, storageV5));
}
export { shouldShowExternalIncludesDialog, recordExternalIncludesDecision, ClaudeMdExternalIncludesDialog };
