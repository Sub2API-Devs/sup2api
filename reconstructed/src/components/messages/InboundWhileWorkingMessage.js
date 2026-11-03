/**
 * components/messages/InboundWhileWorkingMessage.tsx
 *
 * 2.1.316 新增：工作中收到的频道/同伴消息显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e67761vs.js (7)
 * attribution: placement 7
 */
import { CHANNEL, CHANNEL_SOURCE_OPEN } from "../../constants/xml.js";
import { externalSourceWarning, Q6n, Nue } from "../../utils/contextAttachments/externalMessages.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ove } from "../../utils/confusables.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { truncateToWidth } from "../../utils/format.js";
import { p1e } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-e67761vs.js:13716-13898 placement
var regExp = new RegExp(`^<${CHANNEL}\\s+source="([^"]*)"([^>]*)>\\n?`),
  x = `</${CHANNEL}>`,
  h = `
${x}`,
  oe = /\buser="([^"]+)"/,
  q = [
    `

${externalSourceWarning(!1)}${Q6n}`,
    `

${externalSourceWarning(!1)}`,
    `

${externalSourceWarning(!0)}${Q6n}`,
    `

${externalSourceWarning(!0)}`,
  ];
//@ chunk-e67761vs.js:13898-13966 placement
function z(u) {
  let index = u.lastIndexOf(":");
  return index === -1 ? u : u.slice(index + 1);
}
//@ chunk-e67761vs.js:13966-14213 placement
function parseChannelMessage(u) {
  let a = "",
    l = u;
  if (l.startsWith(Nue)) {
    let index = l.indexOf(`
`);
    if (index !== -1 && l.startsWith(CHANNEL_SOURCE_OPEN, index + 1))
      ((a = l.slice(0, index)), (l = l.slice(index + 1)));
  }
  let match = regExp.exec(l);
  if (!match) return null;
  let [b, i = "", c] = match;
  return { lead: a, rest: l, open: b, source: i, user: oe.exec(c ?? "")?.[1] };
}
//@ chunk-e67761vs.js:14213-14222 placement
var J = 60;
/**
 * 工作中收到的外部消息（频道/同伴）在对话中的显示。
 */
