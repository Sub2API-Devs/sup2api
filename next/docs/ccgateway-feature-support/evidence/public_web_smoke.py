"""Two opt-in public web-tool calls, no retries or stored response bodies."""
import argparse
import hashlib
import json
import os
from pathlib import Path

from live_api_smoke import Probe, user


def inspect(message, name):
    message = message if isinstance(message, dict) else {}
    blocks = message.get("content", [])
    shaped = (message.get("type") == "message" and message.get("role") == "assistant"
              and isinstance(message.get("id"), str) and bool(message["id"])
              and isinstance(blocks, list) and all(isinstance(b, dict) for b in blocks))
    blocks = blocks if shaped else []
    calls = [b for b in blocks if b.get("type") == "server_tool_use"]
    results = [b for b in blocks if isinstance(b.get("type"), str) and b["type"].endswith("_tool_result")]
    paired = False
    if len(calls) == len(results) == 1:
        call, result = calls[0], results[0]
        ident = call.get("id")
        content = result.get("content")
        if name == "web_search":
            good = (isinstance(content, list) and bool(content)
                    and all(isinstance(b, dict) and b.get("type") == "web_search_result" for b in content))
        else:
            good = isinstance(content, dict) and content.get("type") == "web_fetch_result"
        paired = (isinstance(ident, str) and bool(ident) and call.get("name") == name
                  and result.get("type") == name + "_tool_result"
                  and result.get("tool_use_id") == ident and not result.get("is_error") and good)
    citations = [c for b in blocks if isinstance(b.get("citations"), list)
                 for c in b["citations"] if isinstance(c, dict) and isinstance(c.get("type"), str)]
    invalid_block = any(b.get("type") in ("tool_use", "tool_result", "refusal", "error") for b in blocks)
    completed = (shaped and paired and not invalid_block and bool(citations)
                 and message.get("stop_reason") == "end_turn"
                 and any(b.get("type") == "text" and isinstance(b.get("text"), str) and b["text"].strip() for b in blocks))
    return {"calls": len(calls), "results": len(results), "successful_pairs": int(paired),
            "citations": len(citations), "stop": message.get("stop_reason"), "completed": bool(completed),
            "result_sha256": [hashlib.sha256(json.dumps(b, sort_keys=True).encode()).hexdigest() for b in results]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    probe = Probe(args.base, key, "claude-opus-5-5")
    checks = {}
    cases = [
        ("web_search", "web_search_20250305", "Search once on platform.claude.com for the official task budgets documentation. State its page title and cite the result."),
        ("web_fetch", "web_fetch_20250910", "Fetch https://platform.claude.com/docs/en/build-with-claude/task-budgets once. State its title and cite one sentence about remaining. Do not call other tools."),
    ]
    for name, kind, prompt in cases:
        tool = {"type": kind, "name": name, "max_uses": 1, "allowed_domains": ["platform.claude.com"]}
        if name == "web_fetch":
            tool.update(max_content_tokens=4000, citations={"enabled": True})
        body = probe.body([user(prompt)], tools=[tool])
        body["max_tokens"] = 1024
        message = probe.call(name, body, lambda m: m.get("type") == "message", protocol_only=True,
                             beta="web-fetch-2025-09-10" if name == "web_fetch" else None)
        checks[name] = inspect(message, name)
    report = {"results": probe.results, "checks": checks,
              "passed": len(checks) == 2 and all(c["completed"] for c in checks.values()),
              "scope": "Two direct public web tools with citations; no dynamic filtering, retries, or account override."}
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": checks}))
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
