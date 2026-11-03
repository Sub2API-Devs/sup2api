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
import { init_react_production, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { hasUntriedHomeSeed } from "../../services/homeSeed/homeSeedRecord.js";
import { clearMemoryFilesCache } from "../Message.js";
import { memoryRowsCache } from "./MemoryFileSelector.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import { getNonMemoryInstructionFiles } from "../../context.js";
import { MemoryCommand } from "../../commands/memory/memory.js";

//@ chunk-c55mbvfz.js:15731-15735 placement
init_react_production();
//@ chunk-c55mbvfz.js:15776-15780 placement
init_react_production();
//@ chunk-c55mbvfz.js:15780-15853 placement = _temp2 (1)
function renderPathLine(line, i_1) {
  return jsxProd_default(
    Text,
    {
      wrap: "truncate-end",
      children: stripInvisibleChars(line) || " ",
    },
    i_1,
  );
}
//@ chunk-c55mbvfz.js:15853-16049 placement
var REMOTE_MEMORY_MAX_BYTES = 65536;
var remoteContextUsageSchema = DoctorLazy(() =>
  u({
    memoryFiles: array(
      u({
        path: string(),
        type: string().catch(""),
        tokens: E().catch(0),
      })
        .nullable()
        .catch(null),
    ).catch([]),
  }),
);
var remoteFileReadSchema = DoctorLazy(() =>
  u({
    contents: string(),
    truncated: M().optional().catch(undefined),
  }),
);
//@ chunk-c55mbvfz.js:16049-16509 placement
async function fetchRemoteContextUsage(remoteCaps, signal) {
  try {
    let thinClientReply = parseThinClientReply(
      "get_context_usage",
      remoteContextUsageSchema(),
      await remoteCaps.sendControlRequest(
        {
          subtype: "get_context_usage",
          detail: "summary",
        },
        {
          signal,
        },
      ),
    );
    if (!thinClientReply)
      return {
        kind: "unreadable",
        reason: "the cloud session sent a reply this version can't display",
      };
    return {
      kind: "read",
      files: thinClientReply.memoryFiles.flatMap((memoryFile) =>
        memoryFile === null
          ? []
          : [
              {
                path: memoryFile.path,
                shownPath: stripInvisibleChars(memoryFile.path),
                type: stripInvisibleChars(memoryFile.type),
                tokens: memoryFile.tokens,
                userScope: memoryFile.type === "User",
              },
            ],
      ),
    };
  } catch (error) {
    return {
      kind: "unreadable",
      reason: stripInvisibleChars(errorMessage(error)),
    };
  }
}
//@ chunk-c55mbvfz.js:16509-16984 placement
async function readRemoteFile(remote, path, signal) {
  try {
    let thinClientReply = parseThinClientReply(
      "read_file",
      remoteFileReadSchema(),
      await remote.sendControlRequest(
        {
          subtype: "read_file",
          path,
          max_bytes: REMOTE_MEMORY_MAX_BYTES,
        },
        {
          signal,
        },
      ),
    );
    return thinClientReply
      ? {
          kind: "read",
          contents: thinClientReply.contents,
          truncated: thinClientReply.truncated === true,
        }
      : {
          kind: "unreadable",
          reason: "the cloud session sent a reply this version can't display",
        };
  } catch (error) {
    let T = errorMessage(error);
    return {
      kind: "unreadable",
      reason: T.startsWith("read denied")
        ? "the cloud session only shows a terminal the files inside its workspace, and this one isn't"
        : stripInvisibleChars(T),
    };
  }
}
//@ chunk-c55mbvfz.js:17111-17445 sole-consumer
/**
 * 远程 /memory 对话框中记忆文件的说明：从本机启动时发送的用户文件应在本机编辑，云会话自身的文件无法从这里打开。
 */
function remoteMemoryFileNote(userMemoryOrigin, shownPath) {
  return userMemoryOrigin === "sentFromHere"
    ? `User files were sent from ${shortHostname()} at launch \u2014 edit ${shownPath === undefined ? "them under ~/.claude" : SYNC_KEYS(shownPath)} there; changes apply to the next cloud session, or when this machine re-attaches.`
    : "This file is in the cloud session's own ~/.claude (not from this machine) and can't be opened from here.";
}
//@ chunk-c55mbvfz.js:17445-19637 placement
/**
 * 远程（云会话/Remote Control）连接下的 /memory 只读对话框：列出并查看云端会话读到的记忆文件。
 */
function RemoteMemoryDialog(props) {
  let I = w(31);
  let { onExit, remote, filesRead, signal, userMemoryOrigin, pointsToCloudMemory } = props;
  if (pointsToCloudMemory === undefined) false;
  else pointsToCloudMemory;
  let [N, B] = y(null);
  let L;
  if (I[0] !== onExit) {
    L = () =>
      onExit("Memory dialog dismissed", {
        display: "system",
      });
    I[0] = onExit;
    I[1] = L;
  } else L = I[1];
  let onCancel = L;
  if (N !== null) {
    const subtitle = `${N.file.type} memory \xB7 read-only`;
    let onCancel;
    if (I[2] === MEMO_CACHE_SENTINEL) {
      onCancel = () => B(null);
      I[2] = onCancel;
    } else onCancel = I[2];
    let inputGuide;
    if (I[3] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "go back",
      });
      I[3] = inputGuide;
    } else inputGuide = I[3];
    let fallback;
    if (I[4] === MEMO_CACHE_SENTINEL) {
      fallback = jsxProd_default(WorkerBadge, {
        message: "Reading\u2026",
        dimColor: true,
      });
      I[4] = fallback;
    } else fallback = I[4];
    let children;
    if (I[5] !== N.read) {
      children = jsxProd_default(fo, {
        fallback,
        children: jsxProd_default(RemoteMemoryFileView, {
          read: N.read,
        }),
      });
      I[5] = N.read;
      I[6] = children;
    } else children = I[6];
    let H;
    if (I[7] !== N.file.shownPath || I[8] !== subtitle || I[9] !== children) {
      H = jsxProd_default(Dialog, {
        title: N.file.shownPath,
        subtitle,
        onCancel,
        color: "remember",
        inputGuide,
        children,
      });
      I[7] = N.file.shownPath;
      I[8] = subtitle;
      I[9] = children;
      I[10] = H;
    } else H = I[10];
    return H;
  }
  let inputGuide;
  if (I[11] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "view",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "close",
        }),
      ],
    });
    I[11] = inputGuide;
  } else inputGuide = I[11];
  let fallback;
  if (I[12] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(WorkerBadge, {
      message: "Asking the cloud session for its memory files\u2026",
      dimColor: true,
    });
    I[12] = fallback;
  } else fallback = I[12];
  let onPick;
  if (I[13] !== remote || I[14] !== signal || I[15] !== userMemoryOrigin) {
    onPick = (ae) =>
      B({
        file: ae,
        read: ae.userScope
          ? Promise.resolve({
              kind: "userScope",
              hint: remoteMemoryFileNote(userMemoryOrigin, ae.shownPath),
            })
          : readRemoteFile(remote, ae.path, signal),
      });
    I[13] = remote;
    I[14] = signal;
    I[15] = userMemoryOrigin;
    I[16] = onPick;
  } else onPick = I[16];
  let K;
  if (I[17] !== onCancel || I[18] !== filesRead || I[19] !== onPick || I[20] !== userMemoryOrigin) {
    K = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(RemoteMemoryFileList, {
        filesRead,
        onPick,
        onCancel,
        userMemoryOrigin,
      }),
    });
    I[17] = onCancel;
    I[18] = filesRead;
    I[19] = onPick;
    I[20] = userMemoryOrigin;
    I[21] = K;
  } else K = I[21];
  let X;
  if (I[22] === MEMO_CACHE_SENTINEL) {
    X = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Workspace files are read-only here: the session takes no edits from a terminal \u2014 ask Claude to edit one, or edit and commit it in the repo.",
    });
    I[22] = X;
  } else X = I[22];
  let H;
  if (I[23] !== userMemoryOrigin) {
    H =
      userMemoryOrigin === "sentFromHere" &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: remoteMemoryFileNote("sentFromHere"),
      });
    I[23] = userMemoryOrigin;
    I[24] = H;
  } else H = I[24];
  let ve;
  if (I[25] !== H) {
    ve = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [X, H, false],
    });
    I[25] = H;
    I[26] = ve;
  } else ve = I[26];
  let oo;
  if (I[27] !== onCancel || I[28] !== K || I[29] !== ve) {
    oo = jsxProd_default_2(Dialog, {
      title: "Memory",
      subtitle: "Loaded in the cloud session",
      onCancel,
      color: "remember",
      inputGuide,
      children: [K, ve],
    });
    I[27] = onCancel;
    I[28] = K;
    I[29] = ve;
    I[30] = oo;
  } else oo = I[30];
  return oo;
}
//@ chunk-c55mbvfz.js:19637-20667 placement
function RemoteMemoryFileList(props) {
  let x = w(14);
  let { filesRead, onPick, userMemoryOrigin } = props;
  let T = Qr(filesRead);
  if (T.kind === "unreadable") {
    let D;
    if (x[0] !== T.reason) {
      D = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't list the cloud session's memory files: ", T.reason],
      });
      x[0] = T.reason;
      x[1] = D;
    } else D = x[1];
    return D;
  }
  if (T.files.length === 0) {
    let D;
    if (x[2] === MEMO_CACHE_SENTINEL) {
      D = jsxProd_default(HintText, {
        hint: "Add a CLAUDE.md to the repo, or ask Claude to write one",
        children: "No memory files loaded in the cloud session",
      });
      x[2] = D;
    } else D = x[2];
    return D;
  }
  let onSelect;
  if (x[3] !== onPick || x[4] !== T.files) {
    onSelect = (N) => {
      let B = T.files[N];
      if (B) onPick(B);
    };
    x[3] = onPick;
    x[4] = T.files;
    x[5] = onSelect;
  } else onSelect = x[5];
  let children;
  if (x[6] !== T.files || x[7] !== userMemoryOrigin) {
    let L;
    if (x[9] !== userMemoryOrigin) {
      L = (U, V) =>
        jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: U.shownPath,
            meta: [U.type, `${formatTokens(U.tokens)} tokens`],
            description: !U.userScope
              ? undefined
              : userMemoryOrigin === "sentFromHere"
                ? `sent from ${shortHostname()} at launch`
                : "the session's own ~/.claude, not sent from here",
          },
          V,
        );
      x[9] = userMemoryOrigin;
      x[10] = L;
    } else L = x[10];
    children = T.files.map(L);
    x[6] = T.files;
    x[7] = userMemoryOrigin;
    x[8] = children;
  } else children = x[8];
  let L;
  if (x[11] !== onSelect || x[12] !== children) {
    L = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    x[11] = onSelect;
    x[12] = children;
    x[13] = L;
  } else L = x[13];
  return L;
}
//@ chunk-c55mbvfz.js:20667-21749 placement
function RemoteMemoryFileView(props) {
  let T = w(18);
  let { read } = props;
  let C = Qr(read);
  let { rows } = useTerminalSize();
  if (C.kind === "userScope") {
    let x;
    if (T[0] !== C.hint) {
      x = jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: C.hint,
      });
      T[0] = C.hint;
      T[1] = x;
    } else x = T[1];
    return x;
  }
  if (C.kind === "unreadable") {
    let x;
    if (T[2] !== C.reason) {
      x = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't read it: ", C.reason],
      });
      T[2] = C.reason;
      T[3] = x;
    } else x = T[3];
    return x;
  }
  let D;
  let N;
  let flexDirection;
  let B;
  if (T[4] !== C.contents || T[5] !== rows) {
    let lines = C.contents.replaceAll("\t", "    ").split(/\r?\n/);
    let max = Math.max(5, rows - 12);
    let sliced = lines.slice(0, max);
    N = lines.length - sliced.length;
    D = Box;
    flexDirection = "column";
    B = sliced.map(renderPathLine);
    T[4] = C.contents;
    T[5] = rows;
    T[6] = D;
    T[7] = N;
    T[8] = flexDirection;
    T[9] = B;
  } else {
    D = T[6];
    N = T[7];
    flexDirection = T[8];
    B = T[9];
  }
  let V;
  if (T[10] !== N || T[11] !== C.truncated) {
    V =
      (N > 0 || C.truncated) &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "\u2026 ",
          N > 0 ? `${N} more ${plural(N, "line")}` : "more",
          C.truncated ? " (the session sent only the beginning)" : "",
          " \u2014 ask Claude to show or change the rest",
        ],
      });
    T[10] = N;
    T[11] = C.truncated;
    T[12] = V;
  } else V = T[12];
  let ee;
  if (T[13] !== D || T[14] !== flexDirection || T[15] !== B || T[16] !== V) {
    ee = jsxProd_default_2(D, {
      flexDirection,
      children: [B, V],
    });
    T[13] = D;
    T[14] = flexDirection;
    T[15] = B;
    T[16] = V;
    T[17] = ee;
  } else ee = T[17];
  return ee;
}
//@ chunk-c55mbvfz.js:43674-44206 placement
/**
 * /memory 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runRemoteMemoryCommand = async (onDone, context) => {
  let remoteCaps = getRemoteCaps();
  if (remoteCaps) {
    if (!isRemoteControlChannelAvailable()) {
      onDone("Memory files aren't available over this remote connection");
      return null;
    }
    return jsxProd_default(RemoteMemoryDialog, {
      onExit: onDone,
      remote: remoteCaps,
      filesRead: fetchRemoteContextUsage(remoteCaps, context.abortController.signal),
      signal: context.abortController.signal,
      userMemoryOrigin:
        remoteCaps.sessionId !== undefined && hasUntriedHomeSeed(remoteCaps.sessionId)
          ? "sentFromHere"
          : "inSession",
      pointsToCloudMemory: false,
    });
  }
  clearMemoryFilesCache(context.session);
  memoryRowsCache.of(context.session).reset();
  await getMemoryFilesCached(context.session, false, context.storageV5, context.credentials);
  let addedInstructionFiles = await getNonMemoryInstructionFiles(context.session);
  return jsxProd_default(MemoryCommand, {
    session: context.session,
    commandContext: context,
    addedInstructionFiles,
    onDone,
  });
};
