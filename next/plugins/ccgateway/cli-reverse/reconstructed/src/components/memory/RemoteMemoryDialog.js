/**
 * components/memory/RemoteMemoryDialog.tsx
 *
 * 2.1.316 新增：远程连接下的只读 /memory 对话框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dzt5bmy4.js (11)
 * attribution: placement 10, sole-consumer 1
 */
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { errorMessage } from "../../utils/errors.js";
import { shortHostname } from "../../utils/hooks/deviceHookId.js";
import { SYNC_KEYS } from "../../services/settingsSync/types.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-dzt5bmy4.js:16923-16927 placement
init_react_production();
//@ chunk-dzt5bmy4.js:16968-16972 placement
init_react_production();
//@ chunk-dzt5bmy4.js:16972-17045 placement (2.1.88 match: _temp2, 1)
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
//@ chunk-dzt5bmy4.js:17045-17241 placement
var REMOTE_MEMORY_MAX_BYTES = 65536;
var remoteContextUsageSchema = DoctorLazy(() =>
  objectSchema({
    memoryFiles: array(
      objectSchema({
        path: stringSchema(),
        type: stringSchema().catch(""),
        tokens: numberSchema().catch(0),
      })
        .nullable()
        .catch(null),
    ).catch([]),
  }),
);
var remoteFileReadSchema = DoctorLazy(() =>
  objectSchema({
    contents: stringSchema(),
    truncated: booleanSchema().optional().catch(undefined),
  }),
);
//@ chunk-dzt5bmy4.js:17241-17701 placement
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
//@ chunk-dzt5bmy4.js:17701-18176 placement
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
    let message = errorMessage(error);
    return {
      kind: "unreadable",
      reason: message.startsWith("read denied")
        ? "the cloud session only shows a terminal the files inside its workspace, and this one isn't"
        : stripInvisibleChars(message),
    };
  }
}
//@ chunk-dzt5bmy4.js:18303-18637 sole-consumer
/**
 * 远程 /memory 对话框中记忆文件的说明：从本机启动时发送的用户文件应在本机编辑，云会话自身的文件无法从这里打开。
 */
function remoteMemoryFileNote(userMemoryOrigin, filePath) {
  return userMemoryOrigin === "sentFromHere"
    ? `User files were sent from ${shortHostname()} at launch \u2014 edit ${filePath === undefined ? "them under ~/.claude" : SYNC_KEYS(filePath)} there; changes apply to the next cloud session, or when this machine re-attaches.`
    : "This file is in the cloud session's own ~/.claude (not from this machine) and can't be opened from here.";
}
//@ chunk-dzt5bmy4.js:18637-20829 placement
/**
 * 远程（云会话/Remote Control）连接下的 /memory 只读对话框：列出并查看云端会话读到的记忆文件。
 */
