/**
 * commands/copy/copy.tsx
 *
 * /copy 实现：复制最近第 N 条回复或选择其中代码块，写剪贴板或落盘 response.md
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/copy/copy.tsx
 * pieces: chunk-0knprqgt.js (16), chunk-5nte8cwj.js (1), chunk-e6aww6q8.js (1)
 * attribution: sole-consumer 1, affinity 1, fingerprint 10, layout 5, placement 1
 */
import { join } from "path";
import { mkdir } from "fs/promises";
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
import { writeFileAtomic } from "../../utils/file.js";
import { setClipboard, getOsc52Utf8Warning } from "../../ink/termio/osc.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { count } from "../../utils/collections.js";
import { isCodeSegment } from "../../bridge/bridgeMain.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";
import { isDesktopInstalled } from "../../utils/desktopDeepLink.js";

//@ chunk-0knprqgt.js:13722-13751 sole-consumer
function returnSecond(Pn, Lt) {
  return Lt;
}
//@ chunk-0knprqgt.js:13751-13791 affinity = isConnectionError (1)
function isCodeSegment_2(err) {
  return err.kind === "code";
}
//@ chunk-0knprqgt.js:13791-13841 fingerprint = _temp2 (1)
function withCopyFullResponse(c) {
  return {
    ...c,
    copyFullResponse: true,
  };
}
//@ chunk-0knprqgt.js:13841-14028 fingerprint = _temp (0.615)
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
//@ chunk-0knprqgt.js:14028-14096 fingerprint = RESPONSE_FILENAME (0.5)
/**
 * RESPONSE_FILENAME：同旧版。
 */
