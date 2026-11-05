/**
 * ink/optimizer.ts
 *
 * Patch 列表优化：合并相邻写入、去掉冗余光标移动与样式切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/optimizer.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-2avr6cej.js:274708-275441 fingerprint (2.1.88 match: optimize, 1)
/**
 * Patch 列表窥孔优化：去掉空输出/零移动/空样式，合并相邻 cursorMove、styleStr，相邻 cursorTo 与光标显隐只留最后一个，重复超链接去掉。
 */
function optimize(diff) {
  let result = [];
  let len = 0;
  for (let patch of diff) {
    let type = patch.type;
    if (type === "stdout") {
      if (patch.content === "") continue;
    } else if (type === "cursorMove") {
      if (patch.x === 0 && patch.y === 0) continue;
    } else if (type === "clear") {
      if (patch.count === 0) continue;
    } else if (type === "styleStr") {
      if (patch.str === "") continue;
    }
    if (len > 0) {
      let lastIdx = len - 1;
      let last = result[lastIdx];
      let lastType = last.type;
      if (type === "cursorMove" && lastType === "cursorMove") {
        let x = last.x + patch.x;
        let y = last.y + patch.y;
        if (x === 0 && y === 0) {
          result.pop();
          len--;
        } else
          result[lastIdx] = {
            type: "cursorMove",
            x,
            y,
          };
        continue;
      }
      if (type === "cursorTo" && lastType === "cursorTo") {
        result[lastIdx] = patch;
        continue;
      }
      if (type === "styleStr" && lastType === "styleStr") {
        result[lastIdx] = {
          type: "styleStr",
          str: last.str + patch.str,
        };
        continue;
      }
      if (type === "hyperlink" && lastType === "hyperlink" && patch.uri === last.uri) continue;
      if (
        (type === "cursorShow" || type === "cursorHide") &&
        (lastType === "cursorShow" || lastType === "cursorHide")
      ) {
        result[lastIdx] = patch;
        continue;
      }
    }
    result.push(patch);
    len++;
  }
  return result;
}
export { optimize };
