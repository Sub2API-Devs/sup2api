/**
 * ink/components/ErrorOverview.tsx
 *
 * 渲染出错时的错误面板（消息、精简后的调用栈与源码片段）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/ErrorOverview.tsx
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1
 */
import { readFileSync } from "fs";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { wl, BaseText } from "./Text.js";
import { Wd } from "../../../vendor/code-excerpt/dist/index.js";
import { BaseBox } from "./Box.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-bzr73sfg.js:227142-227193 sole-consumer
function rC(n) {
  let { value: ae } = n;
  return ae.length > fb;
}
//@ chunk-bzr73sfg.js:227193-227254 sole-consumer = formatUri (1)
var Es = (n) => n?.replace(`file://${process.cwd()}/`, ""),
  fb = 200;
/**
 * 堆栈帧路径是否是打包内部路径（$bunfs、~BUN、/snapshot/、node:），这些不读源码。
 */
//@ chunk-bzr73sfg.js:227254-227366 affinity
function isInternalStackPath(path) {
  return (
    path.includes("$bunfs") ||
    path.includes("~BUN") ||
    path.includes("/snapshot/") ||
    path.startsWith("node:")
  );
}
/**
 * 渲染出错时的错误页：ERROR 标题与消息、出错位置、读源码显示附近几行（超长行不显示）、解析后的堆栈。
 */
//@ chunk-bzr73sfg.js:227366-229377 fingerprint = ErrorOverview (0.868)
function ErrorOverview(n) {
  let f = w(22),
    { error: error } = n,
    m;
  if (f[0] === MEMO_CACHE_SENTINEL)
    ((m = new wl.default({ cwd: process.cwd(), internals: wl.default.nodeInternals() })), (f[0] = m));
  else m = f[0];
  let p = m,
    g,
    E,
    T,
    A,
    D,
    O;
  if (f[1] !== error.message || f[2] !== error.stack) {
    let _ = error.stack
      ? error.stack
          .split(
            `
`,
          )
          .slice(1)
      : void 0;
    let U = _ ? p.parseLine(_[0]) : void 0;
    let filePath = Es(U?.file);
    let P;
    let lineWidth = 0;
    if (filePath && U?.line && !isInternalStackPath(filePath)) {
      try {
        let sourceCode = readFileSync(filePath, "utf8");
        if (((P = Wd(sourceCode, U.line)), P?.some(rC))) P = void 0;
        if (P) {
          for (const { line: line } of P) lineWidth = Math.max(lineWidth, String(line).length);
        }
      } catch {}
    }
    g = BaseBox;
    E = "column";
    T = 1;
    let K;
    if (f[9] === MEMO_CACHE_SENTINEL)
      ((K = r(BaseText, { backgroundColor: "ansi:red", color: "ansi:white", children: [" ", "ERROR", " "] })),
        (f[9] = K));
    else K = f[9];
    if (f[10] !== error.message)
      ((A = r(BaseBox, { children: [K, r(BaseText, { children: [" ", error.message] })] })),
        (f[10] = error.message),
        (f[11] = A));
    else A = f[11];
    D =
      U &&
      filePath &&
      e(BaseBox, {
        marginTop: 1,
        children: r(BaseText, { dim: !0, children: [filePath, ":", U.line, ":", U.column] }),
      });
    O =
      U &&
      P &&
      e(BaseBox, {
        marginTop: 1,
        flexDirection: "column",
        children: P.map((line_1) => {
          let { line: line, value: J } = line_1;
          return r(
            BaseBox,
            {
              children: [
                e(BaseBox, {
                  width: lineWidth + 1,
                  children: r(BaseText, {
                    dim: line !== U.line,
                    backgroundColor: line === U.line ? "ansi:red" : void 0,
                    color: line === U.line ? "ansi:white" : void 0,
                    children: [String(line).padStart(lineWidth, " "), ":"],
                  }),
                }),
                e(
                  BaseText,
                  {
                    backgroundColor: line === U.line ? "ansi:red" : void 0,
                    color: line === U.line ? "ansi:white" : void 0,
                    children: " " + J,
                  },
                  line,
                ),
              ],
            },
            line,
          );
        }),
      });
    ((f[1] = error.message),
      (f[2] = error.stack),
      (f[3] = g),
      (f[4] = E),
      (f[5] = T),
      (f[6] = A),
      (f[7] = D),
      (f[8] = O));
  } else ((g = f[3]), (E = f[4]), (T = f[5]), (A = f[6]), (D = f[7]), (O = f[8]));
  let K;
  if (f[12] !== error.stack)
    ((K =
      error.stack &&
      e(BaseBox, {
        marginTop: 1,
        flexDirection: "column",
        children: error.stack
          .split(
            `
`,
          )
          .slice(1)
          .map((V) => {
            let parsedLine = p.parseLine(V);
            if (!parsedLine) {
              return r(
                BaseBox,
                {
                  children: [
                    e(BaseText, { dim: !0, children: "- " }),
                    e(BaseText, { bold: !0, children: V }),
                  ],
                },
                V,
              );
            }
            return r(
              BaseBox,
              {
                children: [
                  e(BaseText, { dim: !0, children: "- " }),
                  e(BaseText, { bold: !0, children: parsedLine.function }),
                  r(BaseText, {
                    dim: !0,
                    children: [
                      " ",
                      "(",
                      Es(parsedLine.file) ?? "",
                      ":",
                      parsedLine.line,
                      ":",
                      parsedLine.column,
                      ")",
                    ],
                  }),
                ],
              },
              V,
            );
          }),
      })),
      (f[12] = error.stack),
      (f[13] = K));
  else K = f[13];
  let q;
  if (f[14] !== g || f[15] !== E || f[16] !== T || f[17] !== A || f[18] !== D || f[19] !== O || f[20] !== K)
    ((q = r(g, { flexDirection: E, padding: T, children: [A, D, O, K] })),
      (f[14] = g),
      (f[15] = E),
      (f[16] = T),
      (f[17] = A),
      (f[18] = D),
      (f[19] = O),
      (f[20] = K),
      (f[21] = q));
  else q = f[21];
  return q;
}

export { ErrorOverview };
