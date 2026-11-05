/**
 * commands/copy/copy.tsx
 *
 * /copy 实现：复制最近第 N 条回复或选择其中代码块，写剪贴板或落盘 response.md
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/copy/copy.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-7jxyna5q.js (1), chunk-pnckc079.js (17)
 * attribution: fingerprint 10, sole-consumer 2, affinity 1, layout 5, placement 1
 */
import { join } from "path";
import { mkdir } from "fs/promises";
import { sanitizeModelName } from "../../utils/commitAttribution.js";
import { countCharInString, repeatString, truncateToLength } from "../../utils/stringUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { lexMarkdownWindowed } from "../../utils/doctorContextWarnings.js";
import { marked } from "../../../vendor/marked/lib/marked.esm.js";
import { stripPromptXMLTags, extractTextContent_2 } from "../../utils/messages.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { claudeTempDir } from "../../utils/tempDir.js";
import { readJsonFile_2 } from "../../utils/file.js";
import { setClipboard, getOsc52Utf8Warning } from "../../ink/termio/osc.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { countWhere } from "../../utils/collections.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";

//@ chunk-7jxyna5q.js:213908-213983 fingerprint (2.1.88 match: COPY_DIR, 1)
function getModelFamilyForAttribution(rawModelName) {
  let found = sanitizeModelName.find(([prefix]) => rawModelName.includes(prefix));
  return found ? found[1] : "claude";
}
//@ chunk-5xgkngpb.js:2720923-2721066 fingerprint (2.1.88 match: collectRecentAssistantTexts, 0.708)
function collectRecentAssistantTexts(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg.type === "assistant" && msg.requestId && !msg.isApiErrorMessage) return msg.requestId;
  }
  return;
}
//@ chunk-pnckc079.js:14857-14897 sole-consumer (2.1.88 match: isConnectionError, 1)
function isCodeSegment(err) {
  return err.kind === "code";
}
//@ chunk-pnckc079.js:14897-14926 sole-consumer
function returnSecond(first, second) {
  return second;
}
//@ chunk-pnckc079.js:14926-14966 affinity (2.1.88 match: isConnectionError, 1)
function isCodeSegment_2(err) {
  return err.kind === "code";
}
//@ chunk-pnckc079.js:14966-15016 fingerprint (2.1.88 match: _temp2, 1)
function withCopyFullResponse(c) {
  return {
    ...c,
    copyFullResponse: true,
  };
}
//@ chunk-pnckc079.js:15016-15203 fingerprint (2.1.88 match: _temp, 0.613)
function renderCopyBlockItem(block, index) {
  let blockLines =
    countCharInString(
      block.text,
      `
`,
    ) + 1;
  let lang = block.kind === "quote" ? "quote" : block.lang;
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: blockLabel(block.text),
      meta: [[lang, blockLines > 1 ? `${blockLines} lines` : ""].filter(Boolean).join(", ")],
    },
    index,
  );
}
//@ chunk-pnckc079.js:15203-15271 fingerprint (2.1.88 match: RESPONSE_FILENAME, 0.5)
/**
 * RESPONSE_FILENAME：同旧版。
 */
var RESPONSE_FILENAME = "response.md";
var COPY_FILENAME = "copy.md";
var MAX_LOOKBACK = 20;
var COPY_PICKER_TITLE = "Select content to copy";
//@ chunk-pnckc079.js:15271-15625 fingerprint (2.1.88 match: extractCodeBlocks, 0.374)
function extractCodeBlocks(markdown) {
  let { tokens } = lexMarkdownWindowed(marked, stripPromptXMLTags(markdown));
  let blocks = [];
  let lastBlock;
  for (let token of tokens) {
    if (token.type === "space") continue;
    if (token.type !== "blockquote") {
      lastBlock = undefined;
      if (token.type === "code") {
        let codeToken = token;
        blocks.push({
          kind: "code",
          text: codeToken.text,
          lang: codeToken.lang,
        });
      }
      continue;
    }
    let text = token.text.replace(/^\s*\n/, "").trimEnd();
    if (text === "") continue;
    if (lastBlock)
      lastBlock.text = `${lastBlock.text}

${text}`;
    else {
      lastBlock = {
        kind: "quote",
        text,
      };
      blocks.push(lastBlock);
    }
  }
  return blocks;
}
//@ chunk-pnckc079.js:15625-15681 layout
function tableCellText(cell) {
  return cell.tokens.map((token) => token.raw).join("");
}
//@ chunk-pnckc079.js:15681-16223 layout
/**
 * 把表格数据渲染为 Markdown 表格文本：转义竖线与换行，按显示宽度对齐列（最少 3 列宽），按对齐方式生成分隔行。
 */
function formatMarkdownTable(table) {
  let mapped = [table.header.map(tableCellText), ...table.rows.map((row) => row.map(tableCellText))].map(
    (row) => row.map((cell) => cell.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ")),
  );
  let mapped_2 = mapped[0].map((cell, columnIndex) =>
    Math.max(3, ...mapped.map((row) => bunStringWidth(row[columnIndex] ?? ""))),
  );
  let formatRow = (row) =>
    `| ${row.map((cell, columnIndex) => cell + " ".repeat(Math.max(0, mapped_2[columnIndex] - bunStringWidth(cell)))).join(" | ")} |`;
  let padCell = (width, align) => {
    switch (align) {
      case "center":
        return `:${repeatString("-", width - 2)}:`;
      case "right":
        return `${repeatString("-", width - 1)}:`;
      case "left":
        return `:${repeatString("-", width - 1)}`;
      default:
        return "-".repeat(width);
    }
  };
  let separator = `| ${mapped_2.map((width, columnIndex) => padCell(width, table.align[columnIndex] ?? null)).join(" | ")} |`;
  let [header, ...body] = mapped;
  return [formatRow(header), separator, ...body.map(formatRow)].join(`
`);
}
//@ chunk-pnckc079.js:16223-16504 layout
function normalizeMarkdownTables(markdown) {
  let { tokens } = lexMarkdownWindowed(marked, markdown);
  let rest = markdown;
  let from = 0;
  let to = 0;
  for (let token of tokens) {
    let index = markdown.indexOf(token.raw, from);
    if (index === -1) continue;
    from = index + token.raw.length;
    if (token.type !== "table") continue;
    let trailingNewlines = token.raw.match(/\n*$/)?.[0] ?? "";
    let rewritten = formatMarkdownTable(token) + trailingNewlines;
    rest = rest.slice(0, index + to) + rewritten + rest.slice(index + token.raw.length + to);
    to += rewritten.length - token.raw.length;
  }
  return rest;
}
//@ chunk-pnckc079.js:16504-16733 layout
function recentAssistantTexts(messages) {
  let texts = [];
  for (let i = messages.length - 1; i >= 0 && texts.length < MAX_LOOKBACK; i--) {
    let msg = messages[i];
    if (msg?.type !== "assistant" || msg.isApiErrorMessage) continue;
    let content = msg.message.content;
    if (!Array.isArray(content)) continue;
    let text = extractTextContent_2(
      content,
      `

`,
    );
    if (text) texts.push(text);
  }
  return texts;
}
//@ chunk-pnckc079.js:16733-16839 fingerprint (2.1.88 match: fileExtension, 1)
function fileExtension(lang) {
  if (lang) {
    let sanitized = lang.replace(/[^a-zA-Z0-9]/g, "");
    if (sanitized && sanitized !== "plaintext") return `.${sanitized}`;
  }
  return ".txt";
}
//@ chunk-pnckc079.js:16839-16961 placement (2.1.88 match: copySnapshotToLocal, 0.871)
/**
 * /copy 命令：把文本写入临时目录下的文件并返回路径。
 */
async function writeTempCopyFile(agentType, scope) {
  let tempDir = claudeTempDir();
  let localMemDir = join(tempDir, scope);
  await mkdir(tempDir, {
    recursive: true,
    mode: 448,
  });
  await readJsonFile_2(localMemDir, agentType, {
    encoding: "utf-8",
  });
  return localMemDir;
}
//@ chunk-pnckc079.js:16961-17282 fingerprint (2.1.88 match: copyOrWriteToFile, 0.744)
async function copyOrWriteToFile(text, filename) {
  let raw = await setClipboard(text);
  if (raw) process.stdout.write(raw);
  let lineCount =
    countCharInString(
      text,
      `
`,
    ) + 1;
  let charCount = `Copied to clipboard (${text.length} characters, ${lineCount} lines)`;
  let osc52Warning = getOsc52Utf8Warning(text);
  try {
    let filePath = await writeTempCopyFile(text, filename);
    let notice = osc52Warning
      ? `
\u26A0 ${osc52Warning}; the file below is unaffected`
      : "";
    return `${charCount}${notice}
Also written to ${filePath}`;
  } catch {
    let fallbackNotice = osc52Warning
      ? `
\u26A0 ${osc52Warning}`
      : "";
    return `${charCount}${fallbackNotice}`;
  }
}
//@ chunk-pnckc079.js:17282-20930 fingerprint (2.1.88 match: CopyPicker, 0.705)
function CopyPicker(props) {
  let $ = useMemoCache(54);
  let { fullText, blocks, messageAge, onDone } = props;
  let { storageV5 } = useTheme_2();
  let onCancel;
  if ($[0] !== onDone) {
    onCancel = function handleCancel() {
      onDone("Copy cancelled", {
        display: "system",
      });
    };
    $[0] = onDone;
    $[1] = onCancel;
  } else onCancel = $[1];
  let cancel = onCancel;
  let globalExitKeybindings = useGlobalExitKeybindings(cancel);
  let selection;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    selection = {
      context: "Select",
    };
    $[2] = selection;
  } else selection = $[2];
  useKeybinding("select:cancel", cancel, selection);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let selectedBlock;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    selectedBlock = stableEmptyObject(false);
    $[3] = selectedBlock;
  } else selectedBlock = $[3];
  let selected = selectedBlock;
  let codeCount = countWhere(blocks, isCodeSegment);
  let quoteCount = blocks.length - codeCount;
  let mode;
  if ($[4] !== blocks) {
    mode = ["full", ...blocks.map(returnSecond), "always"];
    $[4] = blocks;
    $[5] = mode;
  } else mode = $[5];
  let modeState = mode;
  let t4;
  if ($[6] !== blocks || $[7] !== fullText) {
    t4 = function getSelectionContent(selected) {
      if (selected === "full" || selected === "always") {
        return {
          text: fullText,
          filename: RESPONSE_FILENAME,
          isQuote: false,
        };
      }
      let block = blocks[selected];
      if (block.kind === "quote") {
        return {
          text: block.text,
          filename: COPY_FILENAME,
          isQuote: true,
        };
      }
      return {
        text: block.text,
        filename: `copy${fileExtension(block.lang)}`,
        blockIndex: countWhere(blocks.slice(0, selected), isCodeSegment_2),
        isQuote: false,
      };
    };
    $[6] = blocks;
    $[7] = fullText;
    $[8] = t4;
  } else t4 = $[8];
  let blocksView = t4;
  let scrollState;
  if (
    $[9] !== codeCount ||
    $[10] !== blocksView ||
    $[11] !== messageAge ||
    $[12] !== onDone ||
    $[13] !== quoteCount ||
    $[14] !== storageV5
  ) {
    scrollState = async function handleSelect(selected) {
      let content = blocksView(selected);
      if (selected === "always") {
        if (!getGlobalConfig().copyFullResponse) await saveGlobalConfig(withCopyFullResponse, storageV5);
        logEvent("tengu_copy", {
          block_count: codeCount,
          quote_count: quoteCount,
          always: true,
          message_age: messageAge,
        });
        let result = await copyOrWriteToFile(content.text, content.filename);
        onDone(`${result}
Preference saved. Use /config to change copyFullResponse`);
        return;
      }
      logEvent("tengu_copy", {
        selected_block: content.blockIndex,
        selected_quote: content.isQuote,
        block_count: codeCount,
        quote_count: quoteCount,
        message_age: messageAge,
      });
      let result = await copyOrWriteToFile(content.text, content.filename);
      onDone(result);
    };
    $[9] = codeCount;
    $[10] = blocksView;
    $[11] = messageAge;
    $[12] = onDone;
    $[13] = quoteCount;
    $[14] = storageV5;
    $[15] = scrollState;
  } else scrollState = $[15];
  let scroll = scrollState;
  let previewState;
  if (
    $[16] !== codeCount ||
    $[17] !== blocksView ||
    $[18] !== messageAge ||
    $[19] !== onDone ||
    $[20] !== quoteCount
  ) {
    previewState = async function handleWrite(selected) {
      let content = blocksView(selected);
      logEvent("tengu_copy", {
        selected_block: content.blockIndex,
        selected_quote: content.isQuote,
        block_count: codeCount,
        quote_count: quoteCount,
        message_age: messageAge,
        write_shortcut: true,
      });
      try {
        let filePath = await writeTempCopyFile(content.text, content.filename);
        onDone(`Written to ${filePath}`);
      } catch (error) {
        let e = error;
        onDone(`Failed to write file: ${e instanceof Error ? e.message : e}`);
      }
    };
    $[16] = codeCount;
    $[17] = blocksView;
    $[18] = messageAge;
    $[19] = onDone;
    $[20] = quoteCount;
    $[21] = previewState;
  } else previewState = $[21];
  let preview = previewState;
  let statusState;
  if ($[22] !== preview) {
    statusState = function handleKeyDown(e_0) {
      if (e_0.key !== "w" || e_0.ctrl || e_0.meta) {
        return;
      }
      e_0.preventDefault();
      preview("full");
    };
    $[22] = preview;
    $[23] = statusState;
  } else statusState = $[23];
  let status = statusState;
  let handleKeyDown;
  if ($[24] !== preview || $[25] !== modeState) {
    handleKeyDown = function keyEvent(event, index) {
      let blockMode = modeState[index];
      if (event.key !== "w" || event.ctrl || event.meta || blockMode === undefined) {
        return;
      }
      event.preventDefault();
      preview(blockMode);
    };
    $[24] = preview;
    $[25] = modeState;
    $[26] = handleKeyDown;
  } else handleKeyDown = $[26];
  let onRowKeyDown = handleKeyDown;
  let previewText;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    previewText =
      true &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [COPY_PICKER_TITLE, ":"],
      });
    $[27] = previewText;
  } else previewText = $[27];
  const onKeyDown = isScreenReaderEnabled ? status : undefined;
  let onSelect;
  if ($[28] !== scroll || $[29] !== modeState) {
    onSelect = (value) => {
      let blockText = modeState[value];
      if (blockText !== undefined) scroll(blockText);
    };
    $[28] = scroll;
    $[29] = modeState;
    $[30] = onSelect;
  } else onSelect = $[30];
  const charCount = `${fullText.length} chars`;
  const sizeLabel = `${
    countCharInString(
      fullText,
      `
