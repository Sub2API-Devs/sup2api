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
import { j, y, R, ce, P } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { probeLinuxClipboard, getClipboardPath, setClipboard } from "../ink/termio/osc.js";
import { HX } from "../ink/terminal.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-m3v0cw0p.js:460-464 placement
j();
//@ chunk-m3v0cw0p.js:464-482 placement
var k = 2000,
  U = 2000;
//@ chunk-m3v0cw0p.js:482-1276 placement
function useCopyUrl(c) {
  let r = useClock(),
    [i, t] = y(null),
    o = R(null),
    u = R(null),
    l = R(null),
    a = R(0),
    s = R(!0),
    p = ce(() => {
      ((a.current += 1),
        l.current?.(),
        (l.current = null),
        (u.current = null),
        o.current?.(),
        (o.current = null),
        t(null));
    }, []);
  (P(() => {
    if ((p(), c !== null)) probeLinuxClipboard();
  }, [c, p]),
    P(
      () => (
        (s.current = !0),
        () => {
          ((s.current = !1),
            l.current?.(),
            (l.current = null),
            (u.current = null),
            o.current?.(),
            (o.current = null));
        }
      ),
      [],
    ));
  let h = ce(
    (d) => {
      if (u.current === d) return;
      ((u.current = d),
        l.current?.(),
        (l.current = r.setTimeout(() => {
          ((l.current = null), (u.current = null));
        }, k)));
      let m = getClipboardPath(),
        V = a.current;
      setClipboard(d).then((v) => {
        if (!s.current || V !== a.current) return;
        if (v) process.stdout.write(v);
        (o.current?.(), (o.current = null));
        let f = m;
        if (m === "osc52" && HX()) f = getClipboardPath() === "native" ? "native" : "none";
        if ((t(f), f === "native"))
          o.current = r.setTimeout(() => {
            ((o.current = null), t(null));
          }, U);
      });
    },
    [r],
  );
  return { copiedVia: i, copy: h, reset: p };
}
/**
 * 复制 URL 提示（前半）：原生剪贴板成功显示 (Copied!)，尚未复制时显示 c 键复制的快捷提示。
 */
//@ chunk-m3v0cw0p.js:1276-1564 placement
function CopiedUrlHint(c) {
  let $ = w(2),
    { via: via } = c;
  if (via === "native") {
    let t;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((t = e(Text, { color: "success", children: "(Copied!)" })), ($[0] = t));
    else t = $[0];
    return t;
  }
  if (via === null) {
    let t;
    if ($[1] === MEMO_CACHE_SENTINEL)
      ((t = e(Text, {
        dimColor: !0,
        children: e(KeyboardShortcutHint, { chord: "c", action: "copy", parens: !0 }),
      })),
        ($[1] = t));
    else t = $[1];
    return t;
  }
  return null;
}
/**
 * 复制 URL 提示（后半）：tmux 缓冲区、OSC 52 或复制失败时分别给出手动选择 URL 的说明。
 */
//@ chunk-m3v0cw0p.js:1564-2097 placement
function CopyUrlFallbackHint(props) {
  let $ = w(3),
    { via: via } = props;
  if (via === "tmux-buffer") {
    let t;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((t = e(Text, {
        dimColor: !0,
        children: "(Copied to tmux buffer \xB7 select the URL manually if paste fails)",
      })),
        ($[0] = t));
    else t = $[0];
    return t;
  }
  if (via === "none") {
    let t;
    if ($[1] === MEMO_CACHE_SENTINEL)
      ((t = e(Text, {
        dimColor: !0,
        children: "(Couldn't copy \xB7 select the URL and copy it with your terminal)",
      })),
        ($[1] = t));
    else t = $[1];
    return t;
  }
  if (via === "osc52") {
    let t;
    if ($[2] === MEMO_CACHE_SENTINEL)
      ((t = e(Text, {
        dimColor: !0,
        children: "(Sent via OSC 52 \xB7 select the URL manually if paste fails)",
      })),
        ($[2] = t));
    else t = $[2];
    return t;
  }
  return null;
}

export { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint };
