/**
 * utils/ansiToSvg.ts
 *
 * 把 ANSI 文本渲染为 SVG（解析 SGR、256 色，light/dark 主题）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ansiToSvg.ts
 * pieces: chunk-h0kck2eh.js (3)
 * attribution: affinity 1, fingerprint 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-h0kck2eh.js:394-792 affinity (2.1.88 match: SETTLED_GREY, 1)
var ANSI_FG_RGB = {
  30: {
    r: 0,
    g: 0,
    b: 0,
  },
  31: {
    r: 205,
    g: 49,
    b: 49,
  },
  32: {
    r: 13,
    g: 188,
    b: 121,
  },
  33: {
    r: 229,
    g: 229,
    b: 16,
  },
  34: {
    r: 36,
    g: 114,
    b: 200,
  },
  35: {
    r: 188,
    g: 63,
    b: 188,
  },
  36: {
    r: 17,
    g: 168,
    b: 205,
  },
  37: {
    r: 229,
    g: 229,
    b: 229,
  },
  90: {
    r: 102,
    g: 102,
    b: 102,
  },
  91: {
    r: 241,
    g: 76,
    b: 76,
  },
  92: {
    r: 35,
    g: 209,
    b: 139,
  },
  93: {
    r: 245,
    g: 245,
    b: 67,
  },
  94: {
    r: 59,
    g: 142,
    b: 234,
  },
  95: {
    r: 214,
    g: 112,
    b: 214,
  },
  96: {
    r: 41,
    g: 184,
    b: 219,
  },
  97: {
    r: 255,
    g: 255,
    b: 255,
  },
};
var DEFAULT_FG_RGB = {
  r: 229,
  g: 229,
  b: 229,
};
var DEFAULT_BG_RGB = {
  r: 30,
  g: 30,
  b: 30,
};
//@ chunk-h0kck2eh.js:792-1707 fingerprint (2.1.88 match: parseAnsi, 1)
function parseAnsi(text) {
  let lines = [];
  let rawLines = text.split(`
`);
  for (let line of rawLines) {
    let spans = [];
    let currentColor = DEFAULT_FG_RGB;
    let bold = false;
    let i = 0;
    while (i < line.length) {
      if (line[i] === "\x1B" && line[i + 1] === "[") {
        let j = i + 2;
        while (j < line.length && !/[A-Za-z]/.test(line[j])) j++;
        if (line[j] === "m") {
          let codes = line
            .slice(i + 2, j)
            .split(";")
            .map(Number);
          let k = 0;
          while (k < codes.length) {
            let code = codes[k];
            if (code === 0) {
              currentColor = DEFAULT_FG_RGB;
              bold = false;
            } else if (code === 1) bold = true;
            else if (code >= 30 && code <= 37) currentColor = ANSI_FG_RGB[code] || DEFAULT_FG_RGB;
            else if (code >= 90 && code <= 97) currentColor = ANSI_FG_RGB[code] || DEFAULT_FG_RGB;
            else if (code === 39) currentColor = DEFAULT_FG_RGB;
            else if (code === 38) {
              if (codes[k + 1] === 5 && codes[k + 2] !== undefined) {
                let colorIndex = codes[k + 2];
                currentColor = get256Color(colorIndex);
                k += 2;
              } else if (
                codes[k + 1] === 2 &&
                codes[k + 2] !== undefined &&
                codes[k + 3] !== undefined &&
                codes[k + 4] !== undefined
              ) {
                currentColor = {
                  r: codes[k + 2],
                  g: codes[k + 3],
                  b: codes[k + 4],
                };
                k += 4;
              }
            }
            k++;
          }
        }
        i = j + 1;
        continue;
      }
      if (line[i] === "\x1B") {
        if (line[i + 1] === "]") {
          let oscEnd = i + 2;
          while (
            oscEnd < line.length &&
            line[oscEnd] !== "\x07" &&
            !(line[oscEnd] === "\x1B" && line[oscEnd + 1] === "\\")
          )
            oscEnd++;
          i = line[oscEnd] === "\x1B" ? oscEnd + 2 : oscEnd + 1;
        } else i++;
        continue;
      }
      let textStart = i;
      while (i < line.length && line[i] !== "\x1B") i++;
      let spanText = line.slice(textStart, i);
      if (spanText)
        spans.push({
          text: spanText,
          color: currentColor,
          bold,
        });
    }
    if (spans.length === 0)
      spans.push({
        text: "",
        color: DEFAULT_FG_RGB,
        bold: false,
      });
    lines.push(spans);
  }
  return lines;
}
//@ chunk-h0kck2eh.js:1707-2187 callgraph-fingerprint (2.1.88 match: get256Color, 1)
function get256Color(index) {
  if (index < 16)
    return (
      [
        {
          r: 0,
          g: 0,
          b: 0,
        },
        {
          r: 128,
          g: 0,
          b: 0,
        },
        {
          r: 0,
          g: 128,
          b: 0,
        },
        {
          r: 128,
          g: 128,
          b: 0,
        },
        {
          r: 0,
          g: 0,
          b: 128,
        },
        {
          r: 128,
          g: 0,
          b: 128,
        },
        {
          r: 0,
          g: 128,
          b: 128,
        },
        {
          r: 192,
          g: 192,
          b: 192,
        },
        {
          r: 128,
          g: 128,
          b: 128,
        },
        {
          r: 255,
          g: 0,
          b: 0,
        },
        {
          r: 0,
          g: 255,
          b: 0,
        },
        {
          r: 255,
          g: 255,
          b: 0,
        },
        {
          r: 0,
          g: 0,
          b: 255,
        },
        {
          r: 255,
          g: 0,
          b: 255,
        },
        {
          r: 0,
          g: 255,
          b: 255,
        },
        {
          r: 255,
          g: 255,
          b: 255,
        },
      ][index] || DEFAULT_FG_RGB
    );
  if (index < 232) {
    let i_2 = index - 16;
    let floored = Math.floor(i_2 / 36);
    let floored_2 = Math.floor((i_2 % 36) / 6);
    let blueIndex = i_2 % 6;
    return {
      r: floored === 0 ? 0 : 55 + floored * 40,
      g: floored_2 === 0 ? 0 : 55 + floored_2 * 40,
      b: blueIndex === 0 ? 0 : 55 + blueIndex * 40,
    };
  }
  let gray = (index - 232) * 10 + 8;
  return {
    r: gray,
    g: gray,
    b: gray,
  };
}
export { DEFAULT_BG_RGB, parseAnsi };
