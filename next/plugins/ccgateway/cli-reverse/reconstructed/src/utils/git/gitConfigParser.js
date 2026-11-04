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
function hasNulByte(text) {
  return text.includes("\x00");
}
//@ chunk-t0gq9gyw.js:66516-66597 placement
/**
 * 异步读取 git 配置中的某个值；文件不可读返回 null。
 */
async function readGitConfigValueAsync(cwd, section, subsection, key) {
  let gitConfigFile = await readGitConfigFile(cwd);
  return gitConfigFile.ok ? firstGitConfigValue(gitConfigFile.text, section, subsection, key) : null;
}
//@ chunk-t0gq9gyw.js:66597-67078 placement
/**
 * 读取 .git/config（大小上限、NUL 检查）。
 */
async function readGitConfigFile(cwd) {
  try {
    let handle = await open(join(cwd, "config"), "r");
    try {
      let buffer = Buffer.allocUnsafe(1e6);
      let bytesReadTotal = 0;
      while (bytesReadTotal < 1e6) {
        let { bytesRead } = await handle.read(buffer, bytesReadTotal, 1e6 - bytesReadTotal, bytesReadTotal);
        if (bytesRead === 0) break;
        bytesReadTotal += bytesRead;
      }
      let isTruncated = false;
      if (bytesReadTotal === 1e6) {
        let probe = Buffer.allocUnsafe(1);
        let { bytesRead } = await handle.read(probe, 0, 1, bytesReadTotal);
        isTruncated = bytesRead > 0;
      }
      let str = buffer.subarray(0, bytesReadTotal).toString("utf-8");
      if (isTruncated) {
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
      await handle.close();
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
function firstGitConfigValue(text, section, subsection, key) {
  for (let value of iterGitConfigValues(text, section, subsection, key)) return value;
  return null;
}
//@ chunk-t0gq9gyw.js:67146-67191 placement
/**
 * 返回 git 配置中指定节/键的全部值。
 */
function allGitConfigValues(config, section, subsection, key) {
  return [...iterGitConfigValues(config, section, subsection, key)];
}
//@ chunk-t0gq9gyw.js:67191-67243 placement (2.1.88 match: _temp, 1)
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
function* iterGitConfigValues(config, section, subsection, key, bareValue) {
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
    else if (bareValue !== undefined && BARE_VALUE_LINE_RE.exec(trimmed)?.[1]?.toLowerCase() === keyLower)
      yield bareValue;
  }
}
//@ chunk-t0gq9gyw.js:67626-68091 placement
/**
 * 解析 git 配置的节与条目。
 */
function parseGitConfigSections(contents) {
  let includes = [];
  let files = [];
  let sectionKind = null;
  for (let line of contents.split(`
`)) {
    let line_2 = line.trim();
    if (line_2.length === 0 || line_2[0] === "#" || line_2[0] === ";") continue;
    if (line_2[0] === "[") {
      sectionKind =
        isConfigSection(line_2, "include", null) || INCLUDEIF_SECTION_RE.test(line_2)
          ? "include"
          : isConfigSection(line_2, "core", null)
            ? "core"
            : null;
      continue;
    }
    let parsed = sectionKind === null ? null : parseKeyValue(line_2);
    if (!parsed || parsed.value.length === 0) continue;
    let lower = parsed.key.toLowerCase();
    if (sectionKind === "include" && lower === "path") includes.push(parsed.value);
    else if (sectionKind === "core" && (lower === "excludesfile" || lower === "attributesfile"))
      files.push(parsed.value);
  }
  return {
    includes,
    files,
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
    let char = line[i];
    if (!inQuote && (char === "#" || char === ";")) break;
    if (char === '"') {
      inQuote = !inQuote;
      i++;
      continue;
    }
    if (char === "\\" && i + 1 < line.length) {
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
    result += char;
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
function isConfigSection(line, sectionLower, subsection) {
  let gitConfigSectionHeader = parseGitConfigSectionHeader(line);
  return (
    gitConfigSectionHeader !== null &&
    gitConfigSectionHeader.sectionLower === sectionLower &&
    gitConfigSectionHeader.subsection === subsection
  );
}
//@ chunk-t0gq9gyw.js:68980-69534 placement
/**
 * 解析 git 配置节头。
 */
function parseGitConfigSectionHeader(line) {
  let index = 1;
  while (
    index < line.length &&
    line[index] !== "]" &&
    line[index] !== " " &&
    line[index] !== "\t" &&
    line[index] !== '"'
  )
    index++;
  let sectionLower = line.slice(1, index).toLowerCase();
  if (index < line.length && line[index] === "]")
    return {
      sectionLower,
      subsection: null,
    };
  while (index < line.length && (line[index] === " " || line[index] === "\t")) index++;
  if (index >= line.length || line[index] !== '"') return null;
  index++;
  let subsection = "";
  while (index < line.length && line[index] !== '"') {
    if (line[index] === "\\" && index + 1 < line.length) {
      let char = line[index + 1];
      if (char === "\\" || char === '"') {
        subsection += char;
        index += 2;
        continue;
      }
      subsection += char;
      index += 2;
      continue;
    }
    subsection += line[index];
    index++;
  }
  if (index >= line.length || line[index] !== '"') return null;
  index++;
  if (index >= line.length || line[index] !== "]") return null;
  return {
    sectionLower,
    subsection,
  };
}
//@ chunk-t0gq9gyw.js:69534-69612 placement
function isConfigNameChar(char) {
  return (
    (char >= "a" && char <= "z") ||
    (char >= "A" && char <= "Z") ||
    (char >= "0" && char <= "9") ||
    char === "-"
  );
}
//@ chunk-t0gq9gyw.js:80083-80246 fingerprint (2.1.88 match: parseGitConfigValue, 0.794)
/**
 * 轻量解析 git config 文本，按 section/subsection/key 取值（处理引号与转义）。
 */
function parseGitConfigValue_2(cwd) {
  try {
    let gitDirPath = isUsableGitEntry(join(cwd, ".git"), cwd);
    let configPath = join(gitDirPath ? join(cwd, ".git") : cwd, "config");
    if (readPositionIsUnsafe(configPath, cwd)) return REPO_UNREADABLE_RESULT;
    let file = readFileSync(configPath, "utf-8");
    return hasNulByte(file) ? REPO_UNREADABLE_RESULT : file;
  } catch (error) {
    return isPathAbsent(error) ? REPO_NEGATIVE_RESULT : REPO_UNREADABLE_RESULT;
  }
}
//@ chunk-8y336ebc.js:191-358 placement
function gitConfigEntries(text, { maxLines = 2000 } = {}) {
  let urls = [];
  parseGitConfig(
    text,
    {
      entry(section, key, value) {
        if (
          value !== undefined &&
          value !== "" &&
          section !== null &&
          isRemoteSection(section) &&
          (key === "url" || key === "pushurl")
        )
          urls.push(value);
      },
    },
    {
      maxLines,
    },
  );
  return urls;
}
//@ chunk-8y336ebc.js:358-498 placement
function isRemoteSection({ name, quoted }) {
  if (quoted) return name === "remote" || name.startsWith("remote.");
  let index = name.indexOf(".");
  return index !== -1 && name.slice(0, index) === "remote";
}
//@ chunk-8y336ebc.js:498-1220 placement
/**
 * 逐行解析 git config 文本（节、子节、键值、续行、引号转义），以回调输出条目。
 */
function parseGitConfig(text, handlers, { maxLines = 2000, keepsBlanksAsWritten = false } = {}) {
  let lines = (text.codePointAt(0) === 65279 ? text.slice(1) : text).split(/\r\n|\n/).slice(0, maxLines);
  let currentSection = null;
  let reportMalformed = () => {
    currentSection = null;
    handlers.malformed?.();
  };
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    let line = lines[lineIndex] ?? "";
    lineIndex++;
    let openIndex = parseValue(line, 0);
    let headerFailed = false;
    while (line[openIndex] === "[") {
      let sectionName = readSectionName(line, openIndex);
      if (sectionName === null) {
        reportMalformed();
        headerFailed = true;
        break;
      }
      let { end, ...section } = sectionName;
      currentSection = section;
      handlers.header?.(currentSection);
      openIndex = parseValue(line, end);
    }
    if (headerFailed) continue;
    let firstChar = line[openIndex];
    if (firstChar === undefined || firstChar === "#" || firstChar === ";") continue;
    if (!isAsciiLetter(firstChar)) {
      reportMalformed();
      continue;
    }
    let keyStart = openIndex;
    while (openIndex < line.length && isConfigNameCharQuick(line[openIndex] ?? "")) openIndex++;
    let lower = line.slice(keyStart, openIndex).toLowerCase();
    while (openIndex < line.length && (line[openIndex] === " " || line[openIndex] === "\t")) openIndex++;
    if (openIndex >= line.length) {
      handlers.entry?.(currentSection, lower, undefined);
      continue;
    }
    if (line[openIndex] !== "=") {
      reportMalformed();
      continue;
    }
    let configValue = readConfigValue(line, openIndex + 1, lines, lineIndex, keepsBlanksAsWritten);
    lineIndex = configValue.nextLineIndex;
    if (configValue.value === null) {
      reportMalformed();
      continue;
    }
    handlers.entry?.(currentSection, lower, configValue.value);
  }
}
//@ chunk-8y336ebc.js:1220-1729 placement
function readSectionName(line, openIndex) {
  let start = openIndex + 1;
  let nameStart = start;
  while (start < line.length) {
    let char = line[start];
    if (char === undefined || !(isConfigNameCharQuick(char) || char === ".")) break;
    start++;
  }
  let sliced = line.slice(nameStart, start);
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
  let subsection = "";
  while (true) {
    if (start >= line.length) return null;
    let char = line[start];
    if (char === "\\") {
      subsection += line[start + 1] ?? "";
      start += 2;
      continue;
    }
    start++;
    if (char === '"') break;
    subsection += char ?? "";
  }
  if (line[start] !== "]") return null;
  return {
    name: sliced.toLowerCase(),
    quoted: true,
    subsection,
    end: start + 1,
  };
}
//@ chunk-8y336ebc.js:1729-2390 placement
function readConfigValue(line, start, lines, nextLineIndex, keepsBlanksAsWritten) {
  let currentLine = line;
  let lineIndex = nextLineIndex;
  let value = "";
  let pendingSpace = "";
  let inQuote = false;
  let position = start;
  while (true) {
    if (position >= currentLine.length) {
      if (inQuote)
        return {
          value: null,
          nextLineIndex: lineIndex,
        };
      break;
    }
    let char = currentLine[position];
    if (!inQuote && (char === " " || char === "\t" || char === "\r")) {
      if (value !== "") pendingSpace += keepsBlanksAsWritten ? char : " ";
      position++;
      continue;
    }
    if (!inQuote && (char === ";" || char === "#")) break;
    value += pendingSpace;
    pendingSpace = "";
    if (char === "\\") {
      if (position + 1 >= currentLine.length) {
        if (lineIndex >= lines.length)
          return {
            value: null,
            nextLineIndex: lineIndex,
          };
        currentLine = lines[lineIndex] ?? "";
        lineIndex++;
        position = 0;
        continue;
      }
      let escaped;
      switch (currentLine[position + 1]) {
        case "\\":
          escaped = "\\";
          break;
        case '"':
          escaped = '"';
          break;
        case "n":
          escaped = `
`;
          break;
        case "t":
          escaped = "\t";
          break;
        case "b":
          escaped = "\b";
          break;
        default:
          return {
            value: null,
            nextLineIndex: lineIndex,
          };
      }
      value += escaped;
      position += 2;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      position++;
      continue;
    }
    value += char;
    position++;
  }
  let index = value.indexOf("\x00");
  return {
    value: index === -1 ? value : value.slice(0, index),
    nextLineIndex: lineIndex,
  };
}
//@ chunk-8y336ebc.js:2390-2476 placement
function parseValue(line, start) {
  while (start < line.length && (line[start] === " " || line[start] === "\t" || line[start] === "\r"))
    start++;
  return start;
}
//@ chunk-8y336ebc.js:2476-2528 placement
function isAsciiLetter(char) {
  return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}
//@ chunk-8y336ebc.js:2528-2579 placement
function isConfigNameCharQuick(char) {
  return isAsciiLetter(char) || (char >= "0" && char <= "9") || char === "-";
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