`,
    ) + 1
  } lines`;
  let tip;
  if ($[31] !== charCount || $[32] !== sizeLabel) {
    tip = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Full response",
        meta: [charCount, sizeLabel],
      },
      "full",
    );
    $[31] = charCount;
    $[32] = sizeLabel;
    $[33] = tip;
  } else tip = $[33];
  let listWidth;
  if ($[34] !== blocks) {
    listWidth = blocks.map(renderCopyBlockItem);
    $[34] = blocks;
    $[35] = listWidth;
  } else listWidth = $[35];
  let headerRow;
  if ($[36] === MEMO_CACHE_SENTINEL) {
    headerRow = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Always copy full response",
        description: "Skip this picker in the future (revert via /config)",
      },
      "always",
    );
    $[36] = headerRow;
  } else headerRow = $[36];
  let children;
  if ($[37] !== onRowKeyDown || $[38] !== onSelect || $[39] !== tip || $[40] !== listWidth) {
    children = jsxProd_default_2(OrderedListWithItem, {
      onSelect,
      onRowKeyDown,
      children: [tip, listWidth, headerRow],
    });
    $[37] = onRowKeyDown;
    $[38] = onSelect;
    $[39] = tip;
    $[40] = listWidth;
    $[41] = children;
  } else children = $[41];
  let statusLine;
  if ($[42] !== onKeyDown || $[43] !== children) {
    statusLine = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDown,
      children,
    });
    $[42] = onKeyDown;
    $[43] = children;
    $[44] = statusLine;
  } else statusLine = $[44];
  let children_2;
  if (
    $[45] !== globalExitKeybindings.keyName ||
    $[46] !== globalExitKeybindings.pending ||
    $[47] !== isScreenReaderEnabled
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default_2(Byline, {
          children: [
            !isScreenReaderEnabled &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "copy",
                ...selected,
              }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "w",
              action: isScreenReaderEnabled ? "write full response to file" : "write to file",
              ...selected,
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...selected,
            }),
          ],
        });
    $[45] = globalExitKeybindings.keyName;
    $[46] = globalExitKeybindings.pending;
    $[47] = isScreenReaderEnabled;
    $[48] = children_2;
  } else children_2 = $[48];
  let hintLine;
  if ($[49] !== children_2) {
    hintLine = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: children_2,
    });
    $[49] = children_2;
    $[50] = hintLine;
  } else hintLine = $[50];
  let footer;
  if ($[51] !== statusLine || $[52] !== hintLine) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [previewText, statusLine, hintLine],
    });
    footer = jsxProd_default(Pane, {
      children,
    });
    $[51] = statusLine;
    $[52] = hintLine;
    $[53] = footer;
  } else footer = $[53];
  return footer;
}
//@ chunk-pnckc079.js:20930-21066 layout
function blockLabel(text) {
  let found = text
    .split(
      `
`,
    )
    .find((line) => line.trim() !== "");
  if (found === undefined) return "(code block)";
  let label = truncateToLength(found, MAX_BLOCK_LABEL_WIDTH);
  return label === found ? found : `${label}\u2026`;
}
//@ chunk-pnckc079.js:21066-21741 fingerprint (2.1.88 match: call, 0.933)
/**
 * MAX_BLOCK_LABEL_WIDTH：120。
 */
