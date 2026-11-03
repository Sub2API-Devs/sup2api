/**
 * components/diff/DiffDialog.tsx
 *
 * /diff 对话框：当前工作区 diff 与每回合 diff（turn）切换，文件列表与详情两级视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffDialog.tsx
 * pieces: chunk-mtx4csef.js (3)
 * attribution: fingerprint 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { wt } from "../../remote/remoteMode.js";
import { useWorkspaceDiff } from "../../hooks/useWorkspaceDiff.js";
import { useTurnDiffs } from "../../hooks/useTurnDiffs.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { fTe } from "../ScrollViewportContext.js";
import { jumpBy } from "../ScrollKeybindingHandler.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useRegisterKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { DiffStatCounts } from "../PrBadge.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { DiffFileList } from "./_new/DiffFileList.js";
import { DiffDetailView } from "./DiffDetailView.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-mtx4csef.js:19087-19131 fingerprint = _temp (1)
function si(turn) {
  return { type: "turn", turn: turn };
}
//@ chunk-mtx4csef.js:19131-19619 fingerprint = turnDiffToDiffData (0.851)
function turnDiffToDiffData(turn) {
  let files = Array.from(turn.files.values())
      .map((t) => ({
        path: t.filePath,
        linesAdded: t.linesAdded,
        linesRemoved: t.linesRemoved,
        isBinary: !1,
        isLargeFile: !1,
        isTruncated: !1,
        isNewFile: t.isNewFile,
      }))
      .sort((t, u) => t.path.localeCompare(u.path)),
    hunks = new Map();
  for (let t of turn.files.values()) hunks.set(t.filePath, t.hunks);
  return {
    stats: {
      filesCount: turn.stats.filesChanged,
      linesAdded: turn.stats.linesAdded,
      linesRemoved: turn.stats.linesRemoved,
    },
    files: files,
    hunks: hunks,
    loading: !1,
    source: { kind: "working-tree" },
    baseMode: "auto",
  };
}
//@ chunk-mtx4csef.js:19619-25927 fingerprint = DiffDialog (0.557)
function DiffDialog(t0) {
  let $ = w(83),
    { messages: messages, onDone: onDone } = t0,
    u;
  if ($[0] === MEMO_CACHE_SENTINEL) ((u = wt()), ($[0] = u));
  else u = $[0];
  let { data: l, notice: notice } = useWorkspaceDiff(u),
    turnDiffs = useTurnDiffs(messages),
    [d, U] = y("list"),
    [g, D] = y(0),
    L;
  if ($[1] === MEMO_CACHE_SENTINEL) ((L = { source: 0, index: 0, mount: 0 }), ($[1] = L));
  else L = $[1];
  let [b, J] = y(L),
    V = b.source === g ? b.index : 0,
    Ke;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Ke = { type: "current" }), ($[2] = Ke));
  else Ke = $[2];
  let _e;
  if ($[3] !== turnDiffs) ((_e = [Ke, ...turnDiffs.map(si)]), ($[3] = turnDiffs), ($[4] = _e));
  else _e = $[4];
  let p = _e,
    qe = p[g],
    v = qe?.type === "turn" ? qe.turn : null,
    Je;
  if ($[5] !== v || $[6] !== l) ((Je = v ? turnDiffToDiffData(v) : l), ($[5] = v), ($[6] = l), ($[7] = Je));
  else Je = $[7];
  let c = Je,
    f = c.files[V],
    Qe;
  if ($[8] !== c.hunks || $[9] !== f)
    ((Qe = f ? c.hunks.get(f.path) || [] : []), ($[8] = c.hunks), ($[9] = f), ($[10] = Qe));
  else Qe = $[10];
  let de = Qe,
    Xe,
    Ye;
  if ($[11] !== g || $[12] !== p.length)
    ((Xe = () => {
      if (g >= p.length) D(Math.max(0, p.length - 1));
    }),
      (Ye = [p.length, g]),
      ($[11] = g),
      ($[12] = p.length),
      ($[13] = Xe),
      ($[14] = Ye));
  else ((Xe = $[13]), (Ye = $[14]));
  (P(Xe, Ye), useRegisterOverlay("diff-dialog"));
  let ue = fTe(),
    Ze;
  if ($[15] !== ue?.handle || $[16] !== d)
    ((Ze = function M(ni) {
      let I = ue?.handle;
      if (d !== "detail" || !I) {
        return !1;
      }
      let max = Math.max(1, Math.floor(I.getViewportHeight() / 2));
      let max_2 = Math.max(1, I.getViewportHeight());
      Xi: switch (ni) {
        case "up": {
          I.scrollBy(-1);
          break Xi;
        }
        case "down": {
          I.scrollBy(1);
          break Xi;
        }
        case "pageUp": {
          jumpBy(I, -max, !1);
          break Xi;
        }
        case "pageDown": {
          jumpBy(I, max, !1);
          break Xi;
        }
        case "fullPageUp": {
          jumpBy(I, -max_2, !1);
          break Xi;
        }
        case "fullPageDown": {
          jumpBy(I, max_2, !1);
          break Xi;
        }
        case "top": {
          I.scrollTo(0);
          break Xi;
        }
        case "bottom": {
          I.scrollToBottom();
        }
      }
    }),
      ($[15] = ue?.handle),
      ($[16] = d),
      ($[17] = Ze));
  else Ze = $[17];
  let M = Ze,
    it,
    rt;
  if ($[18] !== p.length || $[19] !== d)
    ((it = () => {
      if (d === "list" && p.length > 1) D((oi) => (oi - 1 + p.length) % p.length);
    }),
      (rt = () => {
        if (d === "list" && p.length > 1) D((li) => (li + 1) % p.length);
      }),
      ($[18] = p.length),
      ($[19] = d),
      ($[20] = it),
      ($[21] = rt));
  else ((it = $[20]), (rt = $[21]));
  let st;
  if ($[22] !== d)
    ((st = () => {
      if (d === "detail") U("list");
    }),
      ($[22] = d),
      ($[23] = st));
  else st = $[23];
  let nt, ot, lt, at, ct, dt, ut, ft;
  if ($[24] !== M)
    ((nt = () => M("up")),
      (ot = () => M("down")),
      (lt = () => M("pageUp")),
      (at = () => M("pageDown")),
      (ct = () => M("fullPageUp")),
      (dt = () => M("fullPageDown")),
      (ut = () => M("top")),
      (ft = () => M("bottom")),
      ($[24] = M),
      ($[25] = nt),
      ($[26] = ot),
      ($[27] = lt),
      ($[28] = at),
      ($[29] = ct),
      ($[30] = dt),
      ($[31] = ut),
      ($[32] = ft));
  else
    ((nt = $[25]),
      (ot = $[26]),
      (lt = $[27]),
      (at = $[28]),
      (ct = $[29]),
      (dt = $[30]),
      (ut = $[31]),
      (ft = $[32]));
  let mt;
  if ($[33] === MEMO_CACHE_SENTINEL) ((mt = { context: "DiffDialog" }), ($[33] = mt));
  else mt = $[33];
  (MessageActionsKeybindings(
    {
      "diff:dismiss": W,
      "diff:previousSource": it,
      "diff:nextSource": rt,
      "diff:back": st,
      "diff:previousFile": nt,
      "diff:nextFile": ot,
      "scroll:pageUp": lt,
      "scroll:pageDown": at,
      "scroll:fullPageUp": ct,
      "scroll:fullPageDown": dt,
      "scroll:top": ut,
      "scroll:bottom": ft,
    },
    mt,
  ),
    useRegisterKeybindingContext("DiffDialog"));
  let ht;
  if ($[34] !== c.files.length || $[35] !== g)
    ((ht = (prev_2) =>
      J((X) => {
        let gt = X.source === g ? X.index : 0;
        let max = Math.max(0, Math.min(c.files.length - 1, gt + prev_2));
        if (max === gt) {
          return X;
        }
        return { source: g, index: max, mount: X.mount + 1 };
      })),
      ($[34] = c.files.length),
      ($[35] = g),
      ($[36] = ht));
  else ht = $[36];
  let Y = ht,
    xt;
  if ($[37] !== Y)
    ((xt = { "diff:previousFile": () => Y(-1), "diff:nextFile": () => Y(1) }), ($[37] = Y), ($[38] = xt));
  else xt = $[38];
  const fe = d === "list";
  let yt;
  if ($[39] !== fe) ((yt = { context: "Select", isActive: fe }), ($[39] = fe), ($[40] = yt));
  else yt = $[40];
  MessageActionsKeybindings(xt, yt);
  let Tt;
  if ($[41] !== c.stats)
    ((Tt = c.stats
      ? r(Text, {
          dimColor: !0,
          children: [
            c.stats.filesCount,
            " ",
            plural(c.stats.filesCount, "file"),
            " ",
            "changed",
            " ",
            e(DiffStatCounts, { added: c.stats.linesAdded, removed: c.stats.linesRemoved }),
          ],
        })
      : null),
      ($[41] = c.stats),
      ($[42] = Tt));
  else Tt = $[42];
  let me = Tt,
    vt = !v && c.noCommits === !0,
    ci = !v && c.source.kind === "branch",
    pe = v
      ? `Turn ${v.turnIndex}`
      : vt
        ? "Staged and new files"
        : ci
          ? "Branch changes"
          : "Uncommitted changes",
    Z = v
      ? v.userPromptPreview
        ? `"${v.userPromptPreview}"`
        : ""
      : vt
        ? "(no commits yet)"
        : c.source.kind === "branch"
          ? `(vs ${c.source.baseBranch})`
          : "(git diff HEAD)",
    z;
  Yi: {
    if (v) {
      z = "No file changes in this turn";
      break Yi;
    }
    if (notice) {
      z = notice;
      break Yi;
    }
    if (c.stats && c.stats.filesCount > 0 && c.files.length === 0) {
      z = "Too many files to display details";
      break Yi;
    }
    z = "No changes yet";
  }
  let he = z,
    ee;
  if ($[43] !== Z) ((ee = Z && r(Text, { dimColor: !0, children: [" ", Z] })), ($[43] = Z), ($[44] = ee));
  else ee = $[44];
  let Ft;
  if ($[45] !== pe || $[46] !== ee)
    ((Ft = r(Text, { children: [pe, ee] })), ($[45] = pe), ($[46] = ee), ($[47] = Ft));
  else Ft = $[47];
  let ge = Ft;
  function W() {
    if (d === "detail") U("list");
    else onDone("Diff dialog dismissed", { display: "system" });
  }
  let te;
  if (
    $[48] !== c.files ||
    $[49] !== c.loading ||
    $[50] !== he ||
    $[51] !== b.mount ||
    $[52] !== f?.isBinary ||
    $[53] !== f?.isLargeFile ||
    $[54] !== f?.isRestricted ||
    $[55] !== f?.isTruncated ||
    $[56] !== f?.isUntracked ||
    $[57] !== f?.path ||
    $[58] !== de ||
    $[59] !== V ||
    $[60] !== g ||
    $[61] !== d
  )
    ((te =
      c.files.length === 0
        ? c.loading
          ? e(WorkerBadge, { message: "Loading diff\u2026", dimColor: !0 })
          : e(Text, { dimColor: !0, children: he })
        : d === "list"
          ? e(Box, {
              flexDirection: "column",
              children: e(
                DiffFileList,
                {
                  files: c.files,
                  defaultFocusIndex: V,
                  resetKey: g,
                  onFocus: (di) => J((ui) => ({ ...ui, source: g, index: di })),
                  onSelect: () => U("detail"),
                },
                b.mount,
              ),
            })
          : e(Box, {
              flexDirection: "column",
              children: e(DiffDetailView, {
                filePath: f?.path || "",
                hunks: de,
                isLargeFile: f?.isLargeFile,
                isBinary: f?.isBinary,
                isTruncated: f?.isTruncated,
                isUntracked: f?.isUntracked,
                isRestricted: f?.isRestricted,
              }),
            })),
      ($[48] = c.files),
      ($[49] = c.loading),
      ($[50] = he),
      ($[51] = b.mount),
      ($[52] = f?.isBinary),
      ($[53] = f?.isLargeFile),
      ($[54] = f?.isRestricted),
      ($[55] = f?.isTruncated),
      ($[56] = f?.isUntracked),
      ($[57] = f?.path),
      ($[58] = de),
      ($[59] = V),
      ($[60] = g),
      ($[61] = d),
      ($[62] = te));
  else te = $[62];
  let Pt;
  if ($[63] !== me || $[64] !== te)
    ((Pt = r(Box, { flexDirection: "column", gap: 1, children: [me, te] })),
      ($[63] = me),
      ($[64] = te),
      ($[65] = Pt));
  else Pt = $[65];
  let De = Pt;
  const fi = W;
  let ie;
  if ($[66] !== p.length || $[67] !== d)
    ((ie =
      d === "list"
        ? r(Byline, {
            children: [
              p.length > 1 && e(KeyboardShortcutHint, { chord: ["left", "right"], action: "switch source" }),
              e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" }),
              e(KeyboardShortcutHint, { chord: "enter", action: "view" }),
              e(ConfigurableShortcutHint, {
                action: "diff:dismiss",
                context: "DiffDialog",
                fallback: "Esc",
                description: "close",
              }),
            ],
          })
        : r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: ["up", "down"], action: "scroll" }),
              e(ConfigurableShortcutHint, {
                action: "diff:dismiss",
                context: "DiffDialog",
                fallback: "Esc",
                description: "back",
              }),
            ],
          })),
      ($[66] = p.length),
      ($[67] = d),
      ($[68] = ie));
  else ie = $[68];
  const xe = p.length <= 1,
    ye = String(g);
  let kt;
  if ($[69] === MEMO_CACHE_SENTINEL) ((kt = (exitState) => D(Number(exitState))), ($[69] = kt));
  else kt = $[69];
  const Te = d === "detail";
  let re;
  if ($[70] !== De || $[71] !== p)
    ((re = p.map((bt, It) =>
      e(
        Tab,
        { id: String(It), title: bt.type === "current" ? "Current" : `T${bt.turn.turnIndex}`, children: De },
        It,
      ),
    )),
      ($[70] = De),
      ($[71] = p),
      ($[72] = re));
  else re = $[72];
  let se;
  if ($[73] !== xe || $[74] !== ye || $[75] !== Te || $[76] !== re)
    ((se = e(Tabs, {
      title: null,
      hidden: xe,
      selectedTab: ye,
      onTabChange: kt,
      disableNavigation: Te,
      children: re,
    })),
      ($[73] = xe),
      ($[74] = ye),
      ($[75] = Te),
      ($[76] = re),
      ($[77] = se));
  else se = $[77];
  let Rt;
  if ($[78] !== W || $[79] !== ie || $[80] !== se || $[81] !== ge)
    ((Rt = e(Dialog, { title: ge, onCancel: fi, color: "background", inputGuide: ie, children: se })),
      ($[78] = W),
      ($[79] = ie),
      ($[80] = se),
      ($[81] = ge),
      ($[82] = Rt));
  else Rt = $[82];
  return Rt;
}
