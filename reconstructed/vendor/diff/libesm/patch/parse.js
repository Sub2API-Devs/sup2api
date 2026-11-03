/**
 * diff/libesm/patch/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-7vb8p3zb.js:7440-9181 esm-fingerprint
function ros(n) {
  let parts = n.split(/\n/),
    t = [],
    i = 0;
  function l() {
    let o = {};
    t.push(o);
    while (i < parts.length) {
      let f = parts[i];
      if (/^(---|\+\+\+|@@)\s/.test(f)) break;
      let match = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(f);
      if (match) o.index = f.substring(match[0].length).trim();
      i++;
    }
    (r(o), r(o), (o.hunks = []));
    while (i < parts.length) {
      let f = parts[i];
      if (
        /^(Index:\s|diff\s|---\s|\+\+\+\s|===================================================================)/.test(
          f,
        )
      )
        break;
      else if (/^@@/.test(f)) o.hunks.push(s());
      else if (f) throw Error("Unknown line " + (i + 1) + " " + JSON.stringify(f));
      else i++;
    }
  }
  function r(o) {
    let match = /^(---|\+\+\+)\s+/.exec(parts[i]);
    if (match) {
      let u = match[1],
        parts_2 = parts[i].substring(3).trim().split("\t", 2),
        trimmed = (parts_2[1] || "").trim(),
        replaced = parts_2[0].replace(/\\\\/g, "\\");
      if (replaced.startsWith('"') && replaced.endsWith('"'))
        replaced = replaced.substr(1, replaced.length - 2);
      if (u === "---") ((o.oldFileName = replaced), (o.oldHeader = trimmed));
      else ((o.newFileName = replaced), (o.newHeader = trimmed));
      i++;
    }
  }
  function s() {
    var o;
    let f = i,
      u = parts[i++],
      parts_2 = u.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/),
      c = {
        oldStart: +parts_2[1],
        oldLines: typeof parts_2[2] > "u" ? 1 : +parts_2[2],
        newStart: +parts_2[3],
        newLines: typeof parts_2[4] > "u" ? 1 : +parts_2[4],
        lines: [],
      };
    if (c.oldLines === 0) c.oldStart += 1;
    if (c.newLines === 0) c.newStart += 1;
    let a = 0,
      g = 0;
    for (
      ;
      i < parts.length &&
      (g < c.oldLines ||
        a < c.newLines ||
        ((o = parts[i]) === null || o === void 0 ? void 0 : o.startsWith("\\")));
      i++
    ) {
      let w = parts[i].length == 0 && i != parts.length - 1 ? " " : parts[i][0];
      if (w === "+" || w === "-" || w === " " || w === "\\") {
        if ((c.lines.push(parts[i]), w === "+")) a++;
        else if (w === "-") g++;
        else if (w === " ") (a++, g++);
      } else throw Error(`Hunk at line ${f + 1} contained invalid line ${parts[i]}`);
    }
    if (!a && c.newLines === 1) c.newLines = 0;
    if (!g && c.oldLines === 1) c.oldLines = 0;
    if (a !== c.newLines) throw Error("Added line count did not match for hunk at line " + (f + 1));
    if (g !== c.oldLines) throw Error("Removed line count did not match for hunk at line " + (f + 1));
    return c;
  }
  while (i < parts.length) l();
  return t;
}

export { ros };
