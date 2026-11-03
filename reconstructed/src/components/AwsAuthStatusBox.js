/**
 * components/AwsAuthStatusBox.tsx
 *
 * AWS（Bedrock）认证刷新状态框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AwsAuthStatusBox.tsx
 * pieces: chunk-znr63w8n.js (4)
 * attribution: placement 1, file-local 1, layout 1, fingerprint 1
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../ink/components/Text.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { AwsAuthStatusManager } from "../utils/awsAuthStatusManager.js";
import { ErrorText } from "./ErrorText.js";
import { ShutdownRequestDisplay } from "./messages/ShutdownMessage.js";

//@ chunk-znr63w8n.js:521-525 placement
j();
//@ chunk-znr63w8n.js:525-745 file-local
function renderLineWithLinks(line, index) {
  let match = line.match(A);
  if (!match) {
    return e(Text, { dimColor: !0, children: line }, index);
  }
  let url = match[0];
  let start = match.index ?? 0;
  let before = line.slice(0, start);
  let after = line.slice(start + url.length);
  return r(Text, { dimColor: !0, children: [before, e(Link, { url: url, children: url }), after] }, index);
}
//@ chunk-znr63w8n.js:745-768 layout
var A = /https?:\/\/\S+/;
//@ chunk-znr63w8n.js:768-1479 fingerprint = AwsAuthStatusBox (0.535)
function AwsAuthStatusBox() {
  let $ = w(10),
    f;
  if ($[0] === MEMO_CACHE_SENTINEL) ((f = AwsAuthStatusManager.getInstance().getStatus()), ($[0] = f));
  else f = $[0];
  let [t, C] = y(f),
    m,
    d;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((m = () => AwsAuthStatusManager.getInstance().subscribe(C)), (d = []), ($[1] = m), ($[2] = d));
  else ((m = $[1]), (d = $[2]));
  if ((P(m, d), !t.isAuthenticating && !t.error && t.output.length === 0)) {
    return null;
  }
  if (!t.isAuthenticating && !t.error) {
    return null;
  }
  let u;
  if ($[3] !== t.output)
    ((u =
      t.output.length > 0 &&
      e(Box, { flexDirection: "column", children: t.output.slice(-5).map(renderLineWithLinks) })),
      ($[3] = t.output),
      ($[4] = u));
  else u = $[4];
  let i;
  if ($[5] !== t.error) ((i = t.error && e(ErrorText, { error: t.error })), ($[5] = t.error), ($[6] = i));
  else i = $[6];
  let g;
  if ($[7] !== u || $[8] !== i)
    ((g = e(Box, {
      marginY: 1,
      children: r(ShutdownRequestDisplay, { color: "permission", title: "Authentication", children: [u, i] }),
    })),
      ($[7] = u),
      ($[8] = i),
      ($[9] = g));
  else g = $[9];
  return g;
}

export { AwsAuthStatusBox };
