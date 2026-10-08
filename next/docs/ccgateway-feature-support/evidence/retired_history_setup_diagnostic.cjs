// Zero-provider diagnostic. Execute only when separately authorized; not executed during preparation.

const http = require("http"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  cp = require("child_process"),
  crypto = require("crypto");
(async () => {
  const forward = false; // Diagnostic only: never contacts the provider.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-history-check-"));
  const sid = crypto.randomUUID();
  let parent = null;
  const calls = ["retired_fixture", "bash"].map((name, i) => ({
    type: "tool_use",
    id: "history_fixture_" + i,
    name,
    input: { fixture: "historical synthetic data only" },
  }));
  const msgs = [
    {
      role: "user",
      content: [{ type: "text", text: "Synthetic completed calls." }],
    },
    { role: "assistant", content: calls },
    {
      role: "user",
      content: calls.map((c) => ({
        type: "tool_result",
        tool_use_id: c.id,
        content: "Synthetic successful result.",
      })),
    },
    {
      role: "assistant",
      content: [{ type: "text", text: "Historical task complete." }],
    },
  ];
  const rows = msgs.map((message) => {
    if (message.role === "assistant")
      Object.assign(message, {
        id: "msg_" + crypto.randomUUID().replaceAll("-", ""),
        type: "message",
        model: "claude-opus-5-5",
        stop_reason: message.content.some((b) => b.type === "tool_use")
          ? "tool_use"
          : "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      });
    const uuid = crypto.randomUUID();
    const row = {
      type: message.role,
      uuid,
      parentUuid: parent,
      sessionId: sid,
      isSidechain: false,
      userType: "external",
      cwd: dir,
      version: "2.1.292",
      timestamp: new Date().toISOString(),
      message,
    };
    parent = uuid;
    return JSON.stringify(row);
  });
  const file = path.join(dir, "fixture.jsonl");
  fs.writeFileSync(file, rows.join("\n") + "\n", { mode: 0o600 });
  const facts = {
    mode: forward ? "real" : "zero",
    total_http: 0,
    route_counts: {},
    attempted: 0,
    forwarded: 0,
    provider_status: null,
    history_names: [],
    tools_count: null,
    history_exact: false,
    terminal: null,
    history_ready: false,
    tool_events: 0,
  };
  let child;
  const server = http.createServer(async (req, res) => {
    facts.total_http++;
    const pathname = new URL(req.url, "http://localhost").pathname;
    const route = ["/v1/messages", "/v1/messages/count_tokens"].includes(
      pathname,
    )
      ? pathname
      : "other";
    facts.route_counts[route] = (facts.route_counts[route] || 0) + 1;
    let parts = [];
    for await (const p of req) parts.push(p);
    const raw = Buffer.concat(parts);
    if (!/^\/v1\/messages(?:\?|$)/.test(req.url)) {
      res.writeHead(400);
      res.end("{}");
      return;
    }
    facts.attempted++;
    try {
      const body = JSON.parse(raw);
      facts.tools_count = (body.tools || []).length;
      const hist = [];
      for (const m of body.messages || [])
        for (const b of Array.isArray(m.content) ? m.content : [])
          if (b.type === "tool_use" && b.id?.startsWith("history_fixture_"))
            hist.push(b);
      facts.history_names = hist.map((b) => b.name);
      facts.history_exact = JSON.stringify(hist) === JSON.stringify(calls);
      if (
        !forward ||
        facts.forwarded ||
        facts.tools_count !== 0 ||
        !facts.history_exact
      ) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          '{"type":"error","error":{"type":"invalid_request_error","message":"isolated probe gate"}}',
        );
        if (!forward) setTimeout(() => child.kill("SIGTERM"), 300);
        return;
      }
    } catch (e) {
      facts.transport_error = e.name;
      res.writeHead(502);
      res.end("{}");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const noProxy =
    (process.env.NO_PROXY || process.env.no_proxy || "") +
    ",127.0.0.1,localhost";
  child = cp.spawn(
    "/usr/local/bin/claude",
    [
      "-p",
      "Reply with exactly HISTORY_READY. Do not use tools.",
      "--resume",
      file,
      "--fork-session",
      "--model",
      "claude-opus-5-5",
      "--output-format",
      "stream-json",
      "--verbose",
      "--tools",
      "",
      "--max-turns",
      "1",
      "--setting-sources",
      "",
      "--no-session-persistence",
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        ANTHROPIC_BASE_URL: "http://127.0.0.1:" + server.address().port,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL: "1",
        NO_PROXY: noProxy,
        no_proxy: noProxy,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let out = "",
    stderrBytes = 0;
  child.stdout.on("data", (b) => {
    if (out.length < 2000000) out += b;
  });
  child.stderr.on("data", (b) => {
    stderrBytes += b.length;
  });
  const timer = setTimeout(
    () => child.kill("SIGKILL"),
    forward ? 90000 : 20000,
  );
  facts.exit_code = await new Promise((r) => child.on("close", r));
  clearTimeout(timer);
  facts.stderr_bytes = stderrBytes;
  facts.event_types = [];
  facts.event_subtypes = [];
  for (const line of out.split("\n")) {
    try {
      const e = JSON.parse(line);
      if (typeof e.type === "string") facts.event_types.push(e.type);
      const subtype = e.subtype || e.request?.subtype || e.response?.subtype;
      if (typeof subtype === "string")
        facts.event_subtypes.push(
          /^[a-z_]{1,64}$/.test(subtype) ? subtype : "unclassified",
        );
      if (e.type === "result") {
        facts.terminal = e.subtype;
        facts.is_error = e.is_error;
        facts.history_ready =
          typeof e.result === "string" && e.result.trim() === "HISTORY_READY";
        facts.usage = e.usage;
      }
      if (e.type === "assistant")
        facts.tool_events += (e.message?.content || []).filter(
          (b) => b.type === "tool_use",
        ).length;
    } catch {}
  }
  facts.event_types = [...new Set(facts.event_types)];
  facts.event_subtypes = [...new Set(facts.event_subtypes)];
  console.log(JSON.stringify(facts));
  server.close();
  setTimeout(() => process.exit(0), 100);
})();