function RemoteMemoryDialog(props) {
  let $ = useMemoCache(31);
  let { onExit, remote, filesRead, signal, userMemoryOrigin, pointsToCloudMemory } = props;
  if (pointsToCloudMemory === undefined) false;
  else pointsToCloudMemory;
  let [selectedFile, setSelectedFile] = useState(null);
  let onDismiss;
  if ($[0] !== onExit) {
    onDismiss = () =>
      onExit("Memory dialog dismissed", {
        display: "system",
      });
    $[0] = onExit;
    $[1] = onDismiss;
  } else onDismiss = $[1];
  let onCancel = onDismiss;
  if (selectedFile !== null) {
    const subtitle = `${selectedFile.file.type} memory \xB7 read-only`;
    let onCancel;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setSelectedFile(null);
      $[2] = onCancel;
    } else onCancel = $[2];
    let inputGuide;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "go back",
      });
      $[3] = inputGuide;
    } else inputGuide = $[3];
    let fallback;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      fallback = jsxProd_default(WorkerBadge, {
        message: "Reading\u2026",
        dimColor: true,
      });
      $[4] = fallback;
    } else fallback = $[4];
    let children;
    if ($[5] !== selectedFile.read) {
      children = jsxProd_default(suspenseTypeExport, {
        fallback,
        children: jsxProd_default(RemoteMemoryFileView, {
          read: selectedFile.read,
        }),
      });
      $[5] = selectedFile.read;
      $[6] = children;
    } else children = $[6];
    let detailDialog;
    if ($[7] !== selectedFile.file.shownPath || $[8] !== subtitle || $[9] !== children) {
      detailDialog = jsxProd_default(Dialog, {
        title: selectedFile.file.shownPath,
        subtitle,
        onCancel,
        color: "remember",
        inputGuide,
        children,
      });
      $[7] = selectedFile.file.shownPath;
      $[8] = subtitle;
      $[9] = children;
      $[10] = detailDialog;
    } else detailDialog = $[10];
    return detailDialog;
  }
  let inputGuide;
  if ($[11] === MEMO_CACHE_SENTINEL) {
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
    $[11] = inputGuide;
  } else inputGuide = $[11];
  let fallback;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(WorkerBadge, {
      message: "Asking the cloud session for its memory files\u2026",
      dimColor: true,
    });
    $[12] = fallback;
  } else fallback = $[12];
  let onPick;
  if ($[13] !== remote || $[14] !== signal || $[15] !== userMemoryOrigin) {
    onPick = (file) =>
      setSelectedFile({
        file,
        read: file.userScope
          ? Promise.resolve({
              kind: "userScope",
              hint: remoteMemoryFileNote(userMemoryOrigin, file.shownPath),
            })
          : readRemoteFile(remote, file.path, signal),
      });
    $[13] = remote;
    $[14] = signal;
    $[15] = userMemoryOrigin;
    $[16] = onPick;
  } else onPick = $[16];
  let fileList;
  if ($[17] !== onCancel || $[18] !== filesRead || $[19] !== onPick || $[20] !== userMemoryOrigin) {
    fileList = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(RemoteMemoryFileList, {
        filesRead,
        onPick,
        onCancel,
        userMemoryOrigin,
      }),
    });
    $[17] = onCancel;
    $[18] = filesRead;
    $[19] = onPick;
    $[20] = userMemoryOrigin;
    $[21] = fileList;
  } else fileList = $[21];
  let localMemoryNote;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    localMemoryNote = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Workspace files are read-only here: the session takes no edits from a terminal \u2014 ask Claude to edit one, or edit and commit it in the repo.",
    });
    $[22] = localMemoryNote;
  } else localMemoryNote = $[22];
  let localMemorySection;
  if ($[23] !== userMemoryOrigin) {
    localMemorySection =
      userMemoryOrigin === "sentFromHere" &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: remoteMemoryFileNote("sentFromHere"),
      });
    $[23] = userMemoryOrigin;
    $[24] = localMemorySection;
  } else localMemorySection = $[24];
  let bodyColumn;
  if ($[25] !== localMemorySection) {
    bodyColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [localMemoryNote, localMemorySection, false],
    });
    $[25] = localMemorySection;
    $[26] = bodyColumn;
  } else bodyColumn = $[26];
  let mainDialog;
  if ($[27] !== onCancel || $[28] !== fileList || $[29] !== bodyColumn) {
    mainDialog = jsxProd_default_2(Dialog, {
      title: "Memory",
      subtitle: "Loaded in the cloud session",
      onCancel,
      color: "remember",
      inputGuide,
      children: [fileList, bodyColumn],
    });
    $[27] = onCancel;
    $[28] = fileList;
    $[29] = bodyColumn;
    $[30] = mainDialog;
  } else mainDialog = $[30];
  return mainDialog;
}
//@ chunk-dzt5bmy4.js:20829-21859 placement
function RemoteMemoryFileList(props) {
  let $ = useMemoCache(14);
  let { filesRead, onPick, userMemoryOrigin } = props;
  let filesReadResult = use(filesRead);
  if (filesReadResult.kind === "unreadable") {
    let errorText;
    if ($[0] !== filesReadResult.reason) {
      errorText = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't list the cloud session's memory files: ", filesReadResult.reason],
      });
      $[0] = filesReadResult.reason;
      $[1] = errorText;
    } else errorText = $[1];
    return errorText;
  }
  if (filesReadResult.files.length === 0) {
    let emptyHint;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      emptyHint = jsxProd_default(HintText, {
        hint: "Add a CLAUDE.md to the repo, or ask Claude to write one",
        children: "No memory files loaded in the cloud session",
      });
      $[2] = emptyHint;
    } else emptyHint = $[2];
    return emptyHint;
  }
  let onSelect;
  if ($[3] !== onPick || $[4] !== filesReadResult.files) {
    onSelect = (selectedIndex) => {
      let file = filesReadResult.files[selectedIndex];
      if (file) onPick(file);
    };
    $[3] = onPick;
    $[4] = filesReadResult.files;
    $[5] = onSelect;
  } else onSelect = $[5];
  let children;
  if ($[6] !== filesReadResult.files || $[7] !== userMemoryOrigin) {
    let renderRow;
    if ($[9] !== userMemoryOrigin) {
      renderRow = (file, index) =>
        jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: file.shownPath,
            meta: [file.type, `${formatTokens(file.tokens)} tokens`],
            description: !file.userScope
              ? undefined
              : userMemoryOrigin === "sentFromHere"
                ? `sent from ${shortHostname()} at launch`
                : "the session's own ~/.claude, not sent from here",
          },
          index,
        );
      $[9] = userMemoryOrigin;
      $[10] = renderRow;
    } else renderRow = $[10];
    children = filesReadResult.files.map(renderRow);
    $[6] = filesReadResult.files;
    $[7] = userMemoryOrigin;
    $[8] = children;
  } else children = $[8];
  let listElement;
  if ($[11] !== onSelect || $[12] !== children) {
    listElement = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    $[11] = onSelect;
    $[12] = children;
    $[13] = listElement;
  } else listElement = $[13];
  return listElement;
}
//@ chunk-dzt5bmy4.js:21859-22941 placement
function RemoteMemoryFileView(props) {
  let $ = useMemoCache(18);
  let { read } = props;
  let readResult = use(read);
  let { rows } = useTerminalSize();
  if (readResult.kind === "userScope") {
    let hintElement;
    if ($[0] !== readResult.hint) {
      hintElement = jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: readResult.hint,
      });
      $[0] = readResult.hint;
      $[1] = hintElement;
    } else hintElement = $[1];
    return hintElement;
  }
  if (readResult.kind === "unreadable") {
    let errorElement;
    if ($[2] !== readResult.reason) {
      errorElement = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't read it: ", readResult.reason],
      });
      $[2] = readResult.reason;
      $[3] = errorElement;
    } else errorElement = $[3];
    return errorElement;
  }
  let containerComponent;
  let hiddenLineCount;
  let flexDirection;
  let lineElements;
  if ($[4] !== readResult.contents || $[5] !== rows) {
    let lines = readResult.contents.replaceAll("\t", "    ").split(/\r?\n/);
    let max = Math.max(5, rows - 12);
    let sliced = lines.slice(0, max);
    hiddenLineCount = lines.length - sliced.length;
    containerComponent = Box;
    flexDirection = "column";
    lineElements = sliced.map(renderPathLine);
    $[4] = readResult.contents;
    $[5] = rows;
    $[6] = containerComponent;
    $[7] = hiddenLineCount;
    $[8] = flexDirection;
    $[9] = lineElements;
  } else {
    containerComponent = $[6];
    hiddenLineCount = $[7];
    flexDirection = $[8];
    lineElements = $[9];
  }
  let moreIndicator;
  if ($[10] !== hiddenLineCount || $[11] !== readResult.truncated) {
    moreIndicator =
      (hiddenLineCount > 0 || readResult.truncated) &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "\u2026 ",
          hiddenLineCount > 0 ? `${hiddenLineCount} more ${plural(hiddenLineCount, "line")}` : "more",
          readResult.truncated ? " (the session sent only the beginning)" : "",
          " \u2014 ask Claude to show or change the rest",
        ],
      });
    $[10] = hiddenLineCount;
    $[11] = readResult.truncated;
    $[12] = moreIndicator;
  } else moreIndicator = $[12];
  let bodyElement;
  if (
    $[13] !== containerComponent ||
    $[14] !== flexDirection ||
    $[15] !== lineElements ||
    $[16] !== moreIndicator
  ) {
    bodyElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [lineElements, moreIndicator],
    });
    $[13] = containerComponent;
    $[14] = flexDirection;
    $[15] = lineElements;
    $[16] = moreIndicator;
    $[17] = bodyElement;
  } else bodyElement = $[17];
  return bodyElement;
}
//@ chunk-dzt5bmy4.js:44870-45402 placement
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
export { runRemoteMemoryCommand };
