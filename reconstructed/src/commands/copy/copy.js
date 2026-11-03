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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { lexMarkdownWindowed } from "../../utils/doctorContextWarnings.js";
import { Ah } from "../../../vendor/marked/lib/marked.esm.js";
import { stripPromptXMLTags, extractTextContent_2 } from "../../utils/messages.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { claudeTempDir } from "../../utils/tempDir.js";
import { writeFileAtomic } from "../../utils/file.js";
import { setClipboard, getOsc52Utf8Warning } from "../../ink/termio/osc.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { count } from "../../utils/collections.js";
import { isCodeSegment } from "../../bridge/bridgeMain.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { Cb } from "../../services/orgMemory/promptIndex.js";
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
  return { ...c, copyFullResponse: !0 };
}
//@ chunk-0knprqgt.js:13841-14028 fingerprint = _temp (0.615)
function renderCopyBlockItem(block, index) {
  let blockLines =
    countCharInString(
      block.text,
      `
`,
    ) + 1;
  let Ot = block.kind === "quote" ? "quote" : block.lang;
  return e(
    OrderedListWithItem.Item,
    {
      label: blockLabel(block.text),
      meta: [[Ot, blockLines > 1 ? `${blockLines} lines` : ""].filter(Boolean).join(", ")],
    },
    index,
  );
}
/**
 * RESPONSE_FILENAME：同旧版。
 */
//@ chunk-0knprqgt.js:14028-14096 fingerprint = RESPONSE_FILENAME (0.5)
var RESPONSE_FILENAME = "response.md",
  COPY_FILENAME = "copy.md",
  MAX_LOOKBACK = 20,
  COPY_PICKER_TITLE = "Select content to copy";
//@ chunk-0knprqgt.js:14096-14450 fingerprint = extractCodeBlocks (0.374)
function extractCodeBlocks(markdown) {
  let { tokens: tokens } = lexMarkdownWindowed(Ah, stripPromptXMLTags(markdown)),
    blocks = [],
    c;
  for (let token of tokens) {
    if (token.type === "space") continue;
    if (token.type !== "blockquote") {
      if (((c = void 0), token.type === "code")) {
        let codeToken = token;
        blocks.push({ kind: "code", text: codeToken.text, lang: codeToken.lang });
      }
      continue;
    }
    let trimEnd = token.text.replace(/^\s*\n/, "").trimEnd();
    if (trimEnd === "") continue;
    if (c)
      c.text = `${c.text}

${trimEnd}`;
    else ((c = { kind: "quote", text: trimEnd }), blocks.push(c));
  }
  return blocks;
}
//@ chunk-0knprqgt.js:14450-14506 layout
function he(i) {
  return i.tokens.map((token) => token.raw).join("");
}
/**
 * 把表格数据渲染为 Markdown 表格文本：转义竖线与换行，按显示宽度对齐列（最少 3 列宽），按对齐方式生成分隔行。
 */
//@ chunk-0knprqgt.js:14506-15048 layout
function formatMarkdownTable(table) {
  let mapped = [table.header.map(he), ...table.rows.map((row) => row.map(he))].map((m) =>
      m.map((f) => f.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ")),
    ),
    mapped_2 = mapped[0].map((m, f) => Math.max(3, ...mapped.map((g) => bunStringWidth(g[f] ?? "")))),
    formatRow = (m) =>
      `| ${m.map((f, g) => f + " ".repeat(Math.max(0, mapped_2[g] - bunStringWidth(f)))).join(" | ")} |`,
    u = (m, f) => {
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
    },
    d = `| ${mapped_2.map((m, f) => u(m, table.align[f] ?? null)).join(" | ")} |`,
    [o, ...p] = mapped;
  return [formatRow(o), d, ...p.map(formatRow)].join(`
`);
}
//@ chunk-0knprqgt.js:15048-15329 layout
function normalizeMarkdownTables(i) {
  let { tokens: tokens } = lexMarkdownWindowed(Ah, i),
    t = i,
    c = 0,
    u = 0;
  for (let d of tokens) {
    let index = i.indexOf(d.raw, c);
    if (index === -1) continue;
    if (((c = index + d.raw.length), d.type !== "table")) continue;
    let p = d.raw.match(/\n*$/)?.[0] ?? "",
      m = formatMarkdownTable(d) + p;
    ((t = t.slice(0, index + u) + m + t.slice(index + d.raw.length + u)), (u += m.length - d.raw.length));
  }
  return t;
}
//@ chunk-0knprqgt.js:15329-15558 layout
function recentAssistantTexts(i) {
  let l = [];
  for (let t = i.length - 1; t >= 0 && l.length < MAX_LOOKBACK; t--) {
    let c = i[t];
    if (c?.type !== "assistant" || c.isApiErrorMessage) continue;
    let content = c.message.content;
    if (!Array.isArray(content)) continue;
    let d = extractTextContent_2(
      content,
      `

`,
    );
    if (d) l.push(d);
  }
  return l;
}
//@ chunk-0knprqgt.js:15558-15664 fingerprint = fileExtension (1)
function fileExtension(lang) {
  if (lang) {
    let sanitized = lang.replace(/[^a-zA-Z0-9]/g, "");
    if (sanitized && sanitized !== "plaintext") return `.${sanitized}`;
  }
  return ".txt";
}
/**
 * /copy 命令：把文本写入临时目录下的文件并返回路径。
 */
//@ chunk-0knprqgt.js:15664-15786 placement = copySnapshotToLocal (0.871)
async function writeTempCopyFile(agentType, scope) {
  let t = claudeTempDir(),
    localMemDir = join(t, scope);
  return (
    await mkdir(t, { recursive: !0, mode: 448 }),
    await writeFileAtomic(localMemDir, agentType, { encoding: "utf-8" }),
    localMemDir
  );
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
      ) + 1,
    d = `Copied to clipboard (${text.length} characters, ${lineCount} lines)`,
    o = getOsc52Utf8Warning(text);
  try {
    let filePath = await writeTempCopyFile(text, filename),
      m = o
        ? `
\u26A0 ${o}; the file below is unaffected`
        : "";
    return `${d}${m}
Also written to ${filePath}`;
  } catch {
    let p = o
      ? `
\u26A0 ${o}`
      : "";
    return `${d}${p}`;
  }
}
//@ chunk-0knprqgt.js:16107-19748 fingerprint = CopyPicker (0.705)
function CopyPicker(t0) {
  let o = w(54),
    { fullText: fullText, blocks: blocks, messageAge: messageAge, onDone: onDone } = t0,
    { storageV5: storageV5 } = Me(),
    p;
  if (o[0] !== onDone)
    ((p = function m() {
      onDone("Copy cancelled", { display: "system" });
    }),
      (o[0] = onDone),
      (o[1] = p));
  else p = o[1];
  let m = p,
    f = useGlobalExitKeybindings(m),
    g;
  if (o[2] === MEMO_CACHE_SENTINEL) ((g = { context: "Select" }), (o[2] = g));
  else g = o[2];
  useKeybinding("select:cancel", m, g);
  let y = useIsScreenReaderEnabled(),
    Fe;
  if (o[3] === MEMO_CACHE_SENTINEL) ((Fe = nd(!1)), (o[3] = Fe));
  else Fe = o[3];
  let fe = Fe,
    k = count(blocks, isCodeSegment),
    b = blocks.length - k,
    Ie;
  if (o[4] !== blocks) ((Ie = ["full", ...blocks.map(returnSecond), "always"]), (o[4] = blocks), (o[5] = Ie));
  else Ie = o[5];
  let T = Ie,
    Le;
  if (o[6] !== blocks || o[7] !== fullText)
    ((Le = function x(selected) {
      if (selected === "full" || selected === "always") {
        return { text: fullText, filename: RESPONSE_FILENAME, isQuote: !1 };
      }
      let j = blocks[selected];
      if (j.kind === "quote") {
        return { text: j.text, filename: COPY_FILENAME, isQuote: !0 };
      }
      return {
        text: j.text,
        filename: `copy${fileExtension(j.lang)}`,
        blockIndex: count(blocks.slice(0, selected), isCodeSegment_2),
        isQuote: !1,
      };
    }),
      (o[6] = blocks),
      (o[7] = fullText),
      (o[8] = Le));
  else Le = o[8];
  let x = Le,
    Ke;
  if (
    o[9] !== k ||
    o[10] !== x ||
    o[11] !== messageAge ||
    o[12] !== onDone ||
    o[13] !== b ||
    o[14] !== storageV5
  )
    ((Ke = async function N(selected_0) {
      let content = x(selected_0);
      if (selected_0 === "always") {
        if (!getGlobalConfig().copyFullResponse) await saveGlobalConfig(withCopyFullResponse, storageV5);
        logEvent("tengu_copy", { block_count: k, quote_count: b, always: !0, message_age: messageAge });
        let result = await copyOrWriteToFile(content.text, content.filename);
        onDone(`${result}
Preference saved. Use /config to change copyFullResponse`);
        return;
      }
      logEvent("tengu_copy", {
        selected_block: content.blockIndex,
        selected_quote: content.isQuote,
        block_count: k,
        quote_count: b,
        message_age: messageAge,
      });
      let result_0 = await copyOrWriteToFile(content.text, content.filename);
      onDone(result_0);
    }),
      (o[9] = k),
      (o[10] = x),
      (o[11] = messageAge),
      (o[12] = onDone),
      (o[13] = b),
      (o[14] = storageV5),
      (o[15] = Ke));
  else Ke = o[15];
  let N = Ke,
    Ne;
  if (o[16] !== k || o[17] !== x || o[18] !== messageAge || o[19] !== onDone || o[20] !== b)
    ((Ne = async function h(selected_1) {
      let content_0 = x(selected_1);
      logEvent("tengu_copy", {
        selected_block: content_0.blockIndex,
        selected_quote: content_0.isQuote,
        block_count: k,
        quote_count: b,
        message_age: messageAge,
        write_shortcut: !0,
      });
      try {
        let filePath = await writeTempCopyFile(content_0.text, content_0.filename);
        onDone(`Written to ${filePath}`);
      } catch (t7) {
        let pe = t7;
        onDone(`Failed to write file: ${pe instanceof Error ? pe.message : pe}`);
      }
    }),
      (o[16] = k),
      (o[17] = x),
      (o[18] = messageAge),
      (o[19] = onDone),
      (o[20] = b),
      (o[21] = Ne));
  else Ne = o[21];
  let h = Ne,
    Q;
  if (o[22] !== h)
    ((Q = function Oe(e_0) {
      if (e_0.key !== "w" || e_0.ctrl || e_0.meta) {
        return;
      }
      (e_0.preventDefault(), h("full"));
    }),
      (o[22] = h),
      (o[23] = Q));
  else Q = o[23];
  let Oe = Q,
    Qe;
  if (o[24] !== h || o[25] !== T)
    ((Qe = function X(U, Et) {
      let We = T[Et];
      if (U.key !== "w" || U.ctrl || U.meta || We === void 0) {
        return;
      }
      (U.preventDefault(), h(We));
    }),
      (o[24] = h),
      (o[25] = T),
      (o[26] = Qe));
  else Qe = o[26];
  let X = Qe,
    Ue;
  if (o[27] === MEMO_CACHE_SENTINEL)
    ((Ue = !0 && r(Text, { dimColor: !0, children: [COPY_PICKER_TITLE, ":"] })), (o[27] = Ue));
  else Ue = o[27];
  const ge = y ? Oe : void 0;
  let z;
  if (o[28] !== N || o[29] !== T)
    ((z = (value) => {
      let Xe = T[value];
      if (Xe !== void 0) N(Xe);
    }),
      (o[28] = N),
      (o[29] = T),
      (o[30] = z));
  else z = o[30];
  const ke = `${fullText.length} chars`,
    ye = `${
      countCharInString(
        fullText,
        `
`,
      ) + 1
    } lines`;
  let J;
  if (o[31] !== ke || o[32] !== ye)
    ((J = e(OrderedListWithItem.Item, { label: "Full response", meta: [ke, ye] }, "full")),
      (o[31] = ke),
      (o[32] = ye),
      (o[33] = J));
  else J = o[33];
  let V;
  if (o[34] !== blocks) ((V = blocks.map(renderCopyBlockItem)), (o[34] = blocks), (o[35] = V));
  else V = o[35];
  let ze;
  if (o[36] === MEMO_CACHE_SENTINEL)
    ((ze = e(
      OrderedListWithItem.Item,
      {
        label: "Always copy full response",
        description: "Skip this picker in the future (revert via /config)",
      },
      "always",
    )),
      (o[36] = ze));
  else ze = o[36];
  let G;
  if (o[37] !== X || o[38] !== z || o[39] !== J || o[40] !== V)
    ((G = r(OrderedListWithItem, { onSelect: z, onRowKeyDown: X, children: [J, V, ze] })),
      (o[37] = X),
      (o[38] = z),
      (o[39] = J),
      (o[40] = V),
      (o[41] = G));
  else G = o[41];
  let Z;
  if (o[42] !== ge || o[43] !== G)
    ((Z = e(Box, { flexDirection: "column", onKeyDown: ge, children: G })),
      (o[42] = ge),
      (o[43] = G),
      (o[44] = Z));
  else Z = o[44];
  let Y;
  if (o[45] !== f.keyName || o[46] !== f.pending || o[47] !== y)
    ((Y = f.pending
      ? `Press ${f.keyName} again to cancel`
      : r(Byline, {
          children: [
            !y && e(KeyboardShortcutHint, { chord: "enter", action: "copy", ...fe }),
            e(KeyboardShortcutHint, {
              chord: "w",
              action: y ? "write full response to file" : "write to file",
              ...fe,
            }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...fe }),
          ],
        })),
      (o[45] = f.keyName),
      (o[46] = f.pending),
      (o[47] = y),
      (o[48] = Y));
  else Y = o[48];
  let H;
  if (o[49] !== Y) ((H = e(Text, { dimColor: !0, italic: !1, children: Y })), (o[49] = Y), (o[50] = H));
  else H = o[50];
  let Je;
  if (o[51] !== Z || o[52] !== H) {
    let Ft = r(Box, { flexDirection: "column", gap: 1, children: [Ue, Z, H] });
    Je = e(Pane, { children: Ft });
    ((o[51] = Z), (o[52] = H), (o[53] = Je));
  } else Je = o[53];
  return Je;
}
//@ chunk-0knprqgt.js:19748-19885 layout
function blockLabel(i) {
  let found = i
    .split(
      `
`,
    )
    .find((c) => c.trim() !== "");
  if (found === void 0) return "(code block)";
  let t = truncateToLength(found, MAX_BLOCK_LABEL_WIDTH);
  return t === found ? found : `${t}\u2026`;
}
/**
 * MAX_BLOCK_LABEL_WIDTH：120。
 */
