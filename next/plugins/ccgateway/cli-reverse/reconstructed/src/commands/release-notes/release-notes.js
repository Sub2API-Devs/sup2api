/**
 * commands/release-notes/release-notes.ts
 *
 * /release-notes 实现：拉取或读取缓存的更新日志并格式化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/release-notes/release-notes.ts
 * pieces: chunk-kvgjd6de.js (7)
 * attribution: sole-consumer 3, fingerprint 2, layout 2
 */
import { init_react_production, useRef } from "../../../vendor/react/cjs/react.production.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-kvgjd6de.js:14636-14640 sole-consumer
init_react_production();
//@ chunk-kvgjd6de.js:14640-14751 sole-consumer
function renderVersionItem(entry) {
  let [version, items] = entry;
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: `Version ${version}`,
      meta: [`${items.length} ${plural(items.length, "item")}`],
    },
    version,
  );
}
//@ chunk-kvgjd6de.js:14751-14843 fingerprint (2.1.88 match: formatReleaseNotes, 1)
function formatReleaseNotes(version, notes) {
  let header = `Version ${version}:`;
  let bulletPoints = notes.map((note) => `\xB7 ${note}`).join(`
`);
  return `${header}
${bulletPoints}`;
}
//@ chunk-kvgjd6de.js:14843-14936 layout
function sortReleaseNotes(notes) {
  return notes
    .slice()
    .sort(([leftVersion], [rightVersion]) => (semverGte(leftVersion, rightVersion) ? 1 : -1))
    .map(([version, notes]) => formatReleaseNotes(version, notes)).join(`

`);
}
//@ chunk-kvgjd6de.js:14936-15026 layout
function showReleaseNotesNotice(notesText, applyMessageOp, onDone) {
  applyMessageOp({
    type: "append",
    messages: [createSystemMessage(notesText, "notice")],
  });
  onDone(undefined, {
    display: "skip",
  });
}
//@ chunk-kvgjd6de.js:15026-15324 fingerprint (2.1.88 match: call, 0.741)
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
    .sort(([leftVersion], [rightVersion]) => (semverGte(leftVersion, rightVersion) ? -1 : 1));
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
//@ chunk-kvgjd6de.js:15324-16423 sole-consumer
/**
 * /release-notes 的版本选择对话框：列出"Show all"与各版本（条目数），选择后显示对应的更新说明，取消则跳过。
 */
function ReleaseNotesVersionPicker(props) {
  let $ = useMemoCache(20);
  let { notes, applyMessageOp, onDone } = props;
  let selectedRef = useRef(false);
  let onSelect;
  if ($[0] !== applyMessageOp || $[1] !== notes || $[2] !== onDone) {
    onSelect = function handleSelect(index) {
      if (selectedRef.current) {
        return;
      }
      selectedRef.current = true;
      if (index === 0) {
        showReleaseNotesNotice(sortReleaseNotes(notes), applyMessageOp, onDone);
        return;
      }
      let entry = notes[index - 1];
      if (!entry) {
        onDone(undefined, {
          display: "skip",
        });
        return;
      }
      showReleaseNotesNotice(formatReleaseNotes(entry[0], entry[1]), applyMessageOp, onDone);
    };
    $[0] = applyMessageOp;
    $[1] = notes;
    $[2] = onDone;
    $[3] = onSelect;
  } else onSelect = $[3];
  let onSelect_2 = onSelect;
  let handleCancel;
  if ($[4] !== onDone) {
    handleCancel = function handleCancel() {
      selectedRef.current = true;
      onDone(undefined, {
        display: "skip",
      });
    };
    $[4] = onDone;
    $[5] = handleCancel;
  } else handleCancel = $[5];
  let onCancel = handleCancel;
  let headerText;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    headerText = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Select a version to view its notes.",
      }),
    });
    $[6] = headerText;
  } else headerText = $[6];
  const versionCount = notes.length;
  let versionWord;
  if ($[7] !== notes.length) {
    versionWord = plural(notes.length, "version");
    $[7] = notes.length;
    $[8] = versionWord;
  } else versionWord = $[8];
  const countLabel = `${versionCount} ${versionWord}`;
  let showAllItem;
  if ($[9] !== countLabel) {
    showAllItem = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Show all",
        meta: [countLabel],
      },
      "show-all",
    );
    $[9] = countLabel;
    $[10] = showAllItem;
  } else showAllItem = $[10];
  let versionItems;
  if ($[11] !== notes) {
    versionItems = notes.map(renderVersionItem);
    $[11] = notes;
    $[12] = versionItems;
  } else versionItems = $[12];
  let list;
  if ($[13] !== onSelect_2 || $[14] !== showAllItem || $[15] !== versionItems) {
    list = jsxProd_default_2(OrderedListWithItem, {
      onSelect: onSelect_2,
      children: [showAllItem, versionItems],
    });
    $[13] = onSelect_2;
    $[14] = showAllItem;
    $[15] = versionItems;
    $[16] = list;
  } else list = $[16];
  let dialog;
  if ($[17] !== onCancel || $[18] !== list) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Release notes",
      onCancel,
      children: [headerText, list],
    });
    $[17] = onCancel;
    $[18] = list;
    $[19] = dialog;
  } else dialog = $[19];
  return dialog;
}
export { ReleaseNotesVersionPicker, call, sortReleaseNotes, formatReleaseNotes };
