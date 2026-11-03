/**
 * components/memory/RemoteMemoryDialog.tsx
 *
 * 2.1.316 新增：远程连接下的只读 /memory 对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c55mbvfz.js (11)
 * attribution: placement 10, sole-consumer 1
 */
import { j, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hr } from "../../utils/invisibleChars.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { errorMessage } from "../../utils/errors.js";
import { shortHostname } from "../../utils/hooks/deviceHookId.js";
import { SYNC_KEYS } from "../../services/settingsSync/types.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { formatTokens } from "../../utils/format.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { plural } from "../../utils/stringUtils.js";
import { Jn, ml } from "../../remote/remoteMode.js";
import { hasUntriedHomeSeed } from "../../services/homeSeed/homeSeedRecord.js";
import { clearMemoryFilesCache } from "../Message.js";
import { memoryRowsCache } from "./MemoryFileSelector.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import { getNonMemoryInstructionFiles } from "../../context.js";
import { MemoryCommand } from "../../commands/memory/memory.js";

//@ chunk-c55mbvfz.js:15731-15735 placement
j();
//@ chunk-c55mbvfz.js:15776-15780 placement
j();
//@ chunk-c55mbvfz.js:15780-15853 placement = _temp2 (1)
function Kt(line_0, i_1) {
  return e(Text, { wrap: "truncate-end", children: hr(line_0) || " " }, i_1);
}
//@ chunk-c55mbvfz.js:15853-16049 placement
var REMOTE_MEMORY_MAX_BYTES = 65536,
  remoteContextUsageSchema = DoctorLazy(() =>
    u({
      memoryFiles: A(
        u({ path: o(), type: o().catch(""), tokens: E().catch(0) })
          .nullable()
          .catch(null),
      ).catch([]),
    }),
  ),
  remoteFileReadSchema = DoctorLazy(() =>
    u({
      contents: o(),
      truncated: M()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-c55mbvfz.js:16049-16509 placement
async function fetchRemoteContextUsage(b, _) {
  try {
    let C = parseThinClientReply(
      "get_context_usage",
      remoteContextUsageSchema(),
      await b.sendControlRequest({ subtype: "get_context_usage", detail: "summary" }, { signal: _ }),
    );
    if (!C)
      return { kind: "unreadable", reason: "the cloud session sent a reply this version can't display" };
    return {
      kind: "read",
      files: C.memoryFiles.flatMap((memoryFile) =>
        memoryFile === null
          ? []
          : [
              {
                path: memoryFile.path,
                shownPath: hr(memoryFile.path),
                type: hr(memoryFile.type),
                tokens: memoryFile.tokens,
                userScope: memoryFile.type === "User",
              },
            ],
      ),
    };
  } catch (error) {
    return { kind: "unreadable", reason: hr(errorMessage(error)) };
  }
}
//@ chunk-c55mbvfz.js:16509-16984 placement
async function readRemoteFile(b, _, C) {
  try {
    let v = parseThinClientReply(
      "read_file",
      remoteFileReadSchema(),
      await b.sendControlRequest(
        { subtype: "read_file", path: _, max_bytes: REMOTE_MEMORY_MAX_BYTES },
        { signal: C },
      ),
    );
    return v
      ? { kind: "read", contents: v.contents, truncated: v.truncated === !0 }
      : { kind: "unreadable", reason: "the cloud session sent a reply this version can't display" };
  } catch (error) {
    let T = errorMessage(error);
    return {
      kind: "unreadable",
      reason: T.startsWith("read denied")
        ? "the cloud session only shows a terminal the files inside its workspace, and this one isn't"
        : hr(T),
    };
  }
}
/**
 * 远程 /memory 对话框中记忆文件的说明：从本机启动时发送的用户文件应在本机编辑，云会话自身的文件无法从这里打开。
 */
//@ chunk-c55mbvfz.js:17111-17445 sole-consumer
function remoteMemoryFileNote(b, _) {
  return b === "sentFromHere"
    ? `User files were sent from ${shortHostname()} at launch \u2014 edit ${_ === void 0 ? "them under ~/.claude" : SYNC_KEYS(_)} there; changes apply to the next cloud session, or when this machine re-attaches.`
    : "This file is in the cloud session's own ~/.claude (not from this machine) and can't be opened from here.";
}
/**
 * 远程（云会话/Remote Control）连接下的 /memory 只读对话框：列出并查看云端会话读到的记忆文件。
 */
//@ chunk-c55mbvfz.js:17445-19637 placement
function RemoteMemoryDialog(b) {
  let I = w(31),
    {
      onExit: onExit,
      remote: remote,
      filesRead: filesRead,
      signal: signal,
      userMemoryOrigin: userMemoryOrigin,
      pointsToCloudMemory: pointsToCloudMemory,
    } = b;
  pointsToCloudMemory === void 0 ? !1 : pointsToCloudMemory;
  let [N, B] = y(null),
    L;
  if (I[0] !== onExit)
    ((L = () => onExit("Memory dialog dismissed", { display: "system" })), (I[0] = onExit), (I[1] = L));
  else L = I[1];
  let U = L;
  if (N !== null) {
    const V = `${N.file.type} memory \xB7 read-only`;
    let ee;
    if (I[2] === MEMO_CACHE_SENTINEL) ((ee = () => B(null)), (I[2] = ee));
    else ee = I[2];
    let Y;
    if (I[3] === MEMO_CACHE_SENTINEL)
      ((Y = e(KeyboardShortcutHint, { chord: "escape", action: "go back" })), (I[3] = Y));
    else Y = I[3];
    let K;
    if (I[4] === MEMO_CACHE_SENTINEL)
      ((K = e(WorkerBadge, { message: "Reading\u2026", dimColor: !0 })), (I[4] = K));
    else K = I[4];
    let X;
    if (I[5] !== N.read)
      ((X = e(fo, { fallback: K, children: e(RemoteMemoryFileView, { read: N.read }) })),
        (I[5] = N.read),
        (I[6] = X));
    else X = I[6];
    let H;
    if (I[7] !== N.file.shownPath || I[8] !== V || I[9] !== X)
      ((H = e(Dialog, {
        title: N.file.shownPath,
        subtitle: V,
        onCancel: ee,
        color: "remember",
        inputGuide: Y,
        children: X,
      })),
        (I[7] = N.file.shownPath),
        (I[8] = V),
        (I[9] = X),
        (I[10] = H));
    else H = I[10];
    return H;
  }
  let V;
  if (I[11] === MEMO_CACHE_SENTINEL)
    ((V = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "view" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "close" }),
      ],
    })),
      (I[11] = V));
  else V = I[11];
  let ee;
  if (I[12] === MEMO_CACHE_SENTINEL)
    ((ee = e(WorkerBadge, { message: "Asking the cloud session for its memory files\u2026", dimColor: !0 })),
      (I[12] = ee));
  else ee = I[12];
  let Y;
  if (I[13] !== remote || I[14] !== signal || I[15] !== userMemoryOrigin)
    ((Y = (ae) =>
      B({
        file: ae,
        read: ae.userScope
          ? Promise.resolve({ kind: "userScope", hint: remoteMemoryFileNote(userMemoryOrigin, ae.shownPath) })
          : readRemoteFile(remote, ae.path, signal),
      })),
      (I[13] = remote),
      (I[14] = signal),
      (I[15] = userMemoryOrigin),
      (I[16] = Y));
  else Y = I[16];
  let K;
  if (I[17] !== U || I[18] !== filesRead || I[19] !== Y || I[20] !== userMemoryOrigin)
    ((K = e(fo, {
      fallback: ee,
      children: e(RemoteMemoryFileList, {
        filesRead: filesRead,
        onPick: Y,
        onCancel: U,
        userMemoryOrigin: userMemoryOrigin,
      }),
    })),
      (I[17] = U),
      (I[18] = filesRead),
      (I[19] = Y),
      (I[20] = userMemoryOrigin),
      (I[21] = K));
  else K = I[21];
  let X;
  if (I[22] === MEMO_CACHE_SENTINEL)
    ((X = e(Text, {
      dimColor: !0,
      wrap: "wrap-trim",
      children:
        "Workspace files are read-only here: the session takes no edits from a terminal \u2014 ask Claude to edit one, or edit and commit it in the repo.",
    })),
      (I[22] = X));
  else X = I[22];
  let H;
  if (I[23] !== userMemoryOrigin)
    ((H =
      userMemoryOrigin === "sentFromHere" &&
      e(Text, { dimColor: !0, wrap: "wrap-trim", children: remoteMemoryFileNote("sentFromHere") })),
      (I[23] = userMemoryOrigin),
      (I[24] = H));
  else H = I[24];
  let ve;
  if (I[25] !== H)
    ((ve = r(Box, { flexDirection: "column", children: [X, H, !1] })), (I[25] = H), (I[26] = ve));
  else ve = I[26];
  let oo;
  if (I[27] !== U || I[28] !== K || I[29] !== ve)
    ((oo = r(Dialog, {
      title: "Memory",
      subtitle: "Loaded in the cloud session",
      onCancel: U,
      color: "remember",
      inputGuide: V,
      children: [K, ve],
    })),
      (I[27] = U),
      (I[28] = K),
      (I[29] = ve),
      (I[30] = oo));
  else oo = I[30];
  return oo;
}
//@ chunk-c55mbvfz.js:19637-20667 placement
function RemoteMemoryFileList(b) {
  let x = w(14),
    { filesRead: filesRead, onPick: onPick, userMemoryOrigin: userMemoryOrigin } = b,
    T = Qr(filesRead);
  if (T.kind === "unreadable") {
    let D;
    if (x[0] !== T.reason)
      ((D = r(Text, {
        color: "error",
        children: ["Couldn't list the cloud session's memory files: ", T.reason],
      })),
        (x[0] = T.reason),
        (x[1] = D));
    else D = x[1];
    return D;
  }
  if (T.files.length === 0) {
    let D;
    if (x[2] === MEMO_CACHE_SENTINEL)
      ((D = e(HintText, {
        hint: "Add a CLAUDE.md to the repo, or ask Claude to write one",
        children: "No memory files loaded in the cloud session",
      })),
        (x[2] = D));
    else D = x[2];
    return D;
  }
  let D;
  if (x[3] !== onPick || x[4] !== T.files)
    ((D = (N) => {
      let B = T.files[N];
      if (B) onPick(B);
    }),
      (x[3] = onPick),
      (x[4] = T.files),
      (x[5] = D));
  else D = x[5];
  let I;
  if (x[6] !== T.files || x[7] !== userMemoryOrigin) {
    let L;
    if (x[9] !== userMemoryOrigin)
      ((L = (U, V) =>
        e(
          OrderedListWithItem.Item,
          {
            label: U.shownPath,
            meta: [U.type, `${formatTokens(U.tokens)} tokens`],
            description: !U.userScope
              ? void 0
              : userMemoryOrigin === "sentFromHere"
                ? `sent from ${shortHostname()} at launch`
                : "the session's own ~/.claude, not sent from here",
          },
          V,
        )),
        (x[9] = userMemoryOrigin),
        (x[10] = L));
    else L = x[10];
    I = T.files.map(L);
    ((x[6] = T.files), (x[7] = userMemoryOrigin), (x[8] = I));
  } else I = x[8];
  let L;
  if (x[11] !== D || x[12] !== I)
    ((L = e(OrderedListWithItem, { onSelect: D, children: I })), (x[11] = D), (x[12] = I), (x[13] = L));
  else L = x[13];
  return L;
}
//@ chunk-c55mbvfz.js:20667-21749 placement
function RemoteMemoryFileView(b) {
  let T = w(18),
    { read: read } = b,
    C = Qr(read),
    { rows: rows } = useTerminalSize();
  if (C.kind === "userScope") {
    let x;
    if (T[0] !== C.hint)
      ((x = e(Text, { dimColor: !0, wrap: "wrap-trim", children: C.hint })), (T[0] = C.hint), (T[1] = x));
    else x = T[1];
    return x;
  }
  if (C.kind === "unreadable") {
    let x;
    if (T[2] !== C.reason)
      ((x = r(Text, { color: "error", children: ["Couldn't read it: ", C.reason] })),
        (T[2] = C.reason),
        (T[3] = x));
    else x = T[3];
    return x;
  }
  let D, N, x, B;
  if (T[4] !== C.contents || T[5] !== rows) {
    let parts = C.contents.replaceAll("\t", "    ").split(/\r?\n/);
    let max = Math.max(5, rows - 12);
    let sliced = parts.slice(0, max);
    N = parts.length - sliced.length;
    D = Box;
    x = "column";
    B = sliced.map(Kt);
    ((T[4] = C.contents), (T[5] = rows), (T[6] = D), (T[7] = N), (T[8] = x), (T[9] = B));
  } else ((D = T[6]), (N = T[7]), (x = T[8]), (B = T[9]));
  let V;
  if (T[10] !== N || T[11] !== C.truncated)
    ((V =
      (N > 0 || C.truncated) &&
      r(Text, {
        dimColor: !0,
        children: [
          "\u2026 ",
          N > 0 ? `${N} more ${plural(N, "line")}` : "more",
          C.truncated ? " (the session sent only the beginning)" : "",
          " \u2014 ask Claude to show or change the rest",
        ],
      })),
      (T[10] = N),
      (T[11] = C.truncated),
      (T[12] = V));
  else V = T[12];
  let ee;
  if (T[13] !== D || T[14] !== x || T[15] !== B || T[16] !== V)
    ((ee = r(D, { flexDirection: x, children: [B, V] })),
      (T[13] = D),
      (T[14] = x),
      (T[15] = B),
      (T[16] = V),
      (T[17] = ee));
  else ee = T[17];
  return ee;
}
/**
 * /memory 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-c55mbvfz.js:43674-44206 placement
var runRemoteMemoryCommand = async (onDone, context) => {
  let C = Jn();
  if (C) {
    if (!ml()) return (onDone("Memory files aren't available over this remote connection"), null);
    return e(RemoteMemoryDialog, {
      onExit: onDone,
      remote: C,
      filesRead: fetchRemoteContextUsage(C, context.abortController.signal),
      signal: context.abortController.signal,
      userMemoryOrigin:
        C.sessionId !== void 0 && hasUntriedHomeSeed(C.sessionId) ? "sentFromHere" : "inSession",
      pointsToCloudMemory: !1,
    });
  }
  (clearMemoryFilesCache(context.session),
    memoryRowsCache.of(context.session).reset(),
    await getMemoryFilesCached(context.session, !1, context.storageV5, context.credentials));
  let v = await getNonMemoryInstructionFiles(context.session);
  return e(MemoryCommand, {
    session: context.session,
    commandContext: context,
    addedInstructionFiles: v,
    onDone: onDone,
  });
};