var MAX_BLOCK_LABEL_WIDTH = 120;
var call = async (onDone, context, args) => {
  let texts = recentAssistantTexts(context.messages);
  if (texts.length === 0) {
    onDone("No assistant message to copy");
    return null;
  }
  let age = 0;
  let arg = args?.trim();
  if (arg) {
    let n = Number(arg);
    if (!Number.isInteger(n) || n < 1) {
      onDone(`Usage: /copy [N] where N is 1 (latest), 2, 3, \u2026 Got: ${arg}`);
      return null;
    }
    if (n > texts.length) {
      onDone(
        `Only ${texts.length} assistant ${texts.length === 1 ? "message" : "messages"} available to copy`,
      );
      return null;
    }
    age = n - 1;
  }
  let text = normalizeMarkdownTables(stripMemoryTags(texts[age]));
  let codeBlocks = extractCodeBlocks(text);
  let config = getGlobalConfig();
  if (codeBlocks.length === 0 || config.copyFullResponse) {
    let codeBlockCount = countWhere(codeBlocks, (block) => block.kind === "code");
    logEvent("tengu_copy", {
      always: config.copyFullResponse,
      block_count: codeBlockCount,
      quote_count: codeBlocks.length - codeBlockCount,
      message_age: age,
    });
    let result = await copyOrWriteToFile(text, RESPONSE_FILENAME);
    onDone(result);
    return null;
  }
  return jsxProd_default(CopyPicker, {
    fullText: text,
    blocks: codeBlocks,
    messageAge: age,
    onDone,
  });
};
export {
  collectRecentAssistantTexts,
  getModelFamilyForAttribution,
  call,
  recentAssistantTexts,
  fileExtension,
  normalizeMarkdownTables,
  formatMarkdownTable,
};
