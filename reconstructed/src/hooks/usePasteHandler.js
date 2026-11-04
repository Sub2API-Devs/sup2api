/**
 * hooks/usePasteHandler.ts
 *
 * 粘贴处理：识别大段粘贴/拖入的图片路径，读取图片或剪贴板图片（macOS/WSL），否则把文本交给 onPaste。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePasteHandler.ts
 * pieces: chunk-7p2hc4jn.js (4), chunk-e6aww6q8.js (4)
 * attribution: placement 7, callgraph-witnessed 1
 */
import { resolve as resolve_2, isAbsolute, basename } from "path";
import {
  readPinnedFile,
  DEFAULT_READ_TIMEOUT_MS,
  matchesExpectedSpellings,
  isDeviceNamespacePath,
  isInstructionReadRestricted,
  spellingsForReadOrFallback,
} from "../utils/instructionFileAccess.js";
import { expandPath } from "../utils/path.js";
import { logForDebugging } from "../utils/debug.js";
import { uniq } from "../utils/collections.js";
import { isUntrustedAutomountPath } from "../utils/permissions/filesystem.js";
import { getFsImplementation } from "../utils/fsOperations.js";
import {
  init_react_production,
  useContext,
  useState,
  useRef,
  useMemo,
  useEffect,
  useEffectEvent,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { imageLimitsForModel } from "../utils/attachmentMedia.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { useClock } from "../ink/components/ClockContext.js";
import { appStoreContext } from "../state/AppState.js";
import { getPlatform } from "../utils/platform.js";
import { KeyboardEvent } from "../ink/events/keyboard-event.js";
import {
  getImageFromClipboard,
  isImageFilePath,
  tryReadImageFromPath,
  asImageFilePath,
  PASTE_THRESHOLD,
} from "../utils/imagePaste.js";
import { logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { useDebouncedCallback } from "../ink/components/Input.js";
import { withNoDenyRules } from "../utils/claudemd.js";
import { getAttachmentReadBlockReason } from "../utils/attachments/fileAttachments.js";
import { PasteEvent } from "../ink/frame.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1328376-1328638 placement
async function readPastedPathAnchored(path, anchor) {
  let content = await readPinnedFile(
    expandPath(path),
    anchor,
    AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS),
  )((pinnedFile) => pinnedFile.handle.readFile());
  let refusal =
    content === undefined &&
    (await matchesExpectedSpellings(path, anchor, AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS)))
      ? "absent"
      : "refused";
  if (content === undefined)
    logForDebugging(`Pasted path is not read where it lands: ${refusal}`, {
      level: "warn",
    });
  return content ?? refusal;
}
//@ chunk-e6aww6q8.js:1328671-1328724 placement
var expandDotDotPath = (path) => (path.split(/[\\/]/).includes("..") ? expandPath(path) : path);
//@ chunk-e6aww6q8.js:1328724-1329189 placement
/**
 * 检查粘贴的路径能否安全读取：在可写范围内拒绝，必要时限时检查真实路径。
 */
async function examinePastedPath(rawPath, getDenyContexts, blockReason) {
  let expandedPath = expandPath(rawPath);
  let contexts = getDenyContexts();
  if (
    contexts.length === 0 ||
    contexts.some((permissionContext) => blockReason(rawPath, permissionContext) !== undefined)
  )
    return "refused";
  if (isDeviceNamespacePath(expandedPath) && !contexts.some(isInstructionReadRestricted)) return "unexamined";
  let timeoutSignal = AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS);
  let results = await Promise.all(
    uniq([expandedPath, resolve_2(expandDotDotPath(rawPath))]).map((spelling) =>
      spellingsForReadOrFallback(spelling, timeoutSignal),
    ),
  );
  let [primarySpellings] = results;
  let contexts_2 = getDenyContexts();
  let isAnchored =
    !results.includes(undefined) &&
    contexts_2.length > 0 &&
    !contexts_2.some((permissionContext) =>
      [rawPath, ...results.flatMap((spellings) => spellings ?? [])].some(
        (candidate) =>
          blockReason(candidate, permissionContext) !== undefined ||
          isUntrustedAutomountPath(candidate, permissionContext.trustedNetworkDirectories),
      ),
    );
  let anchor = contexts_2.some(isInstructionReadRestricted) ? primarySpellings : "unexamined";
  return isAnchored && anchor !== undefined ? anchor : "refused";
}
//@ chunk-e6aww6q8.js:1329189-1329439 placement
/**
 * 读取粘贴进输入框的文件路径内容：先做权限与不可信自动挂载检查（拒绝时返回 "refused"），本地普通路径直接读字节，否则通过锚定句柄读取。
 */
