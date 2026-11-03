/**
 * commands/release-notes/release-notes.ts
 *
 * /release-notes 实现：拉取或读取缓存的更新日志并格式化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/release-notes/release-notes.ts
 * pieces: chunk-8k62p17d.js (7)
 * attribution: sole-consumer 3, fingerprint 2, layout 2
 */
import { j, R } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { plural } from "../../utils/stringUtils.js";
import { gt } from "../../utils/semver.js";
import { createSystemMessage } from "../../utils/messages.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  fetchAndStoreChangelog,
  readChangelog,
  sortedReleaseNotes,
  CHANGELOG_URL,
} from "../../utils/releaseNotes.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-8k62p17d.js:13460-13464 sole-consumer
j();
//@ chunk-8k62p17d.js:13464-13575 sole-consumer
function renderVersionItem(i) {
  let [E, H] = i;
  return e(
    OrderedListWithItem.Item,
    { label: `Version ${E}`, meta: [`${H.length} ${plural(H.length, "item")}`] },
    E,
  );
}
//@ chunk-8k62p17d.js:13575-13667 fingerprint = formatReleaseNotes (1)
function formatReleaseNotes(i, t) {
  let header = `Version ${i}:`,
    joined = t.map((note) => `\xB7 ${note}`).join(`
`);
  return `${header}
${joined}`;
}
//@ chunk-8k62p17d.js:13667-13760 layout
function x(i) {
  return i
    .slice()
    .sort(([t], [o]) => (gt(t, o) ? 1 : -1))
    .map(([t, o]) => formatReleaseNotes(t, o)).join(`

`);
}
//@ chunk-8k62p17d.js:13760-13850 layout
function showReleaseNotesNotice(i, t, o) {
  (t({ type: "append", messages: [createSystemMessage(i, "notice")] }), o(void 0, { display: "skip" }));
}
/**
 * /release-notes 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-8k62p17d.js:13850-14148 fingerprint = call (0.741)
var call = async (onDone, context) => {
  try {
    await withTimeout(fetchAndStoreChangelog(context.storageV5), 500, "Timeout");
  } catch {}
  let o = await readChangelog(context.storageV5),
    sorted = sortedReleaseNotes(o)
      .slice()
      .sort(([p], [l]) => (gt(p, l) ? -1 : 1));
  if (sorted.length === 0)
    return (
      showReleaseNotesNotice(`See the full changelog at: ${CHANGELOG_URL}`, context.applyMessageOp, onDone),
      null
    );
  return e(ReleaseNotesVersionPicker, {
    notes: sorted,
    applyMessageOp: context.applyMessageOp,
    onDone: onDone,
  });
};
/**
 * /release-notes 的版本选择对话框：列出"Show all"与各版本（条目数），选择后显示对应的更新说明，取消则跳过。
 */
//@ chunk-8k62p17d.js:14148-15247 sole-consumer
function ReleaseNotesVersionPicker(props) {
  let $ = w(20),
    { notes: notes, applyMessageOp: applyMessageOp, onDone: onDone } = props,
    p = R(!1),
    b;
  if ($[0] !== applyMessageOp || $[1] !== notes || $[2] !== onDone)
    ((b = function d(N) {
      if (p.current) {
        return;
      }
      if (((p.current = !0), N === 0)) {
        showReleaseNotesNotice(x(notes), applyMessageOp, onDone);
        return;
      }
      let D = notes[N - 1];
      if (!D) {
        onDone(void 0, { display: "skip" });
        return;
      }
      showReleaseNotesNotice(formatReleaseNotes(D[0], D[1]), applyMessageOp, onDone);
    }),
      ($[0] = applyMessageOp),
      ($[1] = notes),
      ($[2] = onDone),
      ($[3] = b));
  else b = $[3];
  let d = b,
    T;
  if ($[4] !== onDone)
    ((T = function f() {
      ((p.current = !0), onDone(void 0, { display: "skip" }));
    }),
      ($[4] = onDone),
      ($[5] = T));
  else T = $[5];
  let f = T,
    B;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((B = e(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: e(Text, { dimColor: !0, children: "Select a version to view its notes." }),
    })),
      ($[6] = B));
  else B = $[6];
  const q = notes.length;
  let G;
  if ($[7] !== notes.length) ((G = plural(notes.length, "version")), ($[7] = notes.length), ($[8] = G));
  else G = $[8];
  const A = `${q} ${G}`;
  let y;
  if ($[9] !== A)
    ((y = e(OrderedListWithItem.Item, { label: "Show all", meta: [A] }, "show-all")),
      ($[9] = A),
      ($[10] = y));
  else y = $[10];
  let u;
  if ($[11] !== notes) ((u = notes.map(renderVersionItem)), ($[11] = notes), ($[12] = u));
  else u = $[12];
  let h;
  if ($[13] !== d || $[14] !== y || $[15] !== u)
    ((h = r(OrderedListWithItem, { onSelect: d, children: [y, u] })),
      ($[13] = d),
      ($[14] = y),
      ($[15] = u),
      ($[16] = h));
  else h = $[16];
  let I;
  if ($[17] !== f || $[18] !== h)
    ((I = r(Dialog, { title: "Release notes", onCancel: f, children: [B, h] })),
      ($[17] = f),
      ($[18] = h),
      ($[19] = I));
  else I = $[19];
  return I;
}
