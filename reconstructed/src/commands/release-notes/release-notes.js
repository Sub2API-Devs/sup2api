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
import { init_react_production, R } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { plural } from "../../utils/stringUtils.js";
import { semverGte } from "../../utils/semver.js";
import { createSystemMessage } from "../../utils/messages.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  fetchAndStoreChangelog,
  readChangelog,
  sortedReleaseNotes,
  CHANGELOG_URL_2,
} from "../../utils/releaseNotes.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-8k62p17d.js:13460-13464 sole-consumer
init_react_production();
//@ chunk-8k62p17d.js:13464-13575 sole-consumer
function renderVersionItem(i) {
  let [E, H] = i;
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: `Version ${E}`,
      meta: [`${H.length} ${plural(H.length, "item")}`],
    },
    E,
  );
}
//@ chunk-8k62p17d.js:13575-13667 fingerprint = formatReleaseNotes (1)
function formatReleaseNotes(version, notes) {
  let header = `Version ${version}:`;
  let bulletPoints = notes.map((note) => `\xB7 ${note}`).join(`
`);
  return `${header}
${bulletPoints}`;
}
//@ chunk-8k62p17d.js:13667-13760 layout
function sortReleaseNotes(notes) {
  return notes
    .slice()
    .sort(([t], [o]) => (semverGte(t, o) ? 1 : -1))
    .map(([version, notes]) => formatReleaseNotes(version, notes)).join(`

`);
}
//@ chunk-8k62p17d.js:13760-13850 layout
function showReleaseNotesNotice(i, applyMessageOp, onDone) {
  applyMessageOp({
    type: "append",
    messages: [createSystemMessage(i, "notice")],
  });
  onDone(undefined, {
    display: "skip",
  });
}
//@ chunk-8k62p17d.js:13850-14148 fingerprint = call (0.741)
/**
 * /release-notes 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) => {
  try {
    await withTimeout(fetchAndStoreChangelog(context.storageV5), 500, "Timeout");
  } catch {}
  let changelogContent = await readChangelog(context.storageV5);
  let sorted = sortedReleaseNotes(changelogContent)
    .slice()
    .sort(([p], [l]) => (semverGte(p, l) ? -1 : 1));
  if (sorted.length === 0) {
    showReleaseNotesNotice(`See the full changelog at: ${CHANGELOG_URL_2}`, context.applyMessageOp, onDone);
    return null;
  }
  return jsxProd_default(ReleaseNotesVersionPicker, {
    notes: sorted,
    applyMessageOp: context.applyMessageOp,
    onDone,
  });
};
//@ chunk-8k62p17d.js:14148-15247 sole-consumer
/**
 * /release-notes 的版本选择对话框：列出"Show all"与各版本（条目数），选择后显示对应的更新说明，取消则跳过。
 */
function ReleaseNotesVersionPicker(props) {
  let $ = w(20);
  let { notes, applyMessageOp, onDone } = props;
  let p = R(false);
  let b;
  if ($[0] !== applyMessageOp || $[1] !== notes || $[2] !== onDone) {
    b = function d(N) {
      if (p.current) {
        return;
      }
      p.current = true;
      if (N === 0) {
        showReleaseNotesNotice(sortReleaseNotes(notes), applyMessageOp, onDone);
        return;
      }
      let D = notes[N - 1];
      if (!D) {
        onDone(undefined, {
          display: "skip",
        });
        return;
      }
      showReleaseNotesNotice(formatReleaseNotes(D[0], D[1]), applyMessageOp, onDone);
    };
    $[0] = applyMessageOp;
    $[1] = notes;
    $[2] = onDone;
    $[3] = b;
  } else b = $[3];
  let onSelect = b;
  let T;
  if ($[4] !== onDone) {
    T = function f() {
      p.current = true;
      onDone(undefined, {
        display: "skip",
      });
    };
    $[4] = onDone;
    $[5] = T;
  } else T = $[5];
  let onCancel = T;
  let B;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Select a version to view its notes.",
      }),
    });
    $[6] = B;
  } else B = $[6];
  const q = notes.length;
  let G;
  if ($[7] !== notes.length) {
    G = plural(notes.length, "version");
    $[7] = notes.length;
    $[8] = G;
  } else G = $[8];
  const A = `${q} ${G}`;
  let y;
  if ($[9] !== A) {
    y = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Show all",
        meta: [A],
      },
      "show-all",
    );
    $[9] = A;
    $[10] = y;
  } else y = $[10];
  let u;
  if ($[11] !== notes) {
    u = notes.map(renderVersionItem);
    $[11] = notes;
    $[12] = u;
  } else u = $[12];
  let h;
  if ($[13] !== onSelect || $[14] !== y || $[15] !== u) {
    h = jsxProd_default_2(OrderedListWithItem, {
      onSelect,
      children: [y, u],
    });
    $[13] = onSelect;
    $[14] = y;
    $[15] = u;
    $[16] = h;
  } else h = $[16];
  let I;
  if ($[17] !== onCancel || $[18] !== h) {
    I = jsxProd_default_2(Dialog, {
      title: "Release notes",
      onCancel,
      children: [B, h],
    });
    $[17] = onCancel;
    $[18] = h;
    $[19] = I;
  } else I = $[19];
  return I;
}
