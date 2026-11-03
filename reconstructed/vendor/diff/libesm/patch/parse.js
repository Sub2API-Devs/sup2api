/**
 * diff/libesm/patch/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-7vb8p3zb.js:7440-9181 esm-fingerprint
function parsePatch(uniDiff) {
  let diffstr = uniDiff.split(/\n/);
  let list = [];
  let i = 0;
  function parseIndex() {
    let index = {};
    list.push(index);
    while (i < diffstr.length) {
      let line = diffstr[i];
      if (/^(---|\+\+\+|@@)\s/.test(line)) break;
      let headerMatch = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(line);
      if (headerMatch) index.index = line.substring(headerMatch[0].length).trim();
      i++;
    }
    parseFileHeader(index);
    parseFileHeader(index);
    index.hunks = [];
    while (i < diffstr.length) {
      let line = diffstr[i];
      if (
        /^(Index:\s|diff\s|---\s|\+\+\+\s|===================================================================)/.test(
          line,
        )
      )
        break;
      else if (/^@@/.test(line)) index.hunks.push(parseHunk());
      else if (line) throw Error("Unknown line " + (i + 1) + " " + JSON.stringify(line));
      else i++;
    }
  }
  function parseFileHeader(index) {
    let fileHeaderMatch = /^(---|\+\+\+)\s+/.exec(diffstr[i]);
    if (fileHeaderMatch) {
      let prefix = fileHeaderMatch[1];
      let data = diffstr[i].substring(3).trim().split("\t", 2);
      let header = (data[1] || "").trim();
      let fileName = data[0].replace(/\\\\/g, "\\");
      if (fileName.startsWith('"') && fileName.endsWith('"'))
        fileName = fileName.substr(1, fileName.length - 2);
      if (prefix === "---") {
        index.oldFileName = fileName;
        index.oldHeader = header;
      } else {
        index.newFileName = fileName;
        index.newHeader = header;
      }
      i++;
    }
  }
  function parseHunk() {
    var _a;
    let chunkHeaderIndex = i;
    let chunkHeaderLine = diffstr[i++];
    let chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    let hunk = {
      oldStart: +chunkHeader[1],
      oldLines: typeof chunkHeader[2] === "undefined" ? 1 : +chunkHeader[2],
      newStart: +chunkHeader[3],
      newLines: typeof chunkHeader[4] === "undefined" ? 1 : +chunkHeader[4],
      lines: [],
    };
    if (hunk.oldLines === 0) hunk.oldStart += 1;
    if (hunk.newLines === 0) hunk.newStart += 1;
    let addCount = 0;
    let removeCount = 0;
    for (
      ;
      i < diffstr.length &&
      (removeCount < hunk.oldLines ||
        addCount < hunk.newLines ||
        ((_a = diffstr[i]) === null || _a === undefined ? undefined : _a.startsWith("\\")));
      i++
    ) {
      let operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? " " : diffstr[i][0];
      if (operation === "+" || operation === "-" || operation === " " || operation === "\\") {
        hunk.lines.push(diffstr[i]);
        if (operation === "+") addCount++;
        else if (operation === "-") removeCount++;
        else if (operation === " ") {
          addCount++;
          removeCount++;
        }
      } else throw Error(`Hunk at line ${chunkHeaderIndex + 1} contained invalid line ${diffstr[i]}`);
    }
    if (!addCount && hunk.newLines === 1) hunk.newLines = 0;
    if (!removeCount && hunk.oldLines === 1) hunk.oldLines = 0;
    if (addCount !== hunk.newLines)
      throw Error("Added line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    if (removeCount !== hunk.oldLines)
      throw Error("Removed line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    return hunk;
  }
  while (i < diffstr.length) parseIndex();
  return list;
}
export { parsePatch };