async function readPastedPathSafely(line, getDenyContexts, blockReason) {
  let anchor = await examinePastedPath(line, getDenyContexts, blockReason).catch(() => "refused");
  if (anchor === "refused") {
    logForDebugging("Pasted path is not read: the read is refused", {
      level: "warn",
    });
    return "refused";
  }
  return anchor === "unexamined"
    ? getFsImplementation().readFileBytes(expandDotDotPath(line))
    : readPastedPathAnchored(line, anchor).catch(() => "refused");
}
//@ chunk-7p2hc4jn.js:51533-51537 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7p2hc4jn.js:51533", () => {
  init_react_production();
});
//@ chunk-7p2hc4jn.js:51587-51826 placement
var CLIPBOARD_CHECK_DEBOUNCE_MS = 50;
var PATH_SPLIT_RE = / (?=["']?(?:\/|[A-Za-z]:\\))/;
var UNQUOTED_PATH_RE = /^(?:\/(?!\/)[^ \r\\/]*(?:\\.[^ \r\\/]*)*\/|[A-Za-z]:\\|\\\\)[^\r]*$/;
var QUOTED_PATH_RE = /^(["'])(?:\/[^/\r]+\/|[A-Za-z]:\\|\\\\)[^\r]*\1$/;
var ESCAPED_SPACE_RE = /[^\\] /;
var MACOS_SCREENSHOT_TEMP_RE = /\/TemporaryItems\/.*screencaptureui.*\/Screenshot/i;
//@ chunk-7p2hc4jn.js:51826-51856 placement
function getClipboardPlatform() {
  return imageLimitsForModel(getMainLoopModel());
}
//@ chunk-7p2hc4jn.js:51856-54705 callgraph-witnessed = usePasteHandler (0.228)
/**
 * 粘贴/拖放处理：长于阈值的按键序列视为粘贴；把粘贴文本按行拆分，识别图片路径（含 macOS 截图临时目录），并行读取图片并调用 onImagePaste，其余文本交 onPaste；空粘贴在 macOS/WSL 上改读剪贴板图片；粘贴期间吞掉紧随的回车并在结束后补发。
 */
function usePasteHandler({ onPaste, handleKeyDown, onImagePaste, onUnreadImagePaste }) {
  let clock = useClock();
  let appStore = useContext(appStoreContext);
  let [isPasting, setIsPasting] = useState(false);
  let isMountedRef = useRef(true);
  let isPasteInProgressRef = useRef(false);
  let pendingReturnRef = useRef(false);
  let [pasteCounter, setPasteCounter] = useState(0);
  let isMacOS = useMemo(() => getPlatform() === "macos", []);
  let isWSL = useMemo(() => getPlatform() === "wsl", []);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );
  let replayReturn = useEffectEvent(() => {
    handleKeyDown(
      new KeyboardEvent({
        kind: "key",
        name: "return",
        fn: false,
        ctrl: false,
        meta: false,
        shift: false,
        option: false,
        super: false,
        sequence: "\r",
        raw: "\r",
        code: undefined,
        col: undefined,
        row: undefined,
      }),
    );
  });
  useEffect(() => {
    if (pasteCounter === 0) return;
    return clock.setTimeout(() => {
      isPasteInProgressRef.current = false;
      if (pendingReturnRef.current) {
        pendingReturnRef.current = false;
        replayReturn();
      }
    }, 0);
  }, [pasteCounter, clock]);
  let readClipboardImage = useCallback(() => {
    if (!onImagePaste || !isMountedRef.current) return;
    getImageFromClipboard(getClipboardPlatform())
      .then((imageData) => {
        if (imageData && isMountedRef.current)
          onImagePaste(imageData.base64, {
            mediaType: imageData.mediaType,
            dimensions: imageData.dimensions,
          });
      })
      .catch((error) => {
        if (isMountedRef.current) {
          logFeatureBad("input_image_paste", "clipboard_read_failed");
          logError(error);
        }
      })
      .finally(() => {
        finishPaste();
      });
  }, [onImagePaste]);
  let checkClipboardForImage = useDebouncedCallback(readClipboardImage, CLIPBOARD_CHECK_DEBOUNCE_MS);
  function submitPastedText(text) {
    if (onPaste) {
      onPaste(text);
      return;
    }
    handleKeyDown(
      new KeyboardEvent({
        kind: "key",
        name: undefined,
        fn: false,
        ctrl: false,
        meta: false,
        shift: false,
        option: false,
        super: false,
        sequence: text,
        raw: text,
        code: undefined,
        col: undefined,
        row: undefined,
      }),
    );
  }
  function finishPaste() {
    if (!isMountedRef.current) return;
    isPasteInProgressRef.current = false;
    pendingReturnRef.current = false;
    setIsPasting(false);
  }
  function finishPasteText() {
    setIsPasting(false);
    setPasteCounter((currentTimeoutId) => currentTimeoutId + 1);
  }
  function processPastedText(
    text,
    rawEmpty = text.length === 0,
    rawEndedWithFocusTail = text.endsWith("[I") || text.endsWith("[O"),
  ) {
    isPasteInProgressRef.current = true;
    let trimmedText = rawEndedWithFocusTail ? text.replace(/\[[IO]$/, "") : text;
    if (rawEmpty && (isMacOS || isWSL) && onImagePaste) {
      checkClipboardForImage();
      return;
    }
    if (rawEmpty && onImagePaste) onUnreadImagePaste?.();
    let imagePaths = [];
    let parts = [];
    for (let line of trimmedText.split(`
`)) {
      let lines = line.split(PATH_SPLIT_RE).filter((part) => part.trim());
      if (
        lines.length > 1 &&
        !lines.every((line) => {
          let text = line.trim();
          return (
            QUOTED_PATH_RE.test(text) ||
            (UNQUOTED_PATH_RE.test(text) && (!ESCAPED_SPACE_RE.test(text) || isImageFilePath(text)))
          );
        })
      ) {
        parts.push(line);
        continue;
      }
      for (let line of lines)
        if (isImageFilePath(line)) {
          parts.push(imagePaths.length);
          imagePaths.push(line);
        } else parts.push(line);
    }
    if (onImagePaste && imagePaths.length > 0) {
      let any = imagePaths.some((path) => MACOS_SCREENSHOT_TEMP_RE.test(path));
      let clipboardPlatform = getClipboardPlatform();
      Promise.all(
        imagePaths.map((path) =>
          tryReadImageFromPath(path, clipboardPlatform, (line) =>
            readPastedPathSafely(
              line,
              () => {
                let toolPermissionContext = appStore?.getState().toolPermissionContext;
                return toolPermissionContext
                  ? [toolPermissionContext, withNoDenyRules(toolPermissionContext)]
                  : [];
              },
              (path, denyRules) => getAttachmentReadBlockReason(path, denyRules, "person"),
            ),
          ),
        ),
      )
        .then((imagePath) => {
          if (!isMountedRef.current) return;
          let included = imagePath.includes("refused");
          let all = imagePaths.every((results) => isAbsolute(asImageFilePath(results) ?? ""));
          let validImages = imagePath.filter((image) => image !== null && image !== "refused");
          let useClipboardFallback = validImages.length === 0 && any && isMacOS && !included && all;
          let joined = parts.flatMap((part) => {
            if (typeof part === "string") return [part];
            let path = imagePaths[part] ?? "";
            return (imagePath[part] === null || imagePath[part] === "refused") &&
              !(useClipboardFallback && MACOS_SCREENSHOT_TEMP_RE.test(path))
              ? [path]
              : [];
          }).join(`
`);
          if (validImages.length > 0) {
            for (let [imageIndex, image] of validImages.entries()) {
              let filename = basename(image.path);
              onImagePaste(image.base64, {
                mediaType: image.mediaType,
                filename,
                dimensions: image.dimensions,
                sourcePath: image.path,
                continuesGesture: imageIndex > 0,
              });
            }
            if (joined) submitPastedText(joined);
            finishPaste();
          } else if (useClipboardFallback) {
            if (joined) submitPastedText(joined);
            checkClipboardForImage();
          } else {
            logFeatureSad("input_image_drag", included ? "read_withheld" : "read_failed");
            submitPastedText(trimmedText);
            finishPaste();
          }
        })
        .catch((line) => {
          if (!isMountedRef.current) return;
          logFeatureBad("input_image_drag", "read_threw");
          logForDebugging(`Image paste read failed: ${line instanceof Error ? line.message : String(line)}`, {
            level: "error",
          });
          submitPastedText(trimmedText);
          finishPaste();
        });
      return;
    }
    submitPastedText(trimmedText);
    finishPasteText();
  }
  function handlePaste(part) {
    part.preventDefault();
    setIsPasting(true);
    processPastedText(part.text, part.rawEmpty, part.rawEndedWithFocusTail);
  }
  function handleKeyDown_2(line) {
    if (isPasteInProgressRef.current && line.name === "return") {
      line.preventDefault();
      pendingReturnRef.current = true;
      return;
    }
    if (
      (onPaste || onImagePaste) &&
      !line.ctrl &&
      !line.meta &&
      line.key.length > PASTE_THRESHOLD &&
      !line.defaultPrevented
    ) {
      line.preventDefault();
      setIsPasting(true);
      let pasteEvent = new PasteEvent(line.key);
      processPastedText(pasteEvent.text, pasteEvent.rawEmpty, pasteEvent.rawEndedWithFocusTail);
      return;
    }
    handleKeyDown(line);
  }
  return {
    handleKeyDown: handleKeyDown_2,
    handlePaste,
    isPasting,
  };
}
export { usePasteHandler };
