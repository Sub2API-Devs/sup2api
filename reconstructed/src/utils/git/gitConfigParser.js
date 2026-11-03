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
import { open } from "fs/promises";
import { join } from "path";
import { readFileSync } from "fs";
import { isUsableGitEntry, REPO_UNREADABLE_RESULT, REPO_NEGATIVE_RESULT } from "./gitRepoCache.js";
import { readPositionIsUnsafe } from "./gitFilesystem.js";
import { isPathAbsent } from "../errors.js";

//@ chunk-t0gq9gyw.js:66474-66516 placement
/**
 * 是否含 NUL 字节。
 */
function hasNulByte(e) {
  return e.includes("\x00");
}
//@ chunk-t0gq9gyw.js:66516-66597 placement
/**
 * 异步读取 git 配置中的某个值；文件不可读返回 null。
 */
async function readGitConfigValueAsync(e, n, r, o) {
  let gitConfigFile = await readGitConfigFile(e);
  return gitConfigFile.ok ? firstGitConfigValue(gitConfigFile.text, n, r, o) : null;
}
//@ chunk-t0gq9gyw.js:66597-67078 placement
/**
 * 读取 .git/config（大小上限、NUL 检查）。
 */
async function readGitConfigFile(e) {
  try {
    let n = await open(join(e, "config"), "r");
    try {
      let o = Buffer.allocUnsafe(1e6);
      let s = 0;
      while (s < 1e6) {
        let { bytesRead } = await n.read(o, s, 1e6 - s, s);
        if (bytesRead === 0) break;
        s += bytesRead;
      }
      let a = false;
      if (s === 1e6) {
        let u = Buffer.allocUnsafe(1);
        let { bytesRead } = await n.read(u, 0, 1, s);
        a = bytesRead > 0;
      }
      let str = o.subarray(0, s).toString("utf-8");
      if (a) {
        let index = str.lastIndexOf(`
`);
        str = index === -1 ? "" : str.slice(0, index);
      }
      return hasNulByte(str)
        ? {
            ok: false,
            cause: "nul_byte",
          }
        : {
            ok: true,
            text: str,
          };
    } finally {
      await n.close();
    }
  } catch {
    return {
      ok: false,
      cause: "read_failed",
    };
  }
}
//@ chunk-t0gq9gyw.js:67078-67146 placement
/**
 * 返回 git 配置中指定节/键的第一个值。
 */
function firstGitConfigValue(config, section, subsection, key) {
  for (let s of iterGitConfigValues(config, section, subsection, key)) return s;
  return null;
}
//@ chunk-t0gq9gyw.js:67146-67191 placement
/**
 * 返回 git 配置中指定节/键的全部值。
 */
function allGitConfigValues(config, section, subsection, key) {
  return [...iterGitConfigValues(config, section, subsection, key)];
}
//@ chunk-t0gq9gyw.js:67191-67243 placement = _temp (1)
/**
 * 同上，但把无值项的默认值按 "true" 处理。
 */
function allGitConfigValuesTrue(config, section, subsection, key) {
  return [...iterGitConfigValues(config, section, subsection, key, "true")];
}
//@ chunk-t0gq9gyw.js:67243-67292 placement
var BARE_VALUE_LINE_RE = /^([A-Za-z][A-Za-z0-9-]*)\s*(?:[#;].*)?$/;
//@ chunk-t0gq9gyw.js:67292-67626 placement
/**
 * 遍历 git 配置中指定节/键的值。
 */
function* iterGitConfigValues(config, section, subsection, key, s) {
  let lines = config.split(`
`);
  let sectionLower = section.toLowerCase();
  let keyLower = key.toLowerCase();
  let inSection = false;
  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.length === 0 || trimmed[0] === "#" || trimmed[0] === ";") continue;
    if (trimmed[0] === "[") {
      inSection = isConfigSection(trimmed, sectionLower, subsection);
      continue;
    }
    if (!inSection) continue;
    let parsed = parseKeyValue(trimmed);
    if (parsed && parsed.key.toLowerCase() === keyLower) yield parsed.value;
    else if (s !== undefined && BARE_VALUE_LINE_RE.exec(trimmed)?.[1]?.toLowerCase() === keyLower) yield s;
  }
}
//@ chunk-t0gq9gyw.js:67626-68091 placement
/**
 * 解析 git 配置的节与条目。
 */
