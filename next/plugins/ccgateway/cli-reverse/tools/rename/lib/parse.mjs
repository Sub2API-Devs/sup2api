// 解析与文件分类。所有工具用同一套 Babel 选项，偏移（node.start/end）是解码后字符串的
// UTF-16 下标，与 tools/ast/scan.mjs 的 start/end 一致。
// 用法：import { parseModule, isJsFile, readText } from './parse.mjs'
import fs from 'node:fs';
import { parse } from '@babel/parser';

export const PARSE_OPTIONS = Object.freeze({ sourceType: 'module', errorRecovery: false });

export function isJsFile(file) {
  return /\.(js|mjs|cjs)$/.test(file);
}

// 读为 UTF-8 字符串；若字节不能无损往返（非法 UTF-8），返回 null，调用方应原样复制。
export function readText(absPath) {
  const buf = fs.readFileSync(absPath);
  const text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf)) return { buf, text: null };
  return { buf, text };
}

export function parseModule(text) {
  return parse(text, PARSE_OPTIONS);
}

// 返回 { ast } 或 { error }。不能解析的 .js（例如 zstd 压缩的资源脚本）由调用方原样复制。
export function tryParse(text) {
  if (text === null) return { error: 'not valid UTF-8' };
  try {
    return { ast: parseModule(text) };
  } catch (e) {
    return { error: String(e.message) };
  }
}
