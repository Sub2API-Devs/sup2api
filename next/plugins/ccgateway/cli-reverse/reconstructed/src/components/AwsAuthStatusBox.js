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
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../ink/components/Text.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { AwsAuthStatusManager } from "../utils/awsAuthStatusManager.js";
import { ErrorText } from "./ErrorText.js";
import { ShutdownRequestDisplay } from "./messages/ShutdownMessage.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-znr63w8n.js:521-525 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-znr63w8n.js:521", () => {
  init_react_production();
});
//@ chunk-znr63w8n.js:525-745 file-local
function renderLineWithLinks(line, index) {
  let m = line.match(URL_PATTERN);
  if (!m) {
    return jsxProd_default(
      Text,
      {
        dimColor: true,
        children: line,
      },
      index,
    );
  }
  let url = m[0];
  let start = m.index ?? 0;
  let before = line.slice(0, start);
  let after = line.slice(start + url.length);
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        before,
        jsxProd_default(Link, {
          url,
          children: url,
        }),
        after,
      ],
    },
    index,
  );
}
//@ chunk-znr63w8n.js:745-768 layout
var URL_PATTERN = /https?:\/\/\S+/;
//@ chunk-znr63w8n.js:768-1479 fingerprint (2.1.88 match: AwsAuthStatusBox, 0.535)
function AwsAuthStatusBox() {
  let $ = useMemoCache(10);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = AwsAuthStatusManager.getInstance().getStatus();
    $[0] = t0;
  } else t0 = $[0];
  let [status, setStatus] = useState(t0);
  let t1;
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = () => AwsAuthStatusManager.getInstance().subscribe(setStatus);
    t2 = [];
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useEffect(t1, t2);
  if (!status.isAuthenticating && !status.error && status.output.length === 0) {
    return null;
  }
  if (!status.isAuthenticating && !status.error) {
    return null;
  }
  let props;
  if ($[3] !== status.output) {
    props =
      status.output.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        children: status.output.slice(-5).map(renderLineWithLinks),
      });
    $[3] = status.output;
    $[4] = props;
  } else props = $[4];
  let t5;
  if ($[5] !== status.error) {
    t5 =
      status.error &&
      jsxProd_default(ErrorText, {
        error: status.error,
      });
    $[5] = status.error;
    $[6] = t5;
  } else t5 = $[6];
  let info;
  if ($[7] !== props || $[8] !== t5) {
    info = jsxProd_default(Box, {
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "permission",
        title: "Authentication",
        children: [props, t5],
      }),
    });
    $[7] = props;
    $[8] = t5;
    $[9] = info;
  } else info = $[9];
  return info;
}
export { AwsAuthStatusBox };