function parseGitConfigSections(contents) {
  let n = [];
  let r = [];
  let o = null;
  for (let line of contents.split(`
`)) {
    let line_2 = line.trim();
    if (line_2.length === 0 || line_2[0] === "#" || line_2[0] === ";") continue;
    if (line_2[0] === "[") {
      o =
        isConfigSection(line_2, "include", null) || INCLUDEIF_SECTION_RE.test(line_2)
          ? "include"
          : isConfigSection(line_2, "core", null)
            ? "core"
            : null;
      continue;
    }
    let c = o === null ? null : parseKeyValue(line_2);
    if (!c || c.value.length === 0) continue;
    let lower = c.key.toLowerCase();
    if (o === "include" && lower === "path") n.push(c.value);
    else if (o === "core" && (lower === "excludesfile" || lower === "attributesfile")) r.push(c.value);
  }
  return {
    includes: n,
    files: r,
  };
}
//@ chunk-t0gq9gyw.js:68091-68139 placement
var INCLUDEIF_SECTION_RE = /^\[includeif[ \t]*"(?:[^"\\]|\\.)*"\]/i;
//@ chunk-t0gq9gyw.js:68139-68408 placement
function parseKeyValue(line) {
  let i = 0;
  while (i < line.length && isConfigNameChar(line[i])) i++;
  if (i === 0) return null;
  let key = line.slice(0, i);
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  if (i >= line.length || line[i] !== "=") return null;
  i++;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  let value = parseGitConfigValue(line, i);
  return {
    key,
    value,
  };
}
//@ chunk-t0gq9gyw.js:68408-68800 placement
/**
 * 解析 git 配置值（引号、转义、注释）。
 */
function parseGitConfigValue(line, start) {
  let result = "";
  let inQuote = false;
  let i = start;
  while (i < line.length) {
    let a = line[i];
    if (!inQuote && (a === "#" || a === ";")) break;
    if (a === '"') {
      inQuote = !inQuote;
      i++;
      continue;
    }
    if (a === "\\" && i + 1 < line.length) {
      let next = line[i + 1];
      if (inQuote) {
        switch (next) {
          case "n":
            result += `
`;
            break;
          case "t":
            result += "\t";
            break;
          case "b":
            result += "\b";
            break;
          case '"':
            result += '"';
            break;
          case "\\":
            result += "\\";
            break;
          default:
            result += next;
            break;
        }
        i += 2;
        continue;
      }
      if (next === "\\") {
        result += "\\";
        i += 2;
        continue;
      }
    }
    result += a;
    i++;
  }
  if (!inQuote) result = trimTrailingWhitespace(result);
  return result;
}
//@ chunk-t0gq9gyw.js:68800-68895 placement
function trimTrailingWhitespace(s) {
  let end = s.length;
  while (end > 0 && (s[end - 1] === " " || s[end - 1] === "\t")) end--;
  return s.slice(0, end);
}
//@ chunk-t0gq9gyw.js:68895-68980 placement
function isConfigSection(e, n, r) {
  let gitConfigSectionHeader = parseGitConfigSectionHeader(e);
  return (
    gitConfigSectionHeader !== null &&
    gitConfigSectionHeader.sectionLower === n &&
    gitConfigSectionHeader.subsection === r
  );
}
//@ chunk-t0gq9gyw.js:68980-69534 placement
/**
 * 解析 git 配置节头。
 */
