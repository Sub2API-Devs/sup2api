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
import { init_react_production, y, R, ce, P } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { probeLinuxClipboard, getClipboardPath, setClipboard } from "../ink/termio/osc.js";
import { hasUnknownSequencePrintingBug } from "../ink/terminal.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-m3v0cw0p.js:460-464 placement
init_react_production();
//@ chunk-m3v0cw0p.js:464-482 placement
var COPY_CONFIRM_MS = 2000;
var COPY_FAILED_MS = 2000;
//@ chunk-m3v0cw0p.js:482-1276 placement
function useCopyUrl(c) {
  let clock = useClock();
  let [i, t] = y(null);
  let o = R(null);
  let u = R(null);
  let l = R(null);
  let a = R(0);
  let s = R(true);
  let p = ce(() => {
    a.current += 1;
    l.current?.();
    l.current = null;
    u.current = null;
    o.current?.();
    o.current = null;
    t(null);
  }, []);
  P(() => {
    p();
    if (c !== null) probeLinuxClipboard();
  }, [c, p]);
  P(() => {
    s.current = true;
    return () => {
      s.current = false;
      l.current?.();
      l.current = null;
      u.current = null;
      o.current?.();
      o.current = null;
    };
  }, []);
  let copy = ce(
    (d) => {
      if (u.current === d) return;
      u.current = d;
      l.current?.();
      l.current = clock.setTimeout(() => {
        l.current = null;
        u.current = null;
      }, COPY_CONFIRM_MS);
      let clipboardPath = getClipboardPath();
      let V = a.current;
      setClipboard(d).then((v) => {
        if (!s.current || V !== a.current) return;
        if (v) process.stdout.write(v);
        o.current?.();
        o.current = null;
        let f = clipboardPath;
        if (clipboardPath === "osc52" && hasUnknownSequencePrintingBug())
          f = getClipboardPath() === "native" ? "native" : "none";
        t(f);
        if (f === "native")
          o.current = clock.setTimeout(() => {
            o.current = null;
            t(null);
          }, COPY_FAILED_MS);
      });
    },
    [clock],
  );
  return {
    copiedVia: i,
    copy,
    reset: p,
  };
}
//@ chunk-m3v0cw0p.js:1276-1564 placement
/**
 * 复制 URL 提示（前半）：原生剪贴板成功显示 (Copied!)，尚未复制时显示 c 键复制的快捷提示。
 */
function CopiedUrlHint(props) {
  let $ = w(2);
  let { via } = props;
  if (via === "native") {
    let t;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t = jsxProd_default(Text, {
        color: "success",
        children: "(Copied!)",
      });
      $[0] = t;
    } else t = $[0];
    return t;
  }
  if (via === null) {
    let t;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      t = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "c",
          action: "copy",
          parens: true,
        }),
      });
      $[1] = t;
    } else t = $[1];
    return t;
  }
  return null;
}
//@ chunk-m3v0cw0p.js:1564-2097 placement
/**
 * 复制 URL 提示（后半）：tmux 缓冲区、OSC 52 或复制失败时分别给出手动选择 URL 的说明。
 */
function CopyUrlFallbackHint(props) {
  let $ = w(3);
  let { via } = props;
  if (via === "tmux-buffer") {
    let t;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t = jsxProd_default(Text, {
        dimColor: true,
        children: "(Copied to tmux buffer \xB7 select the URL manually if paste fails)",
      });
      $[0] = t;
    } else t = $[0];
    return t;
  }
  if (via === "none") {
    let t;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      t = jsxProd_default(Text, {
        dimColor: true,
        children: "(Couldn't copy \xB7 select the URL and copy it with your terminal)",
      });
      $[1] = t;
    } else t = $[1];
    return t;
  }
  if (via === "osc52") {
    let t;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      t = jsxProd_default(Text, {
        dimColor: true,
        children: "(Sent via OSC 52 \xB7 select the URL manually if paste fails)",
      });
      $[2] = t;
    } else t = $[2];
    return t;
  }
  return null;
}
export { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint };
