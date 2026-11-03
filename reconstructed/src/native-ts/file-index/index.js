/**
 * native-ts/file-index/index.ts
 *
 * 并入已有模块：让出事件循环一次（setImmediate 或 MessageChannel）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/native-ts/file-index/index.ts
 * pieces: chunk-dcmhvw5a.js (11)
 * attribution: placement 1, layout 7, fingerprint 2, file-local 1
 */
import { sleep } from "../../utils/sleep.js";

//@ chunk-dcmhvw5a.js:44768-45031 placement
/**
 * 让出事件循环一次（setImmediate 或 MessageChannel）。
 */
function yieldToEventLoop() {
  if (typeof setImmediate === "function") return new Promise((resolve) => setImmediate(resolve));
  if (typeof MessageChannel === "function")
    return new Promise((resolve) => {
      let messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = () => {
        messageChannel.port1.close();
        resolve();
      };
      messageChannel.port2.postMessage(null);
    });
  return sleep(0);
}
//@ chunk-dcmhvw5a.js:45031-45090 layout
/**
 * 模糊匹配打分常量（nucleo/fzf 风格）：每字匹配 16、边界后 8、驼峰 6、连续 4、首字符 8、间隙起始 -3 与每字 -1；空查询时最多返回 100 个顶层条目；查询最多取 64 字符；异步建索引每 4ms 让出一次事件循环。
 */
var SCORE_MATCH = 16;
var BONUS_BOUNDARY = 8;
var BONUS_CAMEL = 6;
var BONUS_CONSECUTIVE = 4;
var BONUS_FIRST_CHAR = 8;
var PENALTY_GAP_START = 3;
var PENALTY_GAP_EXTENSION = 1;
var TOP_LEVEL_CACHE_LIMIT = 100;
var MAX_QUERY_LEN = 64;
var CHUNK_MS = 4;
//@ chunk-dcmhvw5a.js:45090-48582 fingerprint = FileIndex (0.826)
/**
 * 文件路径模糊搜索索引（2.1.88 中替代原生 Rust 实现的 TS 版）：每个路径存小写形式、a-z 位图（快速排除不含查询字母的路径）、长度、文件名起点及文件名位图。search：位图过滤后贪心找子序列，计算连续/间隙得分，路径与文件名两种匹配取高者，加边界/驼峰加分与短路径加分，维护大小为 limit 的有序 top-k；最后按名次归一化成 0..1 分数（含 test 的路径略降权）并给出匹配位置。异步构建时分片让出事件循环，部分就绪即可查询。
 */
