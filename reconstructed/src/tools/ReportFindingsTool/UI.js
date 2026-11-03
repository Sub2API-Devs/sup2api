/**
 * tools/ReportFindingsTool/UI.tsx
 *
 * 2.1.316 新增：按文件分组显示审查发现；一条审查发现等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (16)
 * attribution: placement 16
 */
import { bunStringWidth } from "../../ink/stringWidth.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";
import { usePrefersReducedMotion, VDe } from "../../components/Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { ShimmerChar } from "../../components/PromptInput/ShimmeredInput.js";
import { truncateToWidthNoEllipsis } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:25831-25860 placement
function TM(m, d) {
  return null;
}
//@ chunk-ah34pb7m.js:25860-25886 placement
function MM() {
  return null;
}
//@ chunk-ah34pb7m.js:25886-25915 placement
function yM(m, d) {
  return null;
}
//@ chunk-ah34pb7m.js:25915-25980 placement
function zP(ae) {
  return ae.line === void 0 ? 0 : String(ae.line).length;
}
//@ chunk-ah34pb7m.js:25980-26040 placement
function QP(pe) {
  return pe.category ? bunStringWidth(`[${pe.category}]`) : 0;
}
//@ chunk-ah34pb7m.js:26040-26093 placement
var bM = { CONFIRMED: "error", PLAUSIBLE: "warning" },
  RM = 16;
//@ chunk-ah34pb7m.js:26093-26208 placement
function renderFindingsResult(m, d, { verbose: verbose }) {
  let g = m?.findings ?? [];
  if (g.length === 0) return null;
  return e(FindingsList, { findings: g, verbose: verbose });
}
/**
 * 按文件分组显示审查发现。
 */
//@ chunk-ah34pb7m.js:26208-27947 placement
function FindingsList(m) {
  let f = w(23),
    { findings: findings, verbose: verbose } = m,
    { columns: columns } = useTerminalSize(),
    h,
    M,
    T,
    x;
  if (f[0] !== columns || f[1] !== findings || f[2] !== verbose) {
    let k = new Map();
    for (const b of findings) {
      let E = k.get(b.file) ?? [];
      (E.push(b), k.set(b.file, E));
    }
    let B;
    if (f[7] !== findings) ((B = Math.max(0, ...findings.map(zP))), (f[7] = findings), (f[8] = B));
    else B = f[8];
    let L = B;
    let N;
    if (f[9] !== findings) ((N = Math.max(0, ...findings.map(QP))), (f[9] = findings), (f[10] = N));
    else N = f[10];
    let min = Math.min(24, N);
    let U = columns - 14 - (L > 0 ? L + 1 : 0) - (min > 0 ? min + 1 : 0);
    let K = U >= RM;
    M = MessageResponse;
    h = Box;
    T = "column";
    const V = [...k.entries()];
    let Y;
    if (f[11] !== K || f[12] !== min || f[13] !== L || f[14] !== verbose)
      ((Y = (X) => {
        let [z, ee] = X;
        return r(
          Box,
          {
            flexDirection: "column",
            children: [
              e(Text, { color: "suggestion", children: z }),
              ee.map((le, ge) =>
                r(
                  Box,
                  {
                    flexDirection: "column",
                    children: [
                      K
                        ? r(Box, {
                            columnGap: 1,
                            paddingLeft: 2,
                            children: [
                              e(Box, { flexShrink: 0, children: e(FindingStatusIcon, { finding: le }) }),
                              L > 0
                                ? e(Box, {
                                    flexShrink: 0,
                                    width: L,
                                    justifyContent: "flex-end",
                                    children: e(Text, { color: "suggestion", children: le.line }),
                                  })
                                : null,
                              min > 0
                                ? e(Box, {
                                    flexShrink: 0,
                                    width: min,
                                    children: e(Text, {
                                      dimColor: !0,
                                      children: le.category ? `[${le.category}]` : "",
                                    }),
                                  })
                                : null,
                              e(Box, { flexGrow: 1, children: e(FindingRow, { finding: le }) }),
                            ],
                          })
                        : e(Box, {
                            paddingLeft: 2,
                            children: r(Text, {
                              wrap: "wrap",
                              children: [
                                e(FindingStatusIcon, { finding: le }),
                                le.line === void 0
                                  ? null
                                  : r(Text, { color: "suggestion", children: [" ", le.line] }),
                                le.category
                                  ? r(Text, { dimColor: !0, children: [" [", le.category, "]"] })
                                  : null,
                                " ",
                                e(FindingRow, { finding: le }),
                              ],
                            }),
                          }),
                      verbose &&
                        e(Box, {
                          paddingLeft: 4,
                          children: e(Text, { dimColor: !0, wrap: "wrap", children: le.failure_scenario }),
                        }),
                    ],
                  },
                  ge,
                ),
              ),
            ],
          },
          z,
        );
      }),
        (f[11] = K),
        (f[12] = min),
        (f[13] = L),
        (f[14] = verbose),
        (f[15] = Y));
    else Y = f[15];
    x = V.map(Y);
    ((f[0] = columns), (f[1] = findings), (f[2] = verbose), (f[3] = h), (f[4] = M), (f[5] = T), (f[6] = x));
  } else ((h = f[3]), (M = f[4]), (T = f[5]), (x = f[6]));
  let B;
  if (f[16] !== h || f[17] !== T || f[18] !== x)
    ((B = e(h, { flexDirection: T, children: x })), (f[16] = h), (f[17] = T), (f[18] = x), (f[19] = B));
  else B = f[19];
  let N;
  if (f[20] !== M || f[21] !== B) ((N = e(M, { children: B })), (f[20] = M), (f[21] = B), (f[22] = N));
  else N = f[22];
  return N;
}
//@ chunk-ah34pb7m.js:27947-28194 placement
function FindingStatusIcon(m) {
  let f = w(3),
    { finding: finding } = m;
  const c = finding.outcome === "fixed" ? "success" : finding.verdict ? bM[finding.verdict] : void 0,
    g = finding.outcome === "fixed" ? "\u2713" : "\u25CF";
  let h;
  if (f[0] !== c || f[1] !== g)
    ((h = e(Text, { color: c, children: g })), (f[0] = c), (f[1] = g), (f[2] = h));
  else h = f[2];
  return h;
}
/**
 * 一条审查发现。
 */
