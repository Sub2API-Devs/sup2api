"""One opt-in public remote-MCP smoke. No automatic retry or raw body persistence.

Requires SUP2API_API_KEY; root executes against the explicitly supplied gateway.
Only public repository documentation is requested. No local files are read.
An optional single pause_turn continuation resends exact returned history.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path

from live_api_smoke import Probe

SERVER = "deepwiki_public_fixture"
ENDPOINT = "https://mcp.deepwiki.com/mcp"
REPOSITORY = "modelcontextprotocol/python-sdk"
BETA = "mcp-client-2025-11-20"


def initial_body(model):
    return {
        "model": model, "max_tokens": 768,
        "system": "This is an anonymous public documentation connectivity fixture. "
                  "Call only read_wiki_structure with repoName exactly " + REPOSITORY + ". "
                  "Do not send any account, user, environment, local workspace, file, "
                  "credential or conversation context to the remote tool. "
                  "Do not call any other tool. After its result, briefly list at most three topic names.",
        "messages": [{"role": "user", "content": "Use read_wiki_structure once to retrieve "
                      "the public documentation topic list for " + REPOSITORY + "."}],
        "mcp_servers": [{"type": "url", "name": SERVER, "url": ENDPOINT}],
        "tools": [{"type": "mcp_toolset", "mcp_server_name": SERVER,
                   "default_config": {"enabled": False},
                   "configs": {"read_wiki_structure": {"enabled": True}}}],
    }


def observations(message):
    blocks = message.get("content", [])
    uses = [b for b in blocks if b.get("type") == "mcp_tool_use"]
    results = [b for b in blocks if b.get("type") == "mcp_tool_result"]
    permitted = all(b.get("name") == "read_wiki_structure"
                    and b.get("server_name") == SERVER
                    and b.get("input") == {"repoName": REPOSITORY} for b in uses)
    paired = sum(any(r.get("tool_use_id") == b.get("id") and not r.get("is_error")
                     for r in results) for b in uses)
    return {"mcp_calls": len(uses), "mcp_results": len(results),
            "permitted_public_arguments": permitted, "successful_pairs": paired,
            "tool_result_errors": sum(bool(r.get("is_error")) for r in results),
            "result_hashes": [hashlib.sha256(json.dumps(r.get("content"), sort_keys=True,
                              separators=(",", ":")).encode()).hexdigest() for r in results]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--allow-one-pause-continuation", action="store_true")
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    probe = Probe(args.base, key, args.model)
    body = initial_body(args.model)
    summaries = []
    all_blocks = []
    for attempt in range(2 if args.allow_one_pause_continuation else 1):
        result = probe.call("public-mcp" if not attempt else "public-mcp-pause-continuation",
                            body, lambda m: m.get("type") == "message" and
                            m.get("role") == "assistant" and isinstance(m.get("content"), list),
                            beta=BETA)
        if result is None:
            break
        all_blocks.extend(result["content"])
        summary = observations(result)
        summaries.append(summary)
        if result.get("stop_reason") != "pause_turn" or not summary["permitted_public_arguments"]:
            break
        if attempt == 0 and args.allow_one_pause_continuation:
            body["messages"].append({"role": "assistant", "content": result["content"]})
    combined = observations({"content": all_blocks})
    passed = (bool(probe.results) and all(r["passed"] for r in probe.results)
              and combined["successful_pairs"] == 1
              and combined["mcp_calls"] == 1
              and all(s["permitted_public_arguments"] and not s["tool_result_errors"] for s in summaries)
              and probe.results[-1].get("stop") == "end_turn")
    evidence = {"endpoint": ENDPOINT, "public_repository": REPOSITORY, "beta": BETA,
                "results": probe.results, "mcp_evidence": summaries, "combined": combined, "passed": passed,
                "scope": "One public read-only MCP query, optional one protocol pause continuation; "
                         "no automatic error retry, no account override, no raw response persistence."}
    args.output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": passed, "mcp_evidence": summaries}), flush=True)
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
