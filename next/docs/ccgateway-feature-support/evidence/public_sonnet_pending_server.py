"""One opt-in public API call using explicitly constructed unsigned pending-server history.

This is NOT a replay of an observed provider pause_turn. No real response is
truncated, no loop attempts to force a pause, and no follow-up/retry is sent.
Only public Claude documentation search is allowed. Model execution is main-only.
"""
import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import uuid

from live_api_smoke import Probe, text
from public_inline_search import evidence_rows, valid_message

MODEL = "claude-sonnet-4-6"
DOMAIN = "platform.claude.com"
QUERY = "site:platform.claude.com/docs server tools pause_turn continuation"
DOCS = "https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools"


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def initial_body():
    pending_id = "srvtoolu_fixture_" + uuid.uuid4().hex
    messages = [
        {"role": "user", "content": "This is an explicitly constructed unsigned compatibility fixture, "
         "not an actual prior provider conversation. Discuss only public Claude documentation."},
        {"role": "assistant", "content": "This fixture concerns public documentation."},
        {"role": "user", "content": "Finish the pending documentation search and briefly explain "
         "what pause_turn means. Do not start another search or use any other tool."},
        {"role": "assistant", "content": [
            {"type": "text", "text": "The public documentation lookup is pending."},
            {"type": "server_tool_use", "id": pending_id, "name": "web_search", "input": {"query": QUERY}}
        ]},
    ]
    return {"model": MODEL, "max_tokens": 512, "messages": messages,
            "system": "One public documentation compatibility check. Do not transmit account details, "
                      "credentials, local files, environment or other private context. Complete only "
                      "the supplied pending public search; do not issue another tool call.",
            "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 1,
                       "allowed_domains": [DOMAIN]}]}, pending_id


def observations(result, pending_id):
    if not valid_message(result):
        return {"valid_message": False, "completed_constructed_pending_history": False}
    blocks = result["content"]
    if not all(isinstance(block, dict) for block in blocks):
        return {"valid_message": False, "completed_constructed_pending_history": False}
    known_blocks = all(block.get("type") in ("text", "thinking", "redacted_thinking", "web_search_tool_result") for block in blocks)
    results = [b for b in blocks if b.get("type") == "web_search_tool_result"]
    calls = [b for b in blocks if b.get("type") in ("server_tool_use", "tool_use", "mcp_tool_use")]
    paired = len(results) == 1 and isinstance(results[0].get("tool_use_id"), str) and results[0]["tool_use_id"] == pending_id
    successful = paired and isinstance(results[0].get("content"), list)
    facts = {"valid_message": True, "pending_result_paired": paired, "server_result_success": successful,
             "known_response_blocks": known_blocks, "additional_calls": len(calls), "result_count": len(results), "stop": result.get("stop_reason"),
             "nonempty_final_text": bool(text(result)),
             "result_hashes": [digest(b.get("content")) for b in results],
             "actual_provider_pause_observed": False}
    facts["completed_constructed_pending_history"] = bool(successful and known_blocks and not calls and
        result.get("stop_reason") == "end_turn" and facts["nonempty_final_text"])
    return facts


def run(probe):
    body, pending_id = initial_body()
    # No private routing/policy headers. A real 400 remains a failed fixture;
    # normal refusal remains protocol-valid but does not prove completion.
    result = probe.call("constructed-sonnet-pending-server-history", body, valid_message, protocol_only=True)
    facts = observations(result, pending_id)
    return {"model": MODEL, "history_origin": "constructed_unsigned_fixture",
            "actual_provider_pause_observed": False, "official_reference": DOCS,
            "request_messages_sha256": digest(body["messages"]),
            "request_tail_sha256": digest(body["messages"][-1]),
            "pending_tool_id_sha256": hashlib.sha256(pending_id.encode()).hexdigest(),
            "tools_sha256": digest(body["tools"]), "allowed_domain": DOMAIN, "max_uses": 1,
            "results": evidence_rows(probe.results), "checks": facts,
            "passed": facts.get("completed_constructed_pending_history", False),
            "scope": "Exactly one platform API request, no retries or pause continuations. "
                     "Constructed pending history acceptance is distinct from real provider pause replay. "
                     "Worker logs must separately verify cold bootstrap, original tail, safety attachment "
                     "position and zero extra upstream inference; this client cannot attest those facts."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, MODEL))
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