//@ chunk-ah34pb7m.js:28194-28548 placement
function FindingRow(m) {
  let c = w(5),
    { finding: finding } = m,
    g;
  if (c[0] !== finding.outcome)
    ((g =
      finding.outcome && finding.outcome !== "fixed"
        ? r(Text, {
            dimColor: !0,
            children: [" [", finding.outcome === "skipped" ? "skipped" : "no change needed", "]"],
          })
        : null),
      (c[0] = finding.outcome),
      (c[1] = g));
  else g = c[1];
  let f;
  if (c[2] !== finding.summary || c[3] !== g)
    ((f = r(Text, { wrap: "wrap", children: [finding.summary, g] })),
      (c[2] = finding.summary),
      (c[3] = g),
      (c[4] = f));
  else f = c[4];
  return f;
}
//@ chunk-ah34pb7m.js:28548-28558 placement
var Hi = 10;
//@ chunk-ah34pb7m.js:28558-28744 placement
function useShimmerOffset(m) {
  let T = w(3),
    d = usePrefersReducedMotion(),
    c = m > 0 && !d,
    [g, f] = useAnimationFrame(c ? 50 : null),
    h = m + Hi * 2;
  const M = c ? (Math.floor(f / 50) % h) - Hi : VDe;
  let x;
  if (T[0] !== g || T[1] !== M) ((x = [g, M]), (T[0] = g), (T[1] = M), (T[2] = x));
  else x = T[2];
  return x;
}
/**
 * 闪烁文字。
 */
//@ chunk-ah34pb7m.js:28744-29075 placement = ShimmerChar (0.914)
function ShimmerText(t0) {
  let $ = w(7),
    { text: text, color: color, shimmerColor: shimmerColor, glimmerIndex: glimmerIndex } = t0,
    M;
  if ($[0] !== text) ((M = [...text]), ($[0] = text), ($[1] = M));
  else M = $[1];
  let T;
  if ($[2] !== color || $[3] !== glimmerIndex || $[4] !== shimmerColor || $[5] !== M)
    ((T = e(Text, {
      children: M.map((x, k) =>
        e(
          ShimmerChar,
          { char: x, index: k, glimmerIndex: glimmerIndex, messageColor: color, shimmerColor: shimmerColor },
          k,
        ),
      ),
    })),
      ($[2] = color),
      ($[3] = glimmerIndex),
      ($[4] = shimmerColor),
      ($[5] = M),
      ($[6] = T));
  else T = $[6];
  return T;
}
//@ chunk-ah34pb7m.js:29075-29102 placement
function EM(m) {
  return null;
}
//@ chunk-ah34pb7m.js:29102-29118 placement
var AM = 2,
  IM = 160;
//@ chunk-ah34pb7m.js:29118-29236 placement
function truncateFindingSummary(m) {
  let parts = m.split(`
`),
    c = m;
  if (parts.length > AM)
    c = parts.slice(0, AM).join(`
`);
  if (bunStringWidth(c) > IM) c = truncateToWidthNoEllipsis(c, IM);
  return c.trim();
}

export { truncateFindingSummary, useShimmerOffset, ShimmerText, renderFindingsResult, yM, TM, MM, EM };
