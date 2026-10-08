"""Opt-in anonymous dynamic MCP: fresh, continuation, rollback; at most three calls."""
import argparse
import contextlib
import io
import json
import os
from pathlib import Path
from live_api_smoke import Probe, assistant, user
from public_inline_search import evidence_rows, valid_message
from public_pinned_mcp_search import BETA, TOOL, SERVER, ENDPOINT, REPOSITORY, digest, inspect, initial_body


def listing_digest(block):
    if set(block) != {"type", "mcp_server_name", "tools"} or block.get("mcp_server_name") != SERVER:
        return None
    tools = block.get("tools")
    if not isinstance(tools, list) or not 1 <= len(tools) <= 100:
        return None
    names = set()
    for tool in tools:
        if not isinstance(tool, dict) or set(tool) - {"name", "description", "input_schema"}:
            return None
        name = tool.get("name")
        if not isinstance(name, str) or not name or name in names or not isinstance(tool.get("input_schema"), dict):
            return None
        if tool.get("description") is not None and not isinstance(tool["description"], str):
            return None
        names.add(name)
    return digest(block) if TOOL in names else None


def completed(message, expected_listing=None):
    if not valid_message(message) or message.get("stop_reason") != "end_turn":
        return None
    blocks = message["content"]
    if not all(isinstance(block, dict) for block in blocks):
        return None
    listings = [b for b in blocks if b.get("type") == "mcp_tool_listing"]
    if len(listings) > 1 or (expected_listing is None and len(listings) != 1):
        return None
    current = listing_digest(listings[0]) if listings else expected_listing
    if current is None or (expected_listing is not None and current != expected_listing):
        return None
    if listings:
        listing_pos = blocks.index(listings[0])
        search_pos = next((i for i, b in enumerate(blocks) if b.get("type") == "server_tool_use"), -1)
        if listing_pos >= search_pos:
            return None
    try:
        state = inspect(blocks)
    except (AttributeError, KeyError, TypeError, ValueError):
        return None
    required = ("permitted_public_arguments", "search_inputs_valid", "exact_reference", "search_paired",
                "search_no_errors", "no_client_calls", "search_before_mcp", "valid_unique_ids", "known_blocks")
    if not all(state[k] for k in required) or state["tool_result_errors"]:
        return None
    if not (state["search_calls"] == state["search_results"] == state["reference_count"] ==
            state["mcp_calls"] == state["mcp_results"] == state["successful_pairs"] == 1):
        return None
    return current, state


def run(probe):
    body = initial_body(probe.model, [])
    del body["tools"][1]["tools"]  # Truly dynamic: never query/pin a local directory.
    original = body["messages"]
    checks, summaries = {}, []
    first = None
    catalog = None
    seen_ids = set()
    for label in ("fresh", "continuation", "rollback"):
        if label != "fresh":
            body["messages"] = original + [assistant(first), user(
                "Repeat the same public repository fixture on this " + label +
                " branch: search read_wiki_structure once and call it once for " + REPOSITORY + ".")]
        result = probe.call("dynamic-mcp-" + label, body, valid_message, protocol_only=True, beta=BETA)
        verified = completed(result, catalog)
        if verified is None:
            checks[label] = False
            break
        ids = [b["id"] for b in result["content"] if b.get("type") in ("server_tool_use", "mcp_tool_use")]
        if any(value in seen_ids for value in ids):
            checks[label] = False
            break
        seen_ids.update(ids)
        catalog, summary = verified
        checks[label] = True
        summaries.append(summary)
        if first is None: first = result
    return {"passed": all(checks.get(k, False) for k in ("fresh", "continuation", "rollback")),
            "checks": checks, "listing_sha256": catalog, "summaries": summaries, "results": evidence_rows(probe.results),
            "endpoint": ENDPOINT, "public_repository": REPOSITORY, "beta": BETA,
            "scope": "One anonymous dynamic server, no auth or pinned tools, only public repository input. Three calls maximum; first mismatch/refusal/pause stops, no retry. Exact returned history retained in memory only. Worker history/permission/wire facts require separate log verification."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key: parser.error("SUP2API_API_KEY required")
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, args.model))
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)

if __name__ == "__main__": main()
