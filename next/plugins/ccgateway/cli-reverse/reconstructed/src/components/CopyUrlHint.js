/**
 * components/CopyUrlHint.tsx
 *
 * 2.1.316 新增。复制 URL 的快捷提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z8py8v9b.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z8py8v9b.js:462-466 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z8py8v9b.js:462", () => {
  init_react_production();
});
//@ chunk-z8py8v9b.js:466-484 placement
var COPY_CONFIRM_MS = 2000;
var COPY_FAILED_MS = 2000;
//@ chunk-z8py8v9b.js:484-1278 placement
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
//@ chunk-z8py8v9b.js:1278-1566 placement
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
//@ chunk-z8py8v9b.js:1566-2160 placement
/**
 * 复制 URL 提示（后半）：tmux 缓冲区、OSC 52 或复制失败时分别给出手动选择 URL 的说明。
 */
function CopyUrlFallbackHint(props) {
  let $ = useMemoCache(6);
  let { via, noun } = props;
  let nounLabel = noun === undefined ? "URL" : noun;
  if (via === "tmux-buffer") {
    let tmuxText;
    if ($[0] !== nounLabel) {
      tmuxText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["(Copied to tmux buffer \xB7 select the ", nounLabel, " manually if paste fails)"],
      });
      $[0] = nounLabel;
      $[1] = tmuxText;
    } else tmuxText = $[1];
    return tmuxText;
  }
  if (via === "none") {
    let noneText;
    if ($[2] !== nounLabel) {
      noneText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["(Couldn't copy \xB7 select the ", nounLabel, " and copy it with your terminal)"],
      });
      $[2] = nounLabel;
      $[3] = noneText;
    } else noneText = $[3];
    return noneText;
  }
  if (via === "osc52") {
    let osc52Text;
    if ($[4] !== nounLabel) {
      osc52Text = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["(Sent via OSC 52 \xB7 select the ", nounLabel, " manually if paste fails)"],
      });
      $[4] = nounLabel;
      $[5] = osc52Text;
    } else osc52Text = $[5];
    return osc52Text;
  }
  return null;
}
export { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint };
