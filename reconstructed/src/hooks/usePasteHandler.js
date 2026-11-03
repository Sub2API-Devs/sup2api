/**
 * hooks/usePasteHandler.ts
 *
 * 粘贴处理：识别大段粘贴/拖入的图片路径，读取图片或剪贴板图片（macOS/WSL），否则把文本交给 onPaste。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePasteHandler.ts
 * pieces: chunk-7p2hc4jn.js (4)
 * attribution: placement 3, callgraph-witnessed 1
 */
import { isAbsolute, basename } from "path";
import { j, Se, y, R, Q, P, Oo, ce } from "../../vendor/react/cjs/react.production.js";
import { imageLimitsForModel } from "../utils/attachmentMedia.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { useClock } from "../ink/components/ClockContext.js";
import { gM } from "../state/AppState.js";
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
import { readPastedPathSafely } from "./_new/examinePastedPath.js";
import { s$i } from "../utils/claudemd.js";
import { getAttachmentReadBlockReason } from "../utils/attachments/fileAttachments.js";
import { logForDebugging } from "../utils/debug.js";
import { PasteEvent } from "../ink/frame.js";

//@ chunk-7p2hc4jn.js:51533-51537 placement
j();
//@ chunk-7p2hc4jn.js:51587-51826 placement
var CLIPBOARD_CHECK_DEBOUNCE_MS = 50,
  PATH_SPLIT_RE = / (?=["']?(?:\/|[A-Za-z]:\\))/,
  UNQUOTED_PATH_RE = /^(?:\/(?!\/)[^ \r\\/]*(?:\\.[^ \r\\/]*)*\/|[A-Za-z]:\\|\\\\)[^\r]*$/,
  QUOTED_PATH_RE = /^(["'])(?:\/[^/\r]+\/|[A-Za-z]:\\|\\\\)[^\r]*\1$/,
  Dr = /[^\\] /,
  MACOS_SCREENSHOT_TEMP_RE = /\/TemporaryItems\/.*screencaptureui.*\/Screenshot/i;
//@ chunk-7p2hc4jn.js:51826-51856 placement
function getClipboardPlatform() {
  return imageLimitsForModel(getMainLoopModel());
}
/**
 * 粘贴/拖放处理：长于阈值的按键序列视为粘贴；把粘贴文本按行拆分，识别图片路径（含 macOS 截图临时目录），并行读取图片并调用 onImagePaste，其余文本交 onPaste；空粘贴在 macOS/WSL 上改读剪贴板图片；粘贴期间吞掉紧随的回车并在结束后补发。
 */
//@ chunk-7p2hc4jn.js:51856-54705 callgraph-witnessed = usePasteHandler (0.228)
function usePasteHandler({
  onPaste: onPaste,
  handleKeyDown: handleKeyDown,
  onImagePaste: onImagePaste,
  onUnreadImagePaste: onUnreadImagePaste,
}) {
  let o = useClock(),
    u = Se(gM),
    [isPasting, setIsPasting] = y(!1),
    isMountedRef = R(!0),
    isPasteInProgressRef = R(!1),
    pendingReturnRef = R(!1),
    [A, F] = y(0),
    isMacOS = Q(() => getPlatform() === "macos", []),
    isWSL = Q(() => getPlatform() === "wsl", []);
  P(
    () => () => {
      isMountedRef.current = !1;
    },
    [],
  );
  let replayReturn = Oo(() => {
    handleKeyDown(
      new KeyboardEvent({
        kind: "key",
        name: "return",
        fn: !1,
        ctrl: !1,
        meta: !1,
        shift: !1,
        option: !1,
        super: !1,
        sequence: "\r",
        raw: "\r",
        code: void 0,
        col: void 0,
        row: void 0,
      }),
    );
  });
  P(() => {
    if (A === 0) return;
    return o.setTimeout(() => {
      if (((isPasteInProgressRef.current = !1), pendingReturnRef.current))
        ((pendingReturnRef.current = !1), replayReturn());
    }, 0);
  }, [A, o]);
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
          if (isMountedRef.current)
            (logFeatureBad("input_image_paste", "clipboard_read_failed"), logError(error));
        })
        .finally(() => {
          finishPaste();
        });
    }, [onImagePaste]),
    checkClipboardForImage = useDebouncedCallback(readClipboardImage, CLIPBOARD_CHECK_DEBOUNCE_MS);
  function submitPastedText(S) {
    if (onPaste) {
      onPaste(S);
      return;
    }
    handleKeyDown(
      new KeyboardEvent({
        kind: "key",
        name: void 0,
        fn: !1,
        ctrl: !1,
        meta: !1,
        shift: !1,
        option: !1,
        super: !1,
        sequence: S,
        raw: S,
        code: void 0,
        col: void 0,
        row: void 0,
      }),
    );
  }
  function finishPaste() {
    if (!isMountedRef.current) return;
    ((isPasteInProgressRef.current = !1), (pendingReturnRef.current = !1), setIsPasting(!1));
  }
  function k() {
    (setIsPasting(!1), F((currentTimeoutId) => currentTimeoutId + 1));
  }
  function processPastedText(S, U = S.length === 0, oe = S.endsWith("[I") || S.endsWith("[O")) {
    isPasteInProgressRef.current = !0;
    let te = oe ? S.replace(/\[[IO]$/, "") : S;
    if (U && (isMacOS || isWSL) && onImagePaste) {
      checkClipboardForImage();
      return;
    }
    if (U && onImagePaste) onUnreadImagePaste?.();
    let J = [],
      M = [];
    for (let q of te.split(`
`)) {
      let lines = q.split(PATH_SPLIT_RE).filter((part) => part.trim());
      if (
        lines.length > 1 &&
        !lines.every((line) => {
          let trimmed = line.trim();
          return (
            QUOTED_PATH_RE.test(trimmed) ||
            (UNQUOTED_PATH_RE.test(trimmed) && (!Dr.test(trimmed) || isImageFilePath(trimmed)))
          );
        })
      ) {
        M.push(q);
        continue;
      }
      for (let B of lines)
        if (isImageFilePath(B)) (M.push(J.length), J.push(B));
        else M.push(B);
    }
    if (onImagePaste && J.length > 0) {
      let any = J.some((B) => MACOS_SCREENSHOT_TEMP_RE.test(B)),
        re = getClipboardPlatform();
      Promise.all(
        J.map((B) =>
          tryReadImageFromPath(B, re, (line) =>
            readPastedPathSafely(
              line,
              () => {
                let le = u?.getState().toolPermissionContext;
                return le ? [le, s$i(le)] : [];
              },
              (le, ye) => getAttachmentReadBlockReason(le, ye, "person"),
            ),
          ),
        ),
      )
        .then((imagePath) => {
          if (!isMountedRef.current) return;
          let included = imagePath.includes("refused"),
            all = J.every((results) => isAbsolute(asImageFilePath(results) ?? "")),
            validImages = imagePath.filter((X) => X !== null && X !== "refused"),
            Le = validImages.length === 0 && any && isMacOS && !included && all,
            joined = M.flatMap((X) => {
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
                filename: filename,
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
          } else
            (logFeatureSad("input_image_drag", included ? "read_withheld" : "read_failed"),
              submitPastedText(te),
              finishPaste());
        })
        .catch((line) => {
          if (!isMountedRef.current) return;
          (logFeatureBad("input_image_drag", "read_threw"),
            logForDebugging(
              `Image paste read failed: ${line instanceof Error ? line.message : String(line)}`,
              { level: "error" },
            ),
            submitPastedText(te),
            finishPaste());
        });
      return;
    }
    (submitPastedText(te), k());
  }
  function handlePaste(part) {
    (part.preventDefault(),
      setIsPasting(!0),
      processPastedText(part.text, part.rawEmpty, part.rawEndedWithFocusTail));
  }
  function handleKeyDown_2(line) {
    if (isPasteInProgressRef.current && line.name === "return") {
      (line.preventDefault(), (pendingReturnRef.current = !0));
      return;
    }
    if (
      (onPaste || onImagePaste) &&
      !line.ctrl &&
      !line.meta &&
      line.key.length > PASTE_THRESHOLD &&
      !line.defaultPrevented
    ) {
      (line.preventDefault(), setIsPasting(!0));
      let U = new PasteEvent(line.key);
      processPastedText(U.text, U.rawEmpty, U.rawEndedWithFocusTail);
      return;
    }
    handleKeyDown(line);
  }
  return { handleKeyDown: handleKeyDown_2, handlePaste: handlePaste, isPasting: isPasting };
}

export { usePasteHandler };
