/**
 * ink/components/ErrorOverview.tsx
 *
 * 渲染出错时的错误面板（消息、精简后的调用栈与源码片段）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/ErrorOverview.tsx
 * pieces: chunk-2avr6cej.js (3)
 * attribution: placement 1, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFileSync } from "fs";
import { MAX_ERROR_LENGTH, stripFileUrlPrefix } from "../../components/messages/UserResourceUpdateMessage.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { textColorizer, BaseText } from "./Text.js";
import { codeExcerpt_default } from "../../../vendor/code-excerpt/dist/index.js";
import { BaseBox } from "./Box.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-2avr6cej.js:226737-226788 placement
function isTooLongError(line) {
  let { value } = line;
  return value.length > MAX_ERROR_LENGTH;
}
//@ chunk-2avr6cej.js:226849-226961 affinity
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
//@ chunk-2avr6cej.js:226961-228972 fingerprint (2.1.88 match: ErrorOverview, 0.869)
/**
 * 渲染出错时的错误页：ERROR 标题与消息、出错位置、读源码显示附近几行（超长行不显示）、解析后的堆栈。
 */
function ErrorOverview(props) {
  let $ = useMemoCache(22);
  let { error } = props;
  let colorizer;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    colorizer = new textColorizer.default({
      cwd: process.cwd(),
      internals: textColorizer.default.nodeInternals(),
    });
    $[0] = colorizer;
  } else colorizer = $[0];
  let colorizer_2 = colorizer;
  let containerComponent;
  let flexDirection;
  let padding;
  let headerElement;
  let locationElement;
  let excerptElement;
  if ($[1] !== error.message || $[2] !== error.stack) {
    let stack = error.stack
      ? error.stack
          .split(
            `
`,
          )
          .slice(1)
      : undefined;
    let origin = stack ? colorizer_2.parseLine(stack[0]) : undefined;
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
    containerComponent = BaseBox;
    flexDirection = "column";
    padding = 1;
    let errorLabel;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      errorLabel = jsxProd_default_2(BaseText, {
        backgroundColor: "ansi:red",
        color: "ansi:white",
        children: [" ", "ERROR", " "],
      });
      $[9] = errorLabel;
    } else errorLabel = $[9];
    if ($[10] !== error.message) {
      headerElement = jsxProd_default_2(BaseBox, {
        children: [
          errorLabel,
          jsxProd_default_2(BaseText, {
            children: [" ", error.message],
          }),
        ],
      });
      $[10] = error.message;
      $[11] = headerElement;
    } else headerElement = $[11];
    locationElement =
      origin &&
      filePath &&
      jsxProd_default(BaseBox, {
        marginTop: 1,
        children: jsxProd_default_2(BaseText, {
          dim: true,
          children: [filePath, ":", origin.line, ":", origin.column],
        }),
      });
    excerptElement =
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
    $[1] = error.message;
    $[2] = error.stack;
    $[3] = containerComponent;
    $[4] = flexDirection;
    $[5] = padding;
    $[6] = headerElement;
    $[7] = locationElement;
    $[8] = excerptElement;
  } else {
    containerComponent = $[3];
    flexDirection = $[4];
    padding = $[5];
    headerElement = $[6];
    locationElement = $[7];
    excerptElement = $[8];
  }
  let stackElement;
  if ($[12] !== error.stack) {
    stackElement =
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
            let parsedLine = colorizer_2.parseLine(line);
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
    $[12] = error.stack;
    $[13] = stackElement;
  } else stackElement = $[13];
  let overviewElement;
  if (
    $[14] !== containerComponent ||
    $[15] !== flexDirection ||
    $[16] !== padding ||
    $[17] !== headerElement ||
    $[18] !== locationElement ||
    $[19] !== excerptElement ||
    $[20] !== stackElement
  ) {
    overviewElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      padding,
      children: [headerElement, locationElement, excerptElement, stackElement],
    });
    $[14] = containerComponent;
    $[15] = flexDirection;
    $[16] = padding;
    $[17] = headerElement;
    $[18] = locationElement;
    $[19] = excerptElement;
    $[20] = stackElement;
    $[21] = overviewElement;
  } else overviewElement = $[21];
  return overviewElement;
}
export { ErrorOverview };