function parseGitConfigSectionHeader(e) {
  let n = 1;
  while (n < e.length && e[n] !== "]" && e[n] !== " " && e[n] !== "\t" && e[n] !== '"') n++;
  let sectionLower = e.slice(1, n).toLowerCase();
  if (n < e.length && e[n] === "]")
    return {
      sectionLower,
      subsection: null,
    };
  while (n < e.length && (e[n] === " " || e[n] === "\t")) n++;
  if (n >= e.length || e[n] !== '"') return null;
  n++;
  let o = "";
  while (n < e.length && e[n] !== '"') {
    if (e[n] === "\\" && n + 1 < e.length) {
      let s = e[n + 1];
      if (s === "\\" || s === '"') {
        o += s;
        n += 2;
        continue;
      }
      o += s;
      n += 2;
      continue;
    }
    o += e[n];
    n++;
  }
  if (n >= e.length || e[n] !== '"') return null;
  n++;
  if (n >= e.length || e[n] !== "]") return null;
  return {
    sectionLower,
    subsection: o,
  };
}
//@ chunk-t0gq9gyw.js:69534-69612 placement
function isConfigNameChar(e) {
  return (e >= "a" && e <= "z") || (e >= "A" && e <= "Z") || (e >= "0" && e <= "9") || e === "-";
}
//@ chunk-t0gq9gyw.js:80083-80246 fingerprint = parseGitConfigValue (0.794)
/**
 * 轻量解析 git config 文本，按 section/subsection/key 取值（处理引号与转义）。
 */
function parseGitConfigValue_2(cwd) {
  try {
    let n = isUsableGitEntry(join(cwd, ".git"), cwd);
    let r = join(n ? join(cwd, ".git") : cwd, "config");
    if (readPositionIsUnsafe(r, cwd)) return REPO_UNREADABLE_RESULT;
    let file = readFileSync(r, "utf-8");
    return hasNulByte(file) ? REPO_UNREADABLE_RESULT : file;
  } catch (error) {
    return isPathAbsent(error) ? REPO_NEGATIVE_RESULT : REPO_UNREADABLE_RESULT;
  }
}
//@ chunk-8y336ebc.js:191-358 placement
function gitConfigEntries(e, { maxLines: l = 2000 } = {}) {
  let n = [];
  parseGitConfig(
    e,
    {
      entry(c, a, u) {
        if (
          u !== undefined &&
          u !== "" &&
          c !== null &&
          isRemoteSection(c) &&
          (a === "url" || a === "pushurl")
        )
          n.push(u);
      },
    },
    {
      maxLines: l,
    },
  );
  return n;
}
//@ chunk-8y336ebc.js:358-498 placement
function isRemoteSection({ name: e, quoted }) {
  if (quoted) return e === "remote" || e.startsWith("remote.");
  let index = e.indexOf(".");
  return index !== -1 && e.slice(0, index) === "remote";
}
//@ chunk-8y336ebc.js:498-1220 placement
/**
 * 逐行解析 git config 文本（节、子节、键值、续行、引号转义），以回调输出条目。
 */