class FileIndex {
  paths = [];
  lowerPaths = [];
  charBits = new Int32Array(0);
  pathLens = new Uint16Array(0);
  nameStarts = new Uint16Array(0);
  nameCharBits = new Int32Array(0);
  topLevelCache = null;
  matchPositions = new Int32Array(MAX_QUERY_LEN);
  nameMatchPositions = new Int32Array(MAX_QUERY_LEN);
  readyCount = 0;
  buildGen = 0;
  loadFromFileList(fileList) {
    let seen = new Set();
    let paths = [];
    for (let line of fileList)
      if (line.length > 0 && !seen.has(line)) {
        seen.add(line);
        paths.push(line);
      }
    this.buildIndex(paths);
  }
  loadFromFileListAsync(fileList) {
    let markQueryable = () => {};
    let queryable = new Promise((resolve) => {
      markQueryable = resolve;
    });
    let done = this.buildAsync(fileList, markQueryable);
    return {
      queryable,
      done,
    };
  }
  async buildAsync(fileList, markQueryable) {
    let r = ++this.buildGen;
    let s = new Set();
    let paths = [];
    let chunkStart = performance.now();
    for (let i = 0; i < fileList.length; i++) {
      let line = fileList[i];
      if (line.length > 0 && !s.has(line)) {
        s.add(line);
        paths.push(line);
      }
      if ((i & 255) === 255 && performance.now() - chunkStart > CHUNK_MS) {
        await yieldToEventLoop();
        if (this.buildGen !== r) {
          markQueryable();
          return false;
        }
        chunkStart = performance.now();
      }
    }
    this.resetArrays(paths);
    chunkStart = performance.now();
    let firstChunk = true;
    for (let i = 0; i < paths.length; i++) {
      this.indexPath(i);
      if ((i & 255) === 255 && performance.now() - chunkStart > CHUNK_MS) {
        this.readyCount = i + 1;
        if (firstChunk) {
          markQueryable();
          firstChunk = false;
        }
        await yieldToEventLoop();
        if (this.buildGen !== r) return false;
        chunkStart = performance.now();
      }
    }
    this.readyCount = paths.length;
    markQueryable();
    return true;
  }
  buildIndex(paths) {
    this.buildGen++;
    this.resetArrays(paths);
    for (let i = 0; i < paths.length; i++) this.indexPath(i);
    this.readyCount = paths.length;
  }
  resetArrays(paths) {
    let n = paths.length;
    this.paths = paths;
    this.lowerPaths = Array(n);
    this.charBits = new Int32Array(n);
    this.pathLens = new Uint16Array(n);
    this.nameStarts = new Uint16Array(n);
    this.nameCharBits = new Int32Array(n);
    this.readyCount = 0;
    this.topLevelCache = computeTopLevelEntries(paths, TOP_LEVEL_CACHE_LIMIT);
  }
  indexPath(i) {
    let lower = this.paths[i].toLowerCase();
    this.lowerPaths[i] = lower;
    let len = lower.length;
    this.pathLens[i] = len;
    let bits = 0;
    let a = 0;
    let c = 0;
    for (let j = 0; j < len; j++) {
      let code = lower.charCodeAt(j);
      if (code >= 97 && code <= 122) {
        bits |= 1 << (code - 97);
        c |= 1 << (code - 97);
      } else if ((code === 47 || code === 92) && j < len - 1) {
        a = j + 1;
        c = 0;
      }
    }
    this.charBits[i] = bits;
    this.nameStarts[i] = len === this.paths[i].length ? a : 0;
    this.nameCharBits[i] = c;
  }
  search(query, limit) {
    if (limit <= 0) return [];
    if (query.length === 0) {
      if (this.topLevelCache)
        return this.topLevelCache.slice(0, limit).map(({ path, score }) => ({
          path,
          score,
          positions: [],
        }));
      return [];
    }
    let caseSensitive = query !== query.toLowerCase();
    let needle = caseSensitive ? query : query.toLowerCase();
    let min = Math.min(needle.length, MAX_QUERY_LEN);
    let needleChars = Array(min);
    let needleBitmap = 0;
    for (let j = 0; j < min; j++) {
      let ae = needle.charAt(j);
      needleChars[j] = ae;
      let code = ae.charCodeAt(0);
      if (code >= 97 && code <= 122) needleBitmap |= 1 << (code - 97);
    }
    let scoreCeiling = min * (SCORE_MATCH + BONUS_BOUNDARY) + BONUS_FIRST_CHAR + 32;
    let topK = [];
    let threshold = -1 / 0;
    let { paths, lowerPaths, charBits, pathLens, readyCount } = this;
    let { nameStarts, nameCharBits } = this;
    let matchPositions = this.matchPositions;
    let nameMatchPositions = this.nameMatchPositions;
    e: for (let i = 0; i < readyCount; i++) {
      if ((charBits[i] & needleBitmap) !== needleBitmap) continue;
      let haystack = caseSensitive ? paths[i] : lowerPaths[i];
      let pos = haystack.indexOf(needleChars[0]);
      if (pos === -1) continue;
      matchPositions[0] = pos;
      let gapPenalty = 0;
      let consecBonus = 0;
      let prev = pos;
      for (let j = 1; j < min; j++) {
        pos = haystack.indexOf(needleChars[j], prev + 1);
        if (pos === -1) continue e;
        matchPositions[j] = pos;
        let gap = pos - prev - 1;
        if (gap === 0) consecBonus += BONUS_CONSECUTIVE;
        else gapPenalty += PENALTY_GAP_START + gap * PENALTY_GAP_EXTENSION;
        prev = pos;
      }
      let R = nameStarts[i];
      let N =
        gapPenalty > 0 && matchPositions[0] < R && (nameCharBits[i] & needleBitmap) === needleBitmap
          ? scoreNameMatch(haystack, needleChars, R, nameMatchPositions)
          : -1 / 0;
      if (topK.length === limit && scoreCeiling + Math.max(consecBonus - gapPenalty, N) <= threshold)
        continue;
      let path = paths[i];
      let hLen = pathLens[i];
      let score = consecBonus - gapPenalty + sumBoundaryBonuses(path, matchPositions, min);
      let scanFrom = 0;
      if (N !== -1 / 0) {
        let de = N + sumBoundaryBonuses(path, nameMatchPositions, min);
        if (de >= score) {
          score = de;
          scanFrom = R;
        }
      }
      score += min * SCORE_MATCH + Math.max(0, 32 - (hLen >> 2));
      if (topK.length < limit) {
        topK.push({
          pathIndex: i,
          fuzzScore: score,
          scanFrom,
        });
        if (topK.length === limit) {
          topK.sort((de, Se) => de.fuzzScore - Se.fuzzScore);
          threshold = topK[0].fuzzScore;
        }
      } else if (score > threshold) {
        let lo = 0;
        let hi = topK.length;
        while (lo < hi) {
          let mid = (lo + hi) >> 1;
          if (topK[mid].fuzzScore < score) lo = mid + 1;
          else hi = mid;
        }
        topK.splice(lo, 0, {
          pathIndex: i,
          fuzzScore: score,
          scanFrom,
        });
        topK.shift();
        threshold = topK[0].fuzzScore;
      }
    }
    topK.sort((Z, ae) => ae.fuzzScore - Z.fuzzScore);
    let K = topK.length;
    let denom = Math.max(K, 1);
    let ee = Array(K);
    for (let idx = 0; idx < K; idx++) {
      let pathIndex = topK[idx].pathIndex;
      let me = paths[pathIndex];
      let he = lowerPaths[pathIndex];
      let Re = caseSensitive ? me : he;
      let P = Array(min);
      let scanFrom = topK[idx].scanFrom;
      for (let i = 0; i < min; i++) {
        let index = Re.indexOf(needleChars[i], scanFrom);
        P[i] = index;
        scanFrom = index + 1;
      }
      if (!caseSensitive && he.length !== me.length) mapLowerPositionsToOriginal(me, P);
      let positionScore = idx / denom;
      let finalScore = me.includes("test") ? Math.min(positionScore * 1.05, 1) : positionScore;
      ee[idx] = {
        path: me,
        score: finalScore,
        positions: P,
      };
    }
    return ee;
  }
}
//@ chunk-dcmhvw5a.js:48582-48754 layout
function scoreNameMatch(haystack, needleChars, r, nameMatchPositions) {
  let a = 0;
  let c = r - 1;
  for (let j = 0; j < needleChars.length; j++) {
    let index = haystack.indexOf(needleChars[j], c + 1);
    if (index === -1) return -1 / 0;
    nameMatchPositions[j] = index;
    let f = index - c - 1;
    if (j > 0) a += f === 0 ? BONUS_CONSECUTIVE : -(PENALTY_GAP_START + f * PENALTY_GAP_EXTENSION);
    c = index;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:48754-48839 layout
function sumBoundaryBonuses(path, n, r) {
  let s = scoreBonusAt(path, n[0], true);
  for (let j = 1; j < r; j++) s += scoreBonusAt(path, n[j], false);
  return s;
}
//@ chunk-dcmhvw5a.js:48839-48973 file-local
function scoreBonusAt(path, pos, first) {
  if (pos === 0) return first ? BONUS_FIRST_CHAR : 0;
  let prevCh = path.charCodeAt(pos - 1);
  if (isBoundaryChar(prevCh)) return BONUS_BOUNDARY;
  if (isLowerAscii(prevCh) && isUpperAscii(path.charCodeAt(pos))) return BONUS_CAMEL;
  return 0;
}
//@ chunk-dcmhvw5a.js:48973-49042 layout
function isBoundaryChar(code) {
  return code === 47 || code === 92 || code === 45 || code === 95 || code === 46 || code === 32;
}
//@ chunk-dcmhvw5a.js:49042-49078 layout
function isLowerAscii(code) {
  return code >= 97 && code <= 122;
}
//@ chunk-dcmhvw5a.js:49078-49113 layout
function isUpperAscii(code) {
  return code >= 65 && code <= 90;
}
//@ chunk-dcmhvw5a.js:49113-49309 layout
function mapLowerPositionsToOriginal(e, n) {
  let r = 0;
  let s = 0;
  let a = 0;
  while (a < n.length && r < e.length) {
    let codePoint = e.codePointAt(r);
    let g = codePoint > 65535 ? 2 : 1;
    let m = String.fromCodePoint(codePoint).toLowerCase().length;
    while (a < n.length && n[a] < s + m) {
      n[a] = r;
      a++;
    }
    r += g;
    s += m;
  }
}
//@ chunk-dcmhvw5a.js:49309-49677 fingerprint = computeTopLevelEntries (0.74)
/**
 * 空查询时展示的顶层条目：各路径第一段去重（最多 limit 个），按长度再字典序排序。
 */
function computeTopLevelEntries(paths, limit) {
  let topLevel = new Set();
  for (let path of paths) {
    let end = path.length;
    for (let i = 0; i < path.length; i++) {
      let code = path.charCodeAt(i);
      if (code === 47 || code === 92) {
        end = i;
        break;
      }
    }
    let segment = path.slice(0, end);
    if (segment.length > 0) {
      topLevel.add(segment);
      if (topLevel.size >= limit) break;
    }
  }
  let sorted = Array.from(topLevel);
  sorted.sort((a, c) => {
    let lenDiff = a.length - c.length;
    if (lenDiff !== 0) return lenDiff;
    return a < c ? -1 : a > c ? 1 : 0;
  });
  return sorted.slice(0, limit).map((path) => ({
    path,
    score: 0,
    positions: [],
  }));
}
export { CHUNK_MS, yieldToEventLoop, FileIndex };
