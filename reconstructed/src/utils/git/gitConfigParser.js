/**
 * utils/git/gitConfigParser.ts
 *
 * 轻量 git config 文本解析（section/subsection/key 取值）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git/gitConfigParser.ts
 * pieces: chunk-8y336ebc.js (8), chunk-t0gq9gyw.js (17)
 * attribution: placement 24, fingerprint 1
 */
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
} from "path";
import { readFileSync } from "fs";
import { isUsableGitEntry, Ae, lde } from "./gitRepoCache.js";
import { readPositionIsUnsafe } from "./gitFilesystem.js";
import { isPathAbsent } from "../errors.js";

/**
 * 是否含 NUL 字节。
 */
//@ chunk-t0gq9gyw.js:66474-66516 placement
function hasNulByte(e) {
  return e.includes("\x00");
}
//@ chunk-t0gq9gyw.js:66516-66597 placement
async function IMn(e, n, r, o) {
  let s = await readGitConfigFile(e);
  return s.ok ? fut(s.text, n, r, o) : null;
}
/**
 * 读取 .git/config（大小上限、NUL 检查）。
 */
//@ chunk-t0gq9gyw.js:66597-67078 placement
async function readGitConfigFile(e) {
  try {
    let n = await open_5(join_7(e, "config"), "r");
    try {
      let allocUnsafe = Buffer.allocUnsafe(1e6),
        s = 0;
      while (s < 1e6) {
        let { bytesRead: bytesRead } = await n.read(allocUnsafe, s, 1e6 - s, s);
        if (bytesRead === 0) break;
        s += bytesRead;
      }
      let a = !1;
      if (s === 1e6) {
        let allocUnsafe = Buffer.allocUnsafe(1),
          { bytesRead: bytesRead } = await n.read(allocUnsafe, 0, 1, s);
        a = bytesRead > 0;
      }
      let str = allocUnsafe.subarray(0, s).toString("utf-8");
      if (a) {
        let index = str.lastIndexOf(`
`);
        str = index === -1 ? "" : str.slice(0, index);
      }
      return hasNulByte(str) ? { ok: !1, cause: "nul_byte" } : { ok: !0, text: str };
    } finally {
      await n.close();
    }
  } catch {
    return { ok: !1, cause: "read_failed" };
  }
}
//@ chunk-t0gq9gyw.js:67078-67146 placement
function fut(e, n, r, o) {
  for (let s of iterGitConfigValues(e, n, r, o)) return s;
  return null;
}
//@ chunk-t0gq9gyw.js:67146-67191 placement
function Uhs(e, n, r, o) {
  return [...iterGitConfigValues(e, n, r, o)];
}
//@ chunk-t0gq9gyw.js:67191-67243 placement = _temp (1)
function eOi(e, n, r, o) {
  return [...iterGitConfigValues(e, n, r, o, "true")];
}
//@ chunk-t0gq9gyw.js:67243-67292 placement
var hs = /^([A-Za-z][A-Za-z0-9-]*)\s*(?:[#;].*)?$/;
/**
 * 遍历 git 配置中指定节/键的值。
 */
//@ chunk-t0gq9gyw.js:67292-67626 placement
function* iterGitConfigValues(e, n, r, o, s) {
  let parts = e.split(`
`),
    sectionLower = n.toLowerCase(),
    keyLower = o.toLowerCase(),
    p = !1;
  for (let line of parts) {
    let trimmed = line.trim();
    if (trimmed.length === 0 || trimmed[0] === "#" || trimmed[0] === ";") continue;
    if (trimmed[0] === "[") {
      p = Et(trimmed, sectionLower, r);
      continue;
    }
    if (!p) continue;
    let parsed = parseKeyValue(trimmed);
    if (parsed && parsed.key.toLowerCase() === keyLower) yield parsed.value;
    else if (s !== void 0 && hs.exec(trimmed)?.[1]?.toLowerCase() === keyLower) yield s;
  }
}
/**
 * 解析 git 配置的节与条目。
 */
//@ chunk-t0gq9gyw.js:67626-68091 placement
function parseGitConfigSections(e) {
  let n = [],
    r = [],
    o = null;
  for (let s of e.split(`
`)) {
    let trimmed = s.trim();
    if (trimmed.length === 0 || trimmed[0] === "#" || trimmed[0] === ";") continue;
    if (trimmed[0] === "[") {
      o =
        Et(trimmed, "include", null) || ys.test(trimmed)
          ? "include"
          : Et(trimmed, "core", null)
            ? "core"
            : null;
      continue;
    }
    let c = o === null ? null : parseKeyValue(trimmed);
    if (!c || c.value.length === 0) continue;
    let lower = c.key.toLowerCase();
    if (o === "include" && lower === "path") n.push(c.value);
    else if (o === "core" && (lower === "excludesfile" || lower === "attributesfile")) r.push(c.value);
  }
  return { includes: n, files: r };
}
//@ chunk-t0gq9gyw.js:68091-68139 placement
var ys = /^\[includeif[ \t]*"(?:[^"\\]|\\.)*"\]/i;
//@ chunk-t0gq9gyw.js:68139-68408 placement
function parseKeyValue(line) {
  let n = 0;
  while (n < line.length && Rs(line[n])) n++;
  if (n === 0) return null;
  let key = line.slice(0, n);
  while (n < line.length && (line[n] === " " || line[n] === "\t")) n++;
  if (n >= line.length || line[n] !== "=") return null;
  n++;
  while (n < line.length && (line[n] === " " || line[n] === "\t")) n++;
  let value = parseGitConfigValue(line, n);
  return { key: key, value: value };
}
/**
 * 解析 git 配置值（引号、转义、注释）。
 */
//@ chunk-t0gq9gyw.js:68408-68800 placement
function parseGitConfigValue(e, n) {
  let foundSubsection = "",
    o = !1,
    s = n;
  while (s < e.length) {
    let a = e[s];
    if (!o && (a === "#" || a === ";")) break;
    if (a === '"') {
      ((o = !o), s++);
      continue;
    }
    if (a === "\\" && s + 1 < e.length) {
      let c = e[s + 1];
      if (o) {
        switch (c) {
          case "n":
            foundSubsection += `
`;
            break;
          case "t":
            foundSubsection += "\t";
            break;
          case "b":
            foundSubsection += "\b";
            break;
          case '"':
            foundSubsection += '"';
            break;
          case "\\":
            foundSubsection += "\\";
            break;
          default:
            foundSubsection += c;
            break;
        }
        s += 2;
        continue;
      }
      if (c === "\\") {
        ((foundSubsection += "\\"), (s += 2));
        continue;
      }
    }
    ((foundSubsection += a), s++);
  }
  if (!o) foundSubsection = trimTrailingWhitespace(foundSubsection);
  return foundSubsection;
}
//@ chunk-t0gq9gyw.js:68800-68895 placement
function trimTrailingWhitespace(s) {
  let end = s.length;
  while (end > 0 && (s[end - 1] === " " || s[end - 1] === "\t")) end--;
  return s.slice(0, end);
}
//@ chunk-t0gq9gyw.js:68895-68980 placement
function Et(e, n, r) {
  let o = parseGitConfigSectionHeader(e);
  return o !== null && o.sectionLower === n && o.subsection === r;
}
/**
 * 解析 git 配置节头。
 */
//@ chunk-t0gq9gyw.js:68980-69534 placement
function parseGitConfigSectionHeader(e) {
  let n = 1;
  while (n < e.length && e[n] !== "]" && e[n] !== " " && e[n] !== "\t" && e[n] !== '"') n++;
  let lower = e.slice(1, n).toLowerCase();
  if (n < e.length && e[n] === "]") return { sectionLower: lower, subsection: null };
  while (n < e.length && (e[n] === " " || e[n] === "\t")) n++;
  if (n >= e.length || e[n] !== '"') return null;
  n++;
  let o = "";
  while (n < e.length && e[n] !== '"') {
    if (e[n] === "\\" && n + 1 < e.length) {
      let s = e[n + 1];
      if (s === "\\" || s === '"') {
        ((o += s), (n += 2));
        continue;
      }
      ((o += s), (n += 2));
      continue;
    }
    ((o += e[n]), n++);
  }
  if (n >= e.length || e[n] !== '"') return null;
  if ((n++, n >= e.length || e[n] !== "]")) return null;
  return { sectionLower: lower, subsection: o };
}
//@ chunk-t0gq9gyw.js:69534-69612 placement
function Rs(e) {
  return (e >= "a" && e <= "z") || (e >= "A" && e <= "Z") || (e >= "0" && e <= "9") || e === "-";
}
/**
 * 轻量解析 git config 文本，按 section/subsection/key 取值（处理引号与转义）。
 */
//@ chunk-t0gq9gyw.js:80083-80246 fingerprint = parseGitConfigValue (0.794)
function parseGitConfigValue_2(e) {
  try {
    let n = isUsableGitEntry(join_6(e, ".git"), e),
      r = join_6(n ? join_6(e, ".git") : e, "config");
    if (readPositionIsUnsafe(r, e)) return Ae;
    let o = readFileSync(r, "utf-8");
    return hasNulByte(o) ? Ae : o;
  } catch (error) {
    return isPathAbsent(error) ? lde : Ae;
  }
}
//@ chunk-8y336ebc.js:191-358 placement
function gitConfigEntries(e, { maxLines: l = 2000 } = {}) {
  let n = [];
  return (
    parseGitConfig(
      e,
      {
        entry(c, a, u) {
          if (
            u !== void 0 &&
            u !== "" &&
            c !== null &&
            isRemoteSection(c) &&
            (a === "url" || a === "pushurl")
          )
            n.push(u);
        },
      },
      { maxLines: l },
    ),
    n
  );
}
//@ chunk-8y336ebc.js:358-498 placement
function isRemoteSection({ name: e, quoted: quoted }) {
  if (quoted) return e === "remote" || e.startsWith("remote.");
  let index = e.indexOf(".");
  return index !== -1 && e.slice(0, index) === "remote";
}
/**
 * 逐行解析 git config 文本（节、子节、键值、续行、引号转义），以回调输出条目。
 */
//@ chunk-8y336ebc.js:498-1220 placement
function parseGitConfig(e, l, { maxLines: n = 2000, keepsBlanksAsWritten: c = !1 } = {}) {
  let sliced = (e.codePointAt(0) === 65279 ? e.slice(1) : e).split(/\r\n|\n/).slice(0, n),
    i = null,
    s = () => {
      ((i = null), l.malformed?.());
    },
    f = 0;
  while (f < sliced.length) {
    let r = sliced[f] ?? "";
    f++;
    let t = parseValue(r, 0),
      g = !1;
    while (r[t] === "[") {
      let k = readSectionName(r, t);
      if (k === null) {
        (s(), (g = !0));
        break;
      }
      let { end: end, ...w } = k;
      ((i = w), l.header?.(i), (t = parseValue(r, end)));
    }
    if (g) continue;
    let o = r[t];
    if (o === void 0 || o === "#" || o === ";") continue;
    if (!x(o)) {
      s();
      continue;
    }
    let d = t;
    while (t < r.length && C(r[t] ?? "")) t++;
    let lower = r.slice(d, t).toLowerCase();
    while (t < r.length && (r[t] === " " || r[t] === "\t")) t++;
    if (t >= r.length) {
      l.entry?.(i, lower, void 0);
      continue;
    }
    if (r[t] !== "=") {
      s();
      continue;
    }
    let b = readConfigValue(r, t + 1, sliced, f, c);
    if (((f = b.nextLineIndex), b.value === null)) {
      s();
      continue;
    }
    l.entry?.(i, lower, b.value);
  }
}
//@ chunk-8y336ebc.js:1220-1729 placement
function readSectionName(e, l) {
  let n = l + 1,
    c = n;
  while (n < e.length) {
    let i = e[n];
    if (i === void 0 || !(C(i) || i === ".")) break;
    n++;
  }
  let sliced = e.slice(c, n);
  if (e[n] === "]") {
    if (sliced === "") return null;
    return { name: sliced.toLowerCase(), quoted: !1, end: n + 1 };
  }
  if (e[n] !== " " && e[n] !== "\t" && e[n] !== "\r") return null;
  if (((n = parseValue(e, n)), e[n] !== '"')) return null;
  n++;
  let u = "";
  while (!0) {
    if (n >= e.length) return null;
    let i = e[n];
    if (i === "\\") {
      ((u += e[n + 1] ?? ""), (n += 2));
      continue;
    }
    if ((n++, i === '"')) break;
    u += i ?? "";
  }
  if (e[n] !== "]") return null;
  return { name: sliced.toLowerCase(), quoted: !0, subsection: u, end: n + 1 };
}
//@ chunk-8y336ebc.js:1729-2390 placement
function readConfigValue(e, l, n, c, a) {
  let u = e,
    i = c,
    s = "",
    f = "",
    r = !1,
    t = l;
  while (!0) {
    if (t >= u.length) {
      if (r) return { value: null, nextLineIndex: i };
      break;
    }
    let o = u[t];
    if (!r && (o === " " || o === "\t" || o === "\r")) {
      if (s !== "") f += a ? o : " ";
      t++;
      continue;
    }
    if (!r && (o === ";" || o === "#")) break;
    if (((s += f), (f = ""), o === "\\")) {
      if (t + 1 >= u.length) {
        if (i >= n.length) return { value: null, nextLineIndex: i };
        ((u = n[i] ?? ""), i++, (t = 0));
        continue;
      }
      let d;
      switch (u[t + 1]) {
        case "\\":
          d = "\\";
          break;
        case '"':
          d = '"';
          break;
        case "n":
          d = `
`;
          break;
        case "t":
          d = "\t";
          break;
        case "b":
          d = "\b";
          break;
        default:
          return { value: null, nextLineIndex: i };
      }
      ((s += d), (t += 2));
      continue;
    }
    if (o === '"') {
      ((r = !r), t++);
      continue;
    }
    ((s += o), t++);
  }
  let index = s.indexOf("\x00");
  return { value: index === -1 ? s : s.slice(0, index), nextLineIndex: i };
}
//@ chunk-8y336ebc.js:2390-2476 placement
function parseValue(line, start) {
  while (start < line.length && (line[start] === " " || line[start] === "\t" || line[start] === "\r"))
    start++;
  return start;
}
//@ chunk-8y336ebc.js:2476-2528 placement
function x(e) {
  return (e >= "a" && e <= "z") || (e >= "A" && e <= "Z");
}
//@ chunk-8y336ebc.js:2528-2579 placement
function C(e) {
  return x(e) || (e >= "0" && e <= "9") || e === "-";
}

export {
  hasNulByte,
  gitConfigEntries,
  IMn,
  parseGitConfigValue_2,
  fut,
  parseGitConfig,
  Uhs,
  eOi,
  parseGitConfigSections,
};
