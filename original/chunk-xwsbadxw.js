
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import"./chunk-h6b7mazd.js";import"./chunk-kcjh5jnz.js";import"./chunk-0777tkjc.js";import"./chunk-ndmse9kj.js";import"./chunk-vk5xfx8n.js";import"./chunk-0wqny7vr.js";import"./chunk-2g090z7k.js";import"./chunk-eabawhjj.js";import"./chunk-aat7wt0p.js";import"./chunk-x7vma94a.js";import"./chunk-cgcrer2m.js";import"./chunk-6ysndsgz.js";import"./chunk-fq90vph4.js";import"./chunk-jhrww53q.js";import{_,te}from"./chunk-cgr0tezp.js";import"./chunk-cmr2yp8m.js";import"./chunk-j3nx1xyn.js";import"./chunk-m41h77x8.js";import"./chunk-bbtre4r8.js";import"./chunk-znrryf4y.js";import"./chunk-qnshrmd1.js";import"./chunk-hvmek2df.js";import"./chunk-4ymxyb4g.js";import"./chunk-c5gdqf78.js";import"./chunk-8kte1b36.js";import"./chunk-8nhse09v.js";import"./chunk-kpa9nk58.js";import"./chunk-v9tcvh08.js";import"./chunk-bwbq4xvm.js";import"./chunk-5k94rwtv.js";import"./chunk-dcmhvw5a.js";import"./chunk-7dqf31r1.js";import"./chunk-q9xx23ay.js";import"./chunk-k176arn3.js";import"./chunk-3g8vhh6f.js";import"./chunk-ktpw8eqa.js";import"./chunk-byfs7td2.js";import"./chunk-ka3sjxh8.js";import"./chunk-cbe70hjy.js";import"./chunk-gda5w2fs.js";import"./chunk-6mwt0myy.js";import"./chunk-fb1cwb1a.js";import"./chunk-3a1caa6f.js";import"./chunk-kndsyy4v.js";import"./chunk-fnk5kvbf.js";import"./chunk-648vry02.js";import"./chunk-f9pzpnqt.js";import"./chunk-847rdpmn.js";import"./chunk-t0gq9gyw.js";import"./chunk-s7k22nbx.js";import"./chunk-nsfjm4vg.js";import"./chunk-m4p5zn6n.js";import"./chunk-sycgf9xs.js";import"./chunk-wz6vk74d.js";import"./chunk-9mf2agcn.js";import"./chunk-tw8fk0yz.js";import"./chunk-7kr2r08r.js";import"./chunk-5hsd6qen.js";import"./chunk-zw3bhs13.js";import"./chunk-q8cqcff6.js";import"./chunk-2vae0cjf.js";import"./chunk-4vzb3taj.js";import"./chunk-eweqvj83.js";import"./chunk-qrhwndg8.js";import"./chunk-hvpfdswb.js";import{cC,sa}from"./chunk-hq88884p.js";import"./chunk-aepeg2w5.js";import"./chunk-1rckdhfn.js";import"./chunk-b29hdd5e.js";import"./chunk-bmbhxpfm.js";import"./chunk-gwwacf44.js";import"./chunk-9np9x1zv.js";import"./chunk-vd0bcd16.js";import"./chunk-640x3zn9.js";import"./chunk-qg0af0yq.js";import"./chunk-g4mgfvqt.js";import"./chunk-ptag3qm7.js";import"./chunk-wztb57wq.js";import"./chunk-1wpnxx5r.js";import"./chunk-khngy9cs.js";import"./chunk-krkjw7dv.js";import"./chunk-xjt4a4zb.js";import"./chunk-vqdc30xc.js";import"./chunk-hqdsrzb2.js";import"./chunk-vkh471k3.js";import"./chunk-p5akk6be.js";import"./chunk-cyj440je.js";import"./chunk-f5te1san.js";import"./chunk-yxnffbzs.js";import"./chunk-afjz283a.js";import"./chunk-f22e0a61.js";import"./chunk-e7z1g8a9.js";import"./chunk-fxf1mb10.js";import"./chunk-4svv9e16.js";import"./chunk-rtnapjwv.js";import"./chunk-gr2vfhah.js";import"./chunk-tss4qggm.js";import"./chunk-30p0tvt0.js";import"./chunk-mq9v2gw5.js";import"./chunk-mdb2vxrz.js";import"./chunk-gkzv6xmy.js";import"./chunk-xtav90k5.js";import{Nye}from"./chunk-ja1jtv44.js";import"./chunk-yr49hy5m.js";import"./chunk-wphjdnre.js";import"./chunk-3b05zaw0.js";import"./chunk-55ht3bcx.js";import"./chunk-p52gp8zk.js";import"./chunk-ry7mqags.js";import"./chunk-4r7nqnx2.js";import{Xl}from"./chunk-jhr3szt9.js";import"./chunk-7c9mpntp.js";import"./chunk-arf5kz9d.js";import"./chunk-b8krr1px.js";import"./chunk-xh6k20xb.js";import"./chunk-hf6kt4yn.js";import"./chunk-mmkhgzzy.js";import"./chunk-qvp68pt5.js";import"./chunk-yhvmbyx2.js";import"./chunk-1mnz7yj6.js";import"./chunk-4eww0w8n.js";import"./chunk-smzk8psk.js";import"./chunk-jabbzrn8.js";import"./chunk-vv0zxx69.js";import"./chunk-636x8tdt.js";import"./chunk-f2w6209x.js";import"./chunk-7r5y3c3p.js";import"./chunk-02nm3ce0.js";import"./chunk-wr8v03d0.js";import"./chunk-58wc6nbw.js";import"./chunk-xvx41pwz.js";import{createPublicKey as l,verify as g}from"crypto";function y(r){let t={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<r.length;e++){let n=r[e];switch(n){case"--help":case"-h":t.help=!0;break;case"--header":t.header=!0;break;case"--verify":t.verify=!0;break;case"--no-verify":t.verify=!1;break;case"--no-check-expiry":t.checkExpiry=!1;break;case"--api-url":{let o=r[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");t.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(t.token!==void 0)throw Error("decode-token: at most one positional token argument");t.token=n}}return t}function w(r){let e=r.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(r,t){if(!/^[A-Za-z0-9_-]+$/.test(r))throw Error(`decode-token: ${t} is not valid base64url (unexpected characters)`);let e=Buffer.from(r,"base64url").toString("utf8"),n;try{n=te(e)}catch(o){throw Error(`decode-token: ${t} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${t} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(r,t=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=r;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(t>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(t-n)}s ago)`);if(typeof o==="number"&&t+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(r){let t=r.header.alg,e=r.header.kid;if(typeof t!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[t];if(!n)throw Error(`decode-token: unsupported alg=${t} \u2014 only ES256 and RS256 are supported`);let o;try{o=await r.fetchFn(r.jwksUrl,{...sa({url:r.jwksUrl}),...cC(void 0),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${r.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${r.jwksUrl}`);let i=(await o.json()).keys?.find((a)=>a.kid===e);if(!i)throw Error(`decode-token: no JWKS key with kid=${e} at ${r.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(i.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${i.kty} but alg=${t} needs kty=${n}`);let c="sha256",d=t==="ES256"?{key:l({key:i,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:i,format:"jwk"})},k=Buffer.from(`${r.headerB64}.${r.payloadB64}`,"utf8"),f=Buffer.from(r.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(r.checkExpiry!==!1)S(r.payload);return{kid:e}}var h=16384,x=5000;async function b(r=process.stdin){if(r.isTTY)return"";let t=[],e=0;for await(let n of r){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);t.push(o)}return Buffer.concat(t).toString("utf8")}async function v(r,t,e=process.stdin,n=x){if(r?.trim())return r.trim();let o=t.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let s=(await Xl(b(e),n,"decode-token: reading token from stdin")).trim();if(s)return s;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

Decode a session-ingress JWT (CLAUDE_CODE_SESSION_ACCESS_TOKEN) and print its
claims as JSON to stdout. Strips any sk-ant-cc- / sk-ant-si- prefix
automatically. Pipe to jq to extract a single claim.

Token source (first non-empty wins):
  1. Positional argument
  2. $CLAUDE_CODE_SESSION_ACCESS_TOKEN
  3. Piped stdin

Signature verification against <api-url>/v1/code/.well-known/jwks.json is ON
by default, as is the exp/nbf check (60s skew). Prints "verified (kid=\u2026,
sig+exp)" to stderr on success; exits 1 on verification failure, expiry, or
JWKS fetch error. Does NOT pin iss/aud/token-type \u2014 compare those from the
decoded claims if your auth model depends on them.

Options:
  --header           Print the JWT header instead of the claims.
  --no-verify        Skip signature verification and the JWKS fetch. For
                     offline inspection only \u2014 do NOT feed the output to an
                     auth decision.
  --no-check-expiry  Skip the exp/nbf check (signature still verified). For
                     forensics ("was this token ever issued by us?").
  --api-url <url>    API base URL for JWKS fetch (default: $ANTHROPIC_BASE_URL
                     or the built-in default).
  --verify           (Deprecated \u2014 verification is the default. Kept so older
                     wrapper scripts don't break.)
  --help, -h         Show this help.

Examples:
  # In an --exec-path wrapper: who created this session? Signature is
  # verified by default, so a tampered token exits non-zero here.
  # Use jq -re (not -r) when the claim gates an auth decision \u2014 jq -r prints
  # the literal string "null" and exits 0 when the claim is missing.
  creator=$(claude self-hosted-runner decode-token | jq -re .act.email) \\
    || { echo "session JWT: no creator identity or verification failed" >&2; exit 1; }

  # Offline inspection (no network, no auth decision)
  claude self-hosted-runner decode-token --no-verify

  # Decode a different token by piping it (unset the env var first)
  echo "$SOME_TOKEN" | env -u CLAUDE_CODE_SESSION_ACCESS_TOKEN \\
    claude self-hosted-runner decode-token --no-verify
`;async function K(r){let t;try{t=y(r)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}if(t.help)process.stdout.write(O),process.exit(0);try{let e=await v(t.token,process.env),{headerB64:n,payloadB64:o,signatureB64:s}=w(e),i=u(n,"header"),c=u(o,"payload");if(t.verify){let f=`${(t.apiUrl??Nye()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:s,header:i,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:t.checkExpiry}),a=t.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=t.header?i:c;process.stdout.write(`${_(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{K as selfHostedRunnerDecodeTokenMain};