//@ chunk-0knprqgt.js:19885-20560 fingerprint = call (0.933)
var MAX_BLOCK_LABEL_WIDTH = 120,
  call = async (onDone, context, args) => {
    let c = recentAssistantTexts(context.messages);
    if (c.length === 0) return (onDone("No assistant message to copy"), null);
    let u = 0,
      d = args?.trim();
    if (d) {
      let f = Number(d);
      if (!Number.isInteger(f) || f < 1)
        return (onDone(`Usage: /copy [N] where N is 1 (latest), 2, 3, \u2026 Got: ${d}`), null);
      if (f > c.length)
        return (
          onDone(`Only ${c.length} assistant ${c.length === 1 ? "message" : "messages"} available to copy`),
          null
        );
      u = f - 1;
    }
    let o = normalizeMarkdownTables(Cb(c[u])),
      p = extractCodeBlocks(o),
      m = getGlobalConfig();
    if (p.length === 0 || m.copyFullResponse) {
      let f = count(p, (y) => y.kind === "code");
      logEvent("tengu_copy", {
        always: m.copyFullResponse,
        block_count: f,
        quote_count: p.length - f,
        message_age: u,
      });
      let g = await copyOrWriteToFile(o, RESPONSE_FILENAME);
      return (onDone(g), null);
    }
    return e(CopyPicker, { fullText: o, blocks: p, messageAge: u, onDone: onDone });
  };
//@ chunk-5nte8cwj.js:1546-1584 fingerprint = COPY_DIR (1)
async function COPY_DIR() {
  return isDesktopInstalled("claude");
}
//@ chunk-e6aww6q8.js:2659669-2659812 fingerprint = collectRecentAssistantTexts (0.709)
function collectRecentAssistantTexts(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let msg = messages[n];
    if (msg.type === "assistant" && msg.requestId && !msg.isApiErrorMessage) return msg.requestId;
  }
  return;
}

export { collectRecentAssistantTexts, COPY_DIR };
