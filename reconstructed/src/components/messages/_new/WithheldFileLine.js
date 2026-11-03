/**
 * components/messages/_new/WithheldFileLine.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (6)
 * attribution: sole-consumer-new 6
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create_16, create, create_2 } from "../../../../vendor/zod/lib/index.mjs";
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { OCe } from "../../../plugins/functionHooks/toolCallHooks.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";

//@ chunk-ah34pb7m.js:79262-79342 sole-consumer-new
var qQ = DoctorLazy(() =>
  create_16([create({ file_path: create_2().min(1) }), create({ notebook_path: create_2().min(1) })]),
);
//@ chunk-ah34pb7m.js:79342-79346 sole-consumer-new
j();
/**
 * 被扣留文件的一行：说明文本 + 标记 + 加粗路径（从开头截断）。
 */
//@ chunk-ah34pb7m.js:79389-80073 sole-consumer-new
function WithheldFileLine(m) {
  let g = w(15),
    { why: why, path: path } = m,
    f;
  if (g[0] !== path || g[1] !== why)
    ((f = OCe.withheldLine(why, path)), (g[0] = path), (g[1] = why), (g[2] = f));
  else f = g[2];
  let h = f,
    M;
  if (g[3] !== h.lead) ((M = e(Text, { children: h.lead })), (g[3] = h.lead), (g[4] = M));
  else M = g[4];
  let T;
  if (g[5] !== h.mark)
    ((T = e(Box, { flexShrink: 0, marginRight: 1, children: e(Text, { children: h.mark }) })),
      (g[5] = h.mark),
      (g[6] = T));
  else T = g[6];
  let x;
  if (g[7] !== h.path)
    ((x = e(Text, { bold: !0, wrap: "truncate-start", children: h.path })), (g[7] = h.path), (g[8] = x));
  else x = g[8];
  let k;
  if (g[9] !== T || g[10] !== x)
    ((k = r(Box, { flexDirection: "row", children: [T, x] })), (g[9] = T), (g[10] = x), (g[11] = k));
  else k = g[11];
  let b;
  if (g[12] !== M || g[13] !== k)
    ((b = r(Box, { flexDirection: "column", flexShrink: 1, children: [M, k] })),
      (g[12] = M),
      (g[13] = k),
      (g[14] = b));
  else b = g[14];
  return b;
}
//@ chunk-ah34pb7m.js:80073-80168 sole-consumer-new
function MA(x, k) {
  return e(
    MessageResponse,
    { children: e(WithheldFileLine, { why: x.why, path: x.displayPath }) },
    `${k} ${x.path}`,
  );
}
/**
 * 列出被扣留的文件（显示前若干条，其余以"还有 N 个"提示）。
 */
//@ chunk-ah34pb7m.js:80168-80589 sole-consumer-new
function WithheldFilesList(m) {
  let d = w(10),
    c,
    g,
    f,
    h;
  if (d[0] !== m.entries) {
    let withheldShown = OCe.withheldShown(m.entries);
    c = Box;
    g = "column";
    f = withheldShown.shown.map(MA);
    h =
      withheldShown.more > 0 &&
      e(MessageResponse, { children: e(Text, { dimColor: !0, children: OCe.withheldMore(withheldShown) }) });
    ((d[0] = m.entries), (d[1] = c), (d[2] = g), (d[3] = f), (d[4] = h));
  } else ((c = d[1]), (g = d[2]), (f = d[3]), (h = d[4]));
  let T;
  if (d[5] !== c || d[6] !== g || d[7] !== f || d[8] !== h)
    ((T = r(c, { flexDirection: g, children: [f, h] })),
      (d[5] = c),
      (d[6] = g),
      (d[7] = f),
      (d[8] = h),
      (d[9] = T));
  else T = d[9];
  return T;
}
//@ chunk-ah34pb7m.js:80589-80593 sole-consumer-new
j();

export { WithheldFilesList };
