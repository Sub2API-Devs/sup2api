// Raw JSON text: ranges of an object's members and an array's elements, so a
// caller can splice one value and forward every other byte unchanged. Installed
// as ccgateway-raw-json.js (patch-cli-2.1.304.cjs); no native bindings.
const ws = ' \t\n\r';

export function skipWs(s, i) { while (i < s.length && ws.includes(s[i])) i++; return i; }

export function skipString(s, i) {
  for (i++; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === '"') return i + 1;
  }
  throw Error('Unterminated JSON string');
}

export function skipValue(s, i) {
  if (s[i] === '"') return skipString(s, i);
  if (s[i] === '{' || s[i] === '[') {
    for (let depth = 0; i < s.length;) {
      if (s[i] === '"') { i = skipString(s, i); continue; }
      if (s[i] === '{' || s[i] === '[') depth++;
      else if ((s[i] === '}' || s[i] === ']') && --depth === 0) return i + 1;
      i++;
    }
    throw Error('Unterminated JSON value');
  }
  while (i < s.length && !',}]'.includes(s[i]) && !ws.includes(s[i])) i++;
  return i;
}

// members lists an object's keys with their value ranges; i is at '{'.
export function members(s, i) {
  const out = [];
  i = skipWs(s, i + 1);
  while (s[i] !== '}') {
    const keyEnd = skipString(s, i), key = JSON.parse(s.slice(i, keyEnd));
    const start = skipWs(s, skipWs(s, keyEnd) + 1), end = skipValue(s, start);
    out.push({ key, start, end });
    i = skipWs(s, end);
    if (s[i] === ',') i = skipWs(s, i + 1);
  }
  return out;
}

// elements lists an array's element ranges; i is at '['.
export function elements(s, i) {
  const out = [];
  i = skipWs(s, i + 1);
  while (s[i] !== ']') {
    const end = skipValue(s, i);
    out.push({ start: i, end });
    i = skipWs(s, end);
    if (s[i] === ',') i = skipWs(s, i + 1);
  }
  return out;
}

// member is the last member with key, as in JSON.parse.
export const member = (list, key) => list.findLast(m => m.key === key);