//@ chunk-e67761vs.js:14222-15302 placement
function InboundWhileWorkingMessage(u) {
  let g = w(18),
    {
      addMargin: addMargin,
      param: param,
      messageId: messageId,
      origin: origin,
      isExpanded: isExpanded,
      followsSpeakerLabel: followsSpeakerLabel,
    } = u,
    { text: text } = param,
    t = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    p,
    d,
    f,
    N,
    E;
  if (g[0] !== addMargin || g[1] !== t || g[2] !== text) {
    E = EARLY_RETURN_SENTINEL;
    U: {
      let k = parseChannelMessage(text);
      if (!k) {
        E = t
          ? e(CollapsibleText, { text: text.trim() })
          : e(Box, { marginTop: addMargin ? 1 : 0, children: e(Text, { children: text.trim() }) });
        break U;
      }
      let { open: open, source: source, user: user } = k;
      let { lead: lead, rest: rest } = k;
      d = lead;
      let D = rest.lastIndexOf(x) + x.length;
      if (D > x.length - 1) {
        let sliced = rest.slice(D);
        if (q.includes(sliced)) rest = rest.slice(0, D);
      }
      let F = ove(source);
      if (d === `${Nue}${F} while you were working:` || d === `${Nue}${F}:`) d = "";
      p = rest.slice(open.length);
      let trimEnd = p.trimEnd();
      if (trimEnd.endsWith(h)) p = trimEnd.slice(0, -h.length);
      f = z(F);
      N = user ? ove(user) : void 0;
    }
    ((g[0] = addMargin),
      (g[1] = t),
      (g[2] = text),
      (g[3] = p),
      (g[4] = d),
      (g[5] = f),
      (g[6] = N),
      (g[7] = E));
  } else ((p = g[3]), (d = g[4]), (f = g[5]), (N = g[6]), (E = g[7]));
  if (E !== EARLY_RETURN_SENTINEL) return E;
  let K = N,
    M;
  if (
    g[8] !== addMargin ||
    g[9] !== p ||
    g[10] !== t ||
    g[11] !== isExpanded ||
    g[12] !== d ||
    g[13] !== messageId ||
    g[14] !== origin ||
    g[15] !== f ||
    g[16] !== K
  )
    ((M = e(InboundMessageBody, {
      addMargin: addMargin,
      messageId: messageId,
      origin: origin,
      isExpanded: isExpanded,
      followsSpeakerLabel: t,
      lead: d,
      content: p,
      serverName: f,
      userName: K,
    })),
      (g[8] = addMargin),
      (g[9] = p),
      (g[10] = t),
      (g[11] = isExpanded),
      (g[12] = d),
      (g[13] = messageId),
      (g[14] = origin),
      (g[15] = f),
      (g[16] = K),
      (g[17] = M));
  else M = g[17];
  return M;
}
//@ chunk-e67761vs.js:15302-16095 placement
function InboundMessageBody(u) {
  let d = w(19),
    {
      addMargin: addMargin,
      messageId: messageId,
      origin: origin,
      isExpanded: isExpanded,
      followsSpeakerLabel: followsSpeakerLabel,
      lead: lead,
      content: content,
      serverName: serverName,
      userName: userName,
    } = u;
  const p = `${
    lead
      ? `${lead}
`
      : ""
  }${content}`;
  let f;
  if (d[0] !== p) ((f = p.trim()), (d[0] = p), (d[1] = f));
  else f = d[1];
  let N = f,
    E;
  if (d[2] !== serverName || d[3] !== userName)
    ((E = Hb(userName ?? serverName) || serverName), (d[2] = serverName), (d[3] = userName), (d[4] = E));
  else E = d[4];
  let k = E;
  const U = isExpanded || followsSpeakerLabel;
  let v;
  if (d[5] !== k) ((v = { name: k }), (d[5] = k), (d[6] = v));
  else v = d[6];
  let y;
  if (d[7] !== addMargin || d[8] !== followsSpeakerLabel || d[9] !== serverName || d[10] !== userName)
    ((y = (j) =>
      e(ChannelMessageHeader, {
        addMargin: addMargin,
        followsSpeakerLabel: followsSpeakerLabel,
        serverName: serverName,
        userName: userName,
        body: j,
      })),
      (d[7] = addMargin),
      (d[8] = followsSpeakerLabel),
      (d[9] = serverName),
      (d[10] = userName),
      (d[11] = y));
  else y = d[11];
  let M;
  if (d[12] !== N || d[13] !== messageId || d[14] !== origin || d[15] !== U || d[16] !== v || d[17] !== y)
    ((M = { messageId: messageId, stored: origin, text: N, isExpanded: U, sender: v, draw: y }),
      (d[12] = N),
      (d[13] = messageId),
      (d[14] = origin),
      (d[15] = U),
      (d[16] = v),
      (d[17] = y),
      (d[18] = M));
  else M = d[18];
  return a9.useUserMessageSite(M);
}
//@ chunk-e67761vs.js:16095-16796 placement
function ChannelMessageHeader(u) {
  let c = w(14),
    {
      addMargin: addMargin,
      followsSpeakerLabel: followsSpeakerLabel,
      serverName: serverName,
      userName: userName,
      body: body,
    } = u;
  if (followsSpeakerLabel) {
    let o;
    if (c[0] !== body) ((o = e(CollapsibleText, { text: body })), (c[0] = body), (c[1] = o));
    else o = c[1];
    return o;
  }
  let o;
  if (c[2] !== body) ((o = truncateToWidth(body.replace(/\s+/g, " "), J)), (c[2] = body), (c[3] = o));
  else o = c[3];
  let t = o;
  const g = addMargin ? 1 : 0;
  let p;
  if (c[4] === MEMO_CACHE_SENTINEL)
    ((p = e(Text, { "aria-label": "inbound:", color: "suggestion", children: p1e })), (c[4] = p));
  else p = c[4];
  const d = userName ? ` \xB7 ${userName}` : "";
  let f;
  if (c[5] !== serverName || c[6] !== d)
    ((f = r(Text, { dimColor: !0, children: [serverName, d, ":"] })),
      (c[5] = serverName),
      (c[6] = d),
      (c[7] = f));
  else f = c[7];
  let N;
  if (c[8] !== f || c[9] !== t)
    ((N = r(Text, { children: [p, " ", f, " ", t] })), (c[8] = f), (c[9] = t), (c[10] = N));
  else N = c[10];
  let E;
  if (c[11] !== g || c[12] !== N)
    ((E = e(Box, { marginTop: g, children: N })), (c[11] = g), (c[12] = N), (c[13] = E));
  else E = c[13];
  return E;
}
