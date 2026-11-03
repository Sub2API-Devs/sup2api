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
import { isAbsolute, basename, resolve as resolve_2 } from "path";
import { init_react_production, Se, y, R, Q, P, Oo, ce } from "../../vendor/react/cjs/react.production.js";
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
import { logForDebugging } from "../utils/debug.js";
import { PasteEvent } from "../ink/frame.js";
import {
  readPinnedFile,
  DEFAULT_READ_TIMEOUT_MS,
  matchesExpectedSpellings,
  isDeviceNamespacePath,
  isInstructionReadRestricted,
  spellingsForReadOrFallback,
} from "../utils/instructionFileAccess.js";
import { expandPath } from "../utils/path.js";
import { uniq } from "../utils/collections.js";
import { isUntrustedAutomountPath } from "../utils/permissions/filesystem.js";
import { getFsImplementation } from "../utils/fsOperations.js";

//@ chunk-7p2hc4jn.js:51533-51537 placement
init_react_production();
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
  let u = Se(appStoreContext);
  let [isPasting, setIsPasting] = y(false);
  let isMountedRef = R(true);
  let isPasteInProgressRef = R(false);
  let pendingReturnRef = R(false);
  let [A, F] = y(0);
  let isMacOS = Q(() => getPlatform() === "macos", []);
  let isWSL = Q(() => getPlatform() === "wsl", []);
  P(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );
  let replayReturn = Oo(() => {
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
  P(() => {
    if (A === 0) return;
    return clock.setTimeout(() => {
      isPasteInProgressRef.current = false;
      if (pendingReturnRef.current) {
        pendingReturnRef.current = false;
        replayReturn();
      }
    }, 0);
  }, [A, clock]);
  let readClipboardImage = ce(() => {
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
  function submitPastedText(S) {
    if (onPaste) {
      onPaste(S);
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
        sequence: S,
        raw: S,
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
  function k() {
    setIsPasting(false);
    F((currentTimeoutId) => currentTimeoutId + 1);
  }
  function processPastedText(
    text,
    rawEmpty = text.length === 0,
    rawEndedWithFocusTail = text.endsWith("[I") || text.endsWith("[O"),
  ) {
    isPasteInProgressRef.current = true;
    let te = rawEndedWithFocusTail ? text.replace(/\[[IO]$/, "") : text;
    if (rawEmpty && (isMacOS || isWSL) && onImagePaste) {
      checkClipboardForImage();
      return;
    }
    if (rawEmpty && onImagePaste) onUnreadImagePaste?.();
    let J = [];
    let M = [];
    for (let line of te.split(`
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
        M.push(line);
        continue;
      }
      for (let line of lines)
        if (isImageFilePath(line)) {
          M.push(J.length);
          J.push(line);
        } else M.push(line);
    }
    if (onImagePaste && J.length > 0) {
      let any = J.some((B) => MACOS_SCREENSHOT_TEMP_RE.test(B));
      let clipboardPlatform = getClipboardPlatform();
      Promise.all(
        J.map((B) =>
          tryReadImageFromPath(B, clipboardPlatform, (line) =>
            readPastedPathSafely(
              line,
              () => {
                let toolPermissionContext = u?.getState().toolPermissionContext;
                return toolPermissionContext
                  ? [toolPermissionContext, withNoDenyRules(toolPermissionContext)]
                  : [];
              },
              (le, ye) => getAttachmentReadBlockReason(le, ye, "person"),
            ),
          ),
        ),
      )
        .then((imagePath) => {
          if (!isMountedRef.current) return;
          let included = imagePath.includes("refused");
          let all = J.every((results) => isAbsolute(asImageFilePath(results) ?? ""));
          let validImages = imagePath.filter((X) => X !== null && X !== "refused");
          let Le = validImages.length === 0 && any && isMacOS && !included && all;
          let joined = M.flatMap((X) => {
            if (typeof X === "string") return [X];
            let ge = J[X] ?? "";
            return (imagePath[X] === null || imagePath[X] === "refused") &&
              !(Le && MACOS_SCREENSHOT_TEMP_RE.test(ge))
              ? [ge]
              : [];
          }).join(`
`);
          if (validImages.length > 0) {
            for (let [X, ge] of validImages.entries()) {
              let filename = basename(ge.path);
              onImagePaste(ge.base64, {
                mediaType: ge.mediaType,
                filename,
                dimensions: ge.dimensions,
                sourcePath: ge.path,
                continuesGesture: X > 0,
              });
            }
            if (joined) submitPastedText(joined);
            finishPaste();
          } else if (Le) {
            if (joined) submitPastedText(joined);
            checkClipboardForImage();
          } else {
            logFeatureSad("input_image_drag", included ? "read_withheld" : "read_failed");
            submitPastedText(te);
            finishPaste();
          }
        })
        .catch((line) => {
          if (!isMountedRef.current) return;
          logFeatureBad("input_image_drag", "read_threw");
          logForDebugging(`Image paste read failed: ${line instanceof Error ? line.message : String(line)}`, {
            level: "error",
          });
          submitPastedText(te);
          finishPaste();
        });
      return;
    }
    submitPastedText(te);
    k();
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
      let U = new PasteEvent(line.key);
      processPastedText(U.text, U.rawEmpty, U.rawEndedWithFocusTail);
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
//@ chunk-e6aww6q8.js:1328376-1328638 placement
async function readPastedPathAnchored(e, n) {
  let r = await readPinnedFile(
    expandPath(e),
    n,
    AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS),
  )((y) => y.handle.readFile());
  let h =
    r === undefined && (await matchesExpectedSpellings(e, n, AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS)))
      ? "absent"
      : "refused";
  if (r === undefined)
    logForDebugging(`Pasted path is not read where it lands: ${h}`, {
      level: "warn",
    });
  return r ?? h;
}
//@ chunk-e6aww6q8.js:1328671-1328724 placement
var expandDotDotPath = (e) => (e.split(/[\\/]/).includes("..") ? expandPath(e) : e);
//@ chunk-e6aww6q8.js:1328724-1329189 placement
/**
 * 检查粘贴的路径能否安全读取：在可写范围内拒绝，必要时限时检查真实路径。
 */
async function examinePastedPath(e, n, r) {
  let s = expandPath(e);
  let h = n();
  if (h.length === 0 || h.some((ke) => r(e, ke) !== undefined)) return "refused";
  if (isDeviceNamespacePath(s) && !h.some(isInstructionReadRestricted)) return "unexamined";
  let w = AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS);
  let results = await Promise.all(
    uniq([s, resolve_2(expandDotDotPath(e))]).map((ke) => spellingsForReadOrFallback(ke, w)),
  );
  let [G] = results;
  let q = n();
  let Z =
    !results.includes(undefined) &&
    q.length > 0 &&
    !q.some((ke) =>
      [e, ...results.flatMap((we) => we ?? [])].some(
        (we) => r(we, ke) !== undefined || isUntrustedAutomountPath(we, ke.trustedNetworkDirectories),
      ),
    );
  let Se = q.some(isInstructionReadRestricted) ? G : "unexamined";
  return Z && Se !== undefined ? Se : "refused";
}
//@ chunk-e6aww6q8.js:1329189-1329439 placement
/**
 * 读取粘贴进输入框的文件路径内容：先做权限与不可信自动挂载检查（拒绝时返回 "refused"），本地普通路径直接读字节，否则通过锚定句柄读取。
 */
async function readPastedPathSafely(line, n, r) {
  let s = await examinePastedPath(line, n, r).catch(() => "refused");
  if (s === "refused") {
    logForDebugging("Pasted path is not read: the read is refused", {
      level: "warn",
    });
    return "refused";
  }
  return s === "unexamined"
    ? getFsImplementation().readFileBytes(expandDotDotPath(line))
    : readPastedPathAnchored(line, s).catch(() => "refused");
}
export { usePasteHandler };