function parseGitConfig(e, l, { maxLines: n = 2000, keepsBlanksAsWritten: c = false } = {}) {
  let sliced = (e.codePointAt(0) === 65279 ? e.slice(1) : e).split(/\r\n|\n/).slice(0, n);
  let i = null;
  let s = () => {
    i = null;
    l.malformed?.();
  };
  let f = 0;
  while (f < sliced.length) {
    let line = sliced[f] ?? "";
    f++;
    let value = parseValue(line, 0);
    let g = false;
    while (line[value] === "[") {
      let sectionName = readSectionName(line, value);
      if (sectionName === null) {
        s();
        g = true;
        break;
      }
      let { end, ...w } = sectionName;
      i = w;
      l.header?.(i);
      value = parseValue(line, end);
    }
    if (g) continue;
    let o = line[value];
    if (o === undefined || o === "#" || o === ";") continue;
    if (!isAsciiLetter(o)) {
      s();
      continue;
    }
    let d = value;
    while (value < line.length && isConfigNameCharQuick(line[value] ?? "")) value++;
    let lower = line.slice(d, value).toLowerCase();
    while (value < line.length && (line[value] === " " || line[value] === "\t")) value++;
    if (value >= line.length) {
      l.entry?.(i, lower, undefined);
      continue;
    }
    if (line[value] !== "=") {
      s();
      continue;
    }
    let configValue = readConfigValue(line, value + 1, sliced, f, c);
    f = configValue.nextLineIndex;
    if (configValue.value === null) {
      s();
      continue;
    }
    l.entry?.(i, lower, configValue.value);
  }
}
//@ chunk-8y336ebc.js:1220-1729 placement
function readSectionName(line, l) {
  let start = l + 1;
  let c = start;
  while (start < line.length) {
    let i = line[start];
    if (i === undefined || !(isConfigNameCharQuick(i) || i === ".")) break;
    start++;
  }
  let sliced = line.slice(c, start);
  if (line[start] === "]") {
    if (sliced === "") return null;
    return {
      name: sliced.toLowerCase(),
      quoted: false,
      end: start + 1,
    };
  }
  if (line[start] !== " " && line[start] !== "\t" && line[start] !== "\r") return null;
  start = parseValue(line, start);
  if (line[start] !== '"') return null;
  start++;
  let u = "";
  while (true) {
    if (start >= line.length) return null;
    let i = line[start];
    if (i === "\\") {
      u += line[start + 1] ?? "";
      start += 2;
      continue;
    }
    start++;
    if (i === '"') break;
    u += i ?? "";
  }
  if (line[start] !== "]") return null;
  return {
    name: sliced.toLowerCase(),
    quoted: true,
    subsection: u,
    end: start + 1,
  };
}
//@ chunk-8y336ebc.js:1729-2390 placement
function readConfigValue(e, l, n, c, a) {
  let u = e;
  let i = c;
  let s = "";
  let f = "";
  let r = false;
  let t = l;
  while (true) {
    if (t >= u.length) {
      if (r)
        return {
          value: null,
          nextLineIndex: i,
        };
      break;
    }
    let o = u[t];
    if (!r && (o === " " || o === "\t" || o === "\r")) {
      if (s !== "") f += a ? o : " ";
      t++;
      continue;
    }
    if (!r && (o === ";" || o === "#")) break;
    s += f;
    f = "";
    if (o === "\\") {
      if (t + 1 >= u.length) {
        if (i >= n.length)
          return {
            value: null,
            nextLineIndex: i,
          };
        u = n[i] ?? "";
        i++;
        t = 0;
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
          return {
            value: null,
            nextLineIndex: i,
          };
      }
      s += d;
      t += 2;
      continue;
    }
    if (o === '"') {
      r = !r;
      t++;
      continue;
    }
    s += o;
    t++;
  }
  let index = s.indexOf("\x00");
  return {
    value: index === -1 ? s : s.slice(0, index),
    nextLineIndex: i,
  };
}
//@ chunk-8y336ebc.js:2390-2476 placement
function parseValue(line, start) {
  while (start < line.length && (line[start] === " " || line[start] === "\t" || line[start] === "\r"))
    start++;
  return start;
}
//@ chunk-8y336ebc.js:2476-2528 placement
function isAsciiLetter(e) {
  return (e >= "a" && e <= "z") || (e >= "A" && e <= "Z");
}
//@ chunk-8y336ebc.js:2528-2579 placement
function isConfigNameCharQuick(e) {
  return isAsciiLetter(e) || (e >= "0" && e <= "9") || e === "-";
}
export {
  hasNulByte,
  gitConfigEntries,
  readGitConfigValueAsync,
  parseGitConfigValue_2,
  firstGitConfigValue,
  parseGitConfigSections,
  parseGitConfig,
  allGitConfigValues,
  allGitConfigValuesTrue,
};