var RESPONSE_FILENAME = "response.md";
var COPY_FILENAME = "copy.md";
var MAX_LOOKBACK = 20;
var COPY_PICKER_TITLE = "Select content to copy";
//@ chunk-0knprqgt.js:14096-14450 fingerprint = extractCodeBlocks (0.374)
function extractCodeBlocks(markdown) {
  let { tokens } = lexMarkdownWindowed(marked, stripPromptXMLTags(markdown));
  let blocks = [];
  let c;
  for (let token of tokens) {
    if (token.type === "space") continue;
    if (token.type !== "blockquote") {
      c = undefined;
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
    let d = token.text.replace(/^\s*\n/, "").trimEnd();
    if (d === "") continue;
    if (c)
      c.text = `${c.text}

${d}`;
    else {
      c = {
        kind: "quote",
        text: d,
      };
      blocks.push(c);
    }
  }
  return blocks;
}
//@ chunk-0knprqgt.js:14450-14506 layout
function tableCellText(i) {
  return i.tokens.map((token) => token.raw).join("");
}
//@ chunk-0knprqgt.js:14506-15048 layout
/**
 * 把表格数据渲染为 Markdown 表格文本：转义竖线与换行，按显示宽度对齐列（最少 3 列宽），按对齐方式生成分隔行。
 */
function formatMarkdownTable(table) {
  let mapped = [table.header.map(tableCellText), ...table.rows.map((m) => m.map(tableCellText))].map((m) =>
    m.map((f) => f.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ")),
  );
  let mapped_2 = mapped[0].map((m, f) => Math.max(3, ...mapped.map((g) => bunStringWidth(g[f] ?? ""))));
  let formatRow = (m) =>
    `| ${m.map((f, g) => f + " ".repeat(Math.max(0, mapped_2[g] - bunStringWidth(f)))).join(" | ")} |`;
  let u = (m, f) => {
    switch (f) {
      case "center":
        return `:${repeatString("-", m - 2)}:`;
      case "right":
        return `${repeatString("-", m - 1)}:`;
      case "left":
        return `:${repeatString("-", m - 1)}`;
      default:
        return "-".repeat(m);
    }
  };
  let d = `| ${mapped_2.map((m, f) => u(m, table.align[f] ?? null)).join(" | ")} |`;
  let [o, ...p] = mapped;
  return [formatRow(o), d, ...p.map(formatRow)].join(`
`);
}
//@ chunk-0knprqgt.js:15048-15329 layout
function normalizeMarkdownTables(i) {
  let { tokens } = lexMarkdownWindowed(marked, i);
  let t = i;
  let c = 0;
  let u = 0;
  for (let token of tokens) {
    let index = i.indexOf(token.raw, c);
    if (index === -1) continue;
    c = index + token.raw.length;
    if (token.type !== "table") continue;
    let p = token.raw.match(/\n*$/)?.[0] ?? "";
    let m = formatMarkdownTable(token) + p;
    t = t.slice(0, index + u) + m + t.slice(index + token.raw.length + u);
    u += m.length - token.raw.length;
  }
  return t;
}
//@ chunk-0knprqgt.js:15329-15558 layout
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
//@ chunk-0knprqgt.js:15558-15664 fingerprint = fileExtension (1)
function fileExtension(lang) {
  if (lang) {
    let sanitized = lang.replace(/[^a-zA-Z0-9]/g, "");
    if (sanitized && sanitized !== "plaintext") return `.${sanitized}`;
  }
  return ".txt";
}
//@ chunk-0knprqgt.js:15664-15786 placement = copySnapshotToLocal (0.871)
/**
 * /copy 命令：把文本写入临时目录下的文件并返回路径。
 */
async function writeTempCopyFile(agentType, scope) {
  let t = claudeTempDir();
  let localMemDir = join(t, scope);
  await mkdir(t, {
    recursive: true,
    mode: 448,
  });
  await writeFileAtomic(localMemDir, agentType, {
    encoding: "utf-8",
  });
  return localMemDir;
}
//@ chunk-0knprqgt.js:15786-16107 fingerprint = copyOrWriteToFile (0.744)
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
  let o = getOsc52Utf8Warning(text);
  try {
    let filePath = await writeTempCopyFile(text, filename);
    let m = o
      ? `
\u26A0 ${o}; the file below is unaffected`
      : "";
    return `${charCount}${m}
Also written to ${filePath}`;
  } catch {
    let p = o
      ? `
\u26A0 ${o}`
      : "";
    return `${charCount}${p}`;
  }
}
//@ chunk-0knprqgt.js:16107-19748 fingerprint = CopyPicker (0.705)
function CopyPicker(props) {
  let o = w(54);
  let { fullText, blocks, messageAge, onDone } = props;
  let { storageV5 } = useTheme_2();
  let p;
  if (o[0] !== onDone) {
    p = function m() {
      onDone("Copy cancelled", {
        display: "system",
      });
    };
    o[0] = onDone;
    o[1] = p;
  } else p = o[1];
  let m = p;
  let globalExitKeybindings = useGlobalExitKeybindings(m);
  let g;
  if (o[2] === MEMO_CACHE_SENTINEL) {
    g = {
      context: "Select",
    };
    o[2] = g;
  } else g = o[2];
  useKeybinding("select:cancel", m, g);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Fe;
  if (o[3] === MEMO_CACHE_SENTINEL) {
    Fe = stableEmptyObject(false);
    o[3] = Fe;
  } else Fe = o[3];
  let fe = Fe;
  let k = count(blocks, isCodeSegment);
  let quoteCount = blocks.length - k;
  let Ie;
  if (o[4] !== blocks) {
    Ie = ["full", ...blocks.map(returnSecond), "always"];
    o[4] = blocks;
    o[5] = Ie;
  } else Ie = o[5];
  let T = Ie;
  let t4;
  if (o[6] !== blocks || o[7] !== fullText) {
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
        blockIndex: count(blocks.slice(0, selected), isCodeSegment_2),
        isQuote: false,
      };
    };
    o[6] = blocks;
    o[7] = fullText;
    o[8] = t4;
  } else t4 = o[8];
  let x = t4;
  let Ke;
  if (
    o[9] !== k ||
    o[10] !== x ||
    o[11] !== messageAge ||
    o[12] !== onDone ||
    o[13] !== quoteCount ||
    o[14] !== storageV5
  ) {
    Ke = async function handleSelect(selected) {
      let content = x(selected);
      if (selected === "always") {
        if (!getGlobalConfig().copyFullResponse) await saveGlobalConfig(withCopyFullResponse, storageV5);
        logEvent("tengu_copy", {
          block_count: k,
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
        block_count: k,
        quote_count: quoteCount,
        message_age: messageAge,
      });
      let result = await copyOrWriteToFile(content.text, content.filename);
      onDone(result);
    };
    o[9] = k;
    o[10] = x;
    o[11] = messageAge;
    o[12] = onDone;
    o[13] = quoteCount;
    o[14] = storageV5;
    o[15] = Ke;
  } else Ke = o[15];
  let N = Ke;
  let Ne;
  if (o[16] !== k || o[17] !== x || o[18] !== messageAge || o[19] !== onDone || o[20] !== quoteCount) {
    Ne = async function handleWrite(selected) {
      let content = x(selected);
      logEvent("tengu_copy", {
        selected_block: content.blockIndex,
        selected_quote: content.isQuote,
        block_count: k,
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
    o[16] = k;
    o[17] = x;
    o[18] = messageAge;
    o[19] = onDone;
    o[20] = quoteCount;
    o[21] = Ne;
  } else Ne = o[21];
  let h = Ne;
  let Q;
  if (o[22] !== h) {
    Q = function handleKeyDown(e_0) {
      if (e_0.key !== "w" || e_0.ctrl || e_0.meta) {
        return;
      }
      e_0.preventDefault();
      h("full");
    };
    o[22] = h;
    o[23] = Q;
  } else Q = o[23];
  let Oe = Q;
  let Qe;
  if (o[24] !== h || o[25] !== T) {
    Qe = function X(event, Et) {
      let We = T[Et];
      if (event.key !== "w" || event.ctrl || event.meta || We === undefined) {
        return;
      }
      event.preventDefault();
      h(We);
    };
    o[24] = h;
    o[25] = T;
    o[26] = Qe;
  } else Qe = o[26];
  let onRowKeyDown = Qe;
  let Ue;
  if (o[27] === MEMO_CACHE_SENTINEL) {
    Ue =
      true &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [COPY_PICKER_TITLE, ":"],
      });
    o[27] = Ue;
  } else Ue = o[27];
  const onKeyDown = isScreenReaderEnabled ? Oe : undefined;
  let onSelect;
  if (o[28] !== N || o[29] !== T) {
    onSelect = (value) => {
      let Xe = T[value];
      if (Xe !== undefined) N(Xe);
    };
    o[28] = N;
    o[29] = T;
    o[30] = onSelect;
  } else onSelect = o[30];
  const ke = `${fullText.length} chars`;
  const ye = `${
    countCharInString(
      fullText,
      `
`,
    ) + 1
  } lines`;
  let J;
  if (o[31] !== ke || o[32] !== ye) {
    J = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Full response",
        meta: [ke, ye],
      },
      "full",
    );
    o[31] = ke;
    o[32] = ye;
    o[33] = J;
  } else J = o[33];
  let V;
  if (o[34] !== blocks) {
    V = blocks.map(renderCopyBlockItem);
    o[34] = blocks;
    o[35] = V;
  } else V = o[35];
  let ze;
  if (o[36] === MEMO_CACHE_SENTINEL) {
    ze = jsxProd_default(
      OrderedListWithItem.Item,
      {
        label: "Always copy full response",
        description: "Skip this picker in the future (revert via /config)",
      },
      "always",
    );
    o[36] = ze;
  } else ze = o[36];
  let children;
  if (o[37] !== onRowKeyDown || o[38] !== onSelect || o[39] !== J || o[40] !== V) {
    children = jsxProd_default_2(OrderedListWithItem, {
      onSelect,
      onRowKeyDown,
      children: [J, V, ze],
    });
    o[37] = onRowKeyDown;
    o[38] = onSelect;
    o[39] = J;
    o[40] = V;
    o[41] = children;
  } else children = o[41];
  let Z;
  if (o[42] !== onKeyDown || o[43] !== children) {
    Z = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDown,
      children,
    });
    o[42] = onKeyDown;
    o[43] = children;
    o[44] = Z;
  } else Z = o[44];
  let children_2;
  if (
    o[45] !== globalExitKeybindings.keyName ||
    o[46] !== globalExitKeybindings.pending ||
    o[47] !== isScreenReaderEnabled
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default_2(Byline, {
          children: [
            !isScreenReaderEnabled &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "copy",
                ...fe,
              }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "w",
              action: isScreenReaderEnabled ? "write full response to file" : "write to file",
              ...fe,
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...fe,
            }),
          ],
        });
    o[45] = globalExitKeybindings.keyName;
    o[46] = globalExitKeybindings.pending;
    o[47] = isScreenReaderEnabled;
    o[48] = children_2;
  } else children_2 = o[48];
  let H;
  if (o[49] !== children_2) {
    H = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: children_2,
    });
    o[49] = children_2;
    o[50] = H;
  } else H = o[50];
  let Je;
  if (o[51] !== Z || o[52] !== H) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Ue, Z, H],
    });
    Je = jsxProd_default(Pane, {
      children,
    });
    o[51] = Z;
    o[52] = H;
    o[53] = Je;
  } else Je = o[53];
  return Je;
}
//@ chunk-0knprqgt.js:19748-19885 layout
function blockLabel(text) {
  let found = text
    .split(
      `
`,
    )
    .find((line) => line.trim() !== "");
  if (found === undefined) return "(code block)";
  let t = truncateToLength(found, MAX_BLOCK_LABEL_WIDTH);
  return t === found ? found : `${t}\u2026`;
}
//@ chunk-0knprqgt.js:19885-20560 fingerprint = call (0.933)
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
    let f = count(codeBlocks, (y) => y.kind === "code");
    logEvent("tengu_copy", {
      always: config.copyFullResponse,
      block_count: f,
      quote_count: codeBlocks.length - f,
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
//@ chunk-5nte8cwj.js:1546-1584 fingerprint = COPY_DIR (1)
async function COPY_DIR() {
  return isDesktopInstalled("claude");
}
//@ chunk-e6aww6q8.js:2659669-2659812 fingerprint = collectRecentAssistantTexts (0.709)
function collectRecentAssistantTexts(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg.type === "assistant" && msg.requestId && !msg.isApiErrorMessage) return msg.requestId;
  }
  return;
}
export { collectRecentAssistantTexts, COPY_DIR };
