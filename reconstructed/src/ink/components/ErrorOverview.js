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
import { textColorizer, BaseText } from "./Text.js";
import { codeExcerpt_default } from "../../../vendor/code-excerpt/dist/index.js";
import { BaseBox } from "./Box.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-bzr73sfg.js:227142-227193 sole-consumer
function isTooLongError(n) {
  let { value: ae } = n;
  return ae.length > MAX_ERROR_LENGTH;
}
//@ chunk-bzr73sfg.js:227193-227254 sole-consumer = formatUri (1)
var stripFileUrlPrefix = (file) => file?.replace(`file://${process.cwd()}/`, "");
var MAX_ERROR_LENGTH = 200;
//@ chunk-bzr73sfg.js:227254-227366 affinity
/**
 * 堆栈帧路径是否是打包内部路径（$bunfs、~BUN、/snapshot/、node:），这些不读源码。
 */
function isInternalStackPath(path) {
  return (
    path.includes("$bunfs") ||
    path.includes("~BUN") ||
    path.includes("/snapshot/") ||
    path.startsWith("node:")
  );
}
//@ chunk-bzr73sfg.js:227366-229377 fingerprint = ErrorOverview (0.868)
/**
 * 渲染出错时的错误页：ERROR 标题与消息、出错位置、读源码显示附近几行（超长行不显示）、解析后的堆栈。
 */
function ErrorOverview(props) {
  let f = w(22);
  let { error } = props;
  let m;
  if (f[0] === MEMO_CACHE_SENTINEL) {
    m = new textColorizer.default({
      cwd: process.cwd(),
      internals: textColorizer.default.nodeInternals(),
    });
    f[0] = m;
  } else m = f[0];
  let p = m;
  let g;
  let flexDirection;
  let padding;
  let A;
  let D;
  let O;
  if (f[1] !== error.message || f[2] !== error.stack) {
    let stack = error.stack
      ? error.stack
          .split(
            `
`,
          )
          .slice(1)
      : undefined;
    let origin = stack ? p.parseLine(stack[0]) : undefined;
    let filePath = stripFileUrlPrefix(origin?.file);
    let excerpt;
    let lineWidth = 0;
    if (filePath && origin?.line && !isInternalStackPath(filePath)) {
      try {
        let sourceCode = readFileSync(filePath, "utf8");
        excerpt = codeExcerpt_default(sourceCode, origin.line);
        if (excerpt?.some(isTooLongError)) excerpt = undefined;
        if (excerpt) {
          for (const { line } of excerpt) lineWidth = Math.max(lineWidth, String(line).length);
        }
      } catch {}
    }
    g = BaseBox;
    flexDirection = "column";
    padding = 1;
    let K;
    if (f[9] === MEMO_CACHE_SENTINEL) {
      K = jsxProd_default_2(BaseText, {
        backgroundColor: "ansi:red",
        color: "ansi:white",
        children: [" ", "ERROR", " "],
      });
      f[9] = K;
    } else K = f[9];
    if (f[10] !== error.message) {
      A = jsxProd_default_2(BaseBox, {
        children: [
          K,
          jsxProd_default_2(BaseText, {
            children: [" ", error.message],
          }),
        ],
      });
      f[10] = error.message;
      f[11] = A;
    } else A = f[11];
    D =
      origin &&
      filePath &&
      jsxProd_default(BaseBox, {
        marginTop: 1,
        children: jsxProd_default_2(BaseText, {
          dim: true,
          children: [filePath, ":", origin.line, ":", origin.column],
        }),
      });
    O =
      origin &&
      excerpt &&
      jsxProd_default(BaseBox, {
        marginTop: 1,
        flexDirection: "column",
        children: excerpt.map((line_1) => {
          let { line, value } = line_1;
          return jsxProd_default_2(
            BaseBox,
            {
              children: [
                jsxProd_default(BaseBox, {
                  width: lineWidth + 1,
                  children: jsxProd_default_2(BaseText, {
                    dim: line !== origin.line,
                    backgroundColor: line === origin.line ? "ansi:red" : undefined,
                    color: line === origin.line ? "ansi:white" : undefined,
                    children: [String(line).padStart(lineWidth, " "), ":"],
                  }),
                }),
                jsxProd_default(
                  BaseText,
                  {
                    backgroundColor: line === origin.line ? "ansi:red" : undefined,
                    color: line === origin.line ? "ansi:white" : undefined,
                    children: " " + value,
                  },
                  line,
                ),
              ],
            },
            line,
          );
        }),
      });
    f[1] = error.message;
    f[2] = error.stack;
    f[3] = g;
    f[4] = flexDirection;
    f[5] = padding;
    f[6] = A;
    f[7] = D;
    f[8] = O;
  } else {
    g = f[3];
    flexDirection = f[4];
    padding = f[5];
    A = f[6];
    D = f[7];
    O = f[8];
  }
  let K;
  if (f[12] !== error.stack) {
    K =
      error.stack &&
      jsxProd_default(BaseBox, {
        marginTop: 1,
        flexDirection: "column",
        children: error.stack
          .split(
            `
`,
          )
          .slice(1)
          .map((line) => {
            let parsedLine = p.parseLine(line);
            if (!parsedLine) {
              return jsxProd_default_2(
                BaseBox,
                {
                  children: [
                    jsxProd_default(BaseText, {
                      dim: true,
                      children: "- ",
                    }),
                    jsxProd_default(BaseText, {
                      bold: true,
                      children: line,
                    }),
                  ],
                },
                line,
              );
            }
            return jsxProd_default_2(
              BaseBox,
              {
                children: [
                  jsxProd_default(BaseText, {
                    dim: true,
                    children: "- ",
                  }),
                  jsxProd_default(BaseText, {
                    bold: true,
                    children: parsedLine.function,
                  }),
                  jsxProd_default_2(BaseText, {
                    dim: true,
                    children: [
                      " ",
                      "(",
                      stripFileUrlPrefix(parsedLine.file) ?? "",
                      ":",
                      parsedLine.line,
                      ":",
                      parsedLine.column,
                      ")",
                    ],
                  }),
                ],
              },
              line,
            );
          }),
      });
    f[12] = error.stack;
    f[13] = K;
  } else K = f[13];
  let q;
  if (
    f[14] !== g ||
    f[15] !== flexDirection ||
    f[16] !== padding ||
    f[17] !== A ||
    f[18] !== D ||
    f[19] !== O ||
    f[20] !== K
  ) {
    q = jsxProd_default_2(g, {
      flexDirection,
      padding,
      children: [A, D, O, K],
    });
    f[14] = g;
    f[15] = flexDirection;
    f[16] = padding;
    f[17] = A;
    f[18] = D;
    f[19] = O;
    f[20] = K;
    f[21] = q;
  } else q = f[21];
  return q;
}
export { ErrorOverview };
