/**
 * components/CopyUrlHint.tsx
 *
 * 2.1.316 新增。复制 URL 的快捷提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m3v0cw0p.js (5)
 * attribution: placement 5
 */
import {
  init_react_production,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { probeLinuxClipboard, getClipboardPath, setClipboard } from "../ink/termio/osc.js";
import { hasUnknownSequencePrintingBug } from "../ink/terminal.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m3v0cw0p.js:460-464 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m3v0cw0p.js:460", () => {
  init_react_production();
});
//@ chunk-m3v0cw0p.js:464-482 placement
var COPY_CONFIRM_MS = 2000;
var COPY_FAILED_MS = 2000;
//@ chunk-m3v0cw0p.js:482-1276 placement
function useCopyUrl(url) {
  let clock = useClock();
  let [copiedVia, setCopiedVia] = useState(null);
  let copiedTimerRef = useRef(null);
  let lastCopiedValueRef = useRef(null);
  let copiedResetTimerRef = useRef(null);
  let generationRef = useRef(0);
  let mountedRef = useRef(true);
  let reset = useCallback(() => {
    generationRef.current += 1;
    copiedResetTimerRef.current?.();
    copiedResetTimerRef.current = null;
    lastCopiedValueRef.current = null;
    copiedTimerRef.current?.();
    copiedTimerRef.current = null;
    setCopiedVia(null);
  }, []);
  useEffect(() => {
    reset();
    if (url !== null) probeLinuxClipboard();
  }, [url, reset]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      copiedResetTimerRef.current?.();
      copiedResetTimerRef.current = null;
      lastCopiedValueRef.current = null;
      copiedTimerRef.current?.();
      copiedTimerRef.current = null;
    };
  }, []);
  let copy = useCallback(
    (text) => {
      if (lastCopiedValueRef.current === text) return;
      lastCopiedValueRef.current = text;
      copiedResetTimerRef.current?.();
      copiedResetTimerRef.current = clock.setTimeout(() => {
        copiedResetTimerRef.current = null;
        lastCopiedValueRef.current = null;
      }, COPY_CONFIRM_MS);
      let clipboardPath = getClipboardPath();
      let generation = generationRef.current;
      setClipboard(text).then((notice) => {
        if (!mountedRef.current || generation !== generationRef.current) return;
        if (notice) process.stdout.write(notice);
        copiedTimerRef.current?.();
        copiedTimerRef.current = null;
        let via = clipboardPath;
        if (clipboardPath === "osc52" && hasUnknownSequencePrintingBug())
          via = getClipboardPath() === "native" ? "native" : "none";
        setCopiedVia(via);
        if (via === "native")
          copiedTimerRef.current = clock.setTimeout(() => {
            copiedTimerRef.current = null;
            setCopiedVia(null);
          }, COPY_FAILED_MS);
      });
    },
    [clock],
  );
  return {
    copiedVia,
    copy,
    reset,
  };
}
//@ chunk-m3v0cw0p.js:1276-1564 placement
/**
 * 复制 URL 提示（前半）：原生剪贴板成功显示 (Copied!)，尚未复制时显示 c 键复制的快捷提示。
 */
function CopiedUrlHint(props) {
  let $ = useMemoCache(2);
  let { via } = props;
  if (via === "native") {
    let copiedText;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      copiedText = jsxProd_default(Text, {
        color: "success",
        children: "(Copied!)",
      });
      $[0] = copiedText;
    } else copiedText = $[0];
    return copiedText;
  }
  if (via === null) {
    let hintNode;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      hintNode = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "c",
          action: "copy",
          parens: true,
        }),
      });
      $[1] = hintNode;
    } else hintNode = $[1];
    return hintNode;
  }
  return null;
}
//@ chunk-m3v0cw0p.js:1564-2097 placement
/**
 * 复制 URL 提示（后半）：tmux 缓冲区、OSC 52 或复制失败时分别给出手动选择 URL 的说明。
 */
function CopyUrlFallbackHint(props) {
  let $ = useMemoCache(3);
  let { via } = props;
  if (via === "tmux-buffer") {
    let tmuxText;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      tmuxText = jsxProd_default(Text, {
        dimColor: true,
        children: "(Copied to tmux buffer \xB7 select the URL manually if paste fails)",
      });
      $[0] = tmuxText;
    } else tmuxText = $[0];
    return tmuxText;
  }
  if (via === "none") {
    let noneText;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      noneText = jsxProd_default(Text, {
        dimColor: true,
        children: "(Couldn't copy \xB7 select the URL and copy it with your terminal)",
      });
      $[1] = noneText;
    } else noneText = $[1];
    return noneText;
  }
  if (via === "osc52") {
    let osc52Text;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      osc52Text = jsxProd_default(Text, {
        dimColor: true,
        children: "(Sent via OSC 52 \xB7 select the URL manually if paste fails)",
      });
      $[2] = osc52Text;
    } else osc52Text = $[2];
    return osc52Text;
  }
  return null;
}
export { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint };
