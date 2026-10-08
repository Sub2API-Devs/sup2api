"""Opt-in pinned deferred MCP search probe; no model call without explicit main execution.

Anonymous tools/list fetches the complete public DeepWiki catalog. Model calls use
SUP2API_API_KEY and explicit --base; maximum one initial call and one opted-in
pause_turn continuation. No retries, secrets, or raw prompt/result persistence.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.request

from live_api_smoke import NoRedirect, Probe
from public_mcp_smoke import ENDPOINT, REPOSITORY, SERVER, observations

BETA = "mcp-client-2026-09-15"
TOOL = "read_wiki_structure"
REFERENCE = SERVER + "_" + TOOL


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                     ensure_ascii=False).encode()).hexdigest()


def fetch_catalog():
    request = urllib.request.Request(ENDPOINT, data=json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
        raw = response.read(256 * 1024 + 1)
        media = response.headers.get("Content-Type", "")
    if len(raw) > 256 * 1024:
        raise ValueError("catalog exceeds bound")
    if "text/event-stream" in media:
        messages = [json.loads(line[5:].strip()) for line in raw.decode().splitlines()
                    if line.startswith("data:")]
        matches = [message for message in messages if message.get("id") == 1]
        if len(matches) != 1:
            raise ValueError("unexpected tools/list envelope")
        message = matches[0]
    else:
        message = json.loads(raw)
    result = message.get("result", {})
    if message.get("id") != 1 or message.get("error") or result.get("nextCursor"):
        raise ValueError("catalog unavailable or incomplete")
    tools = result.get("tools")
    if not isinstance(tools, list) or not 1 <= len(tools) <= 100:
        raise ValueError("invalid catalog")
    pinned, names = [], set()
    for tool in tools:
        name, schema = tool.get("name"), tool.get("inputSchema")
        if not isinstance(name, str) or not name or name in names or not isinstance(schema, dict):
            raise ValueError("invalid tool identity/schema")
        names.add(name)
        entry = {"name": name, "input_schema": schema}
        if "description" in tool:
            if not isinstance(tool["description"], str):
                raise ValueError("invalid description")
            entry["description"] = tool["description"]
        pinned.append(entry)
    if TOOL not in names:
        raise ValueError("public read-only tool missing")
    return pinned


def initial_body(model, pinned):
    return {"model": model, "max_tokens": 1024,
            "system": "Anonymous public documentation fixture. First use tool_search_tool_regex "
                      "with input exactly {\"pattern\":\"read_wiki_structure\"}. Then call only "
                      "read_wiki_structure once with repoName exactly " + REPOSITORY + ". "
                      "Do not send local files, environment, accounts, credentials or conversation "
                      "context. After the remote result reply briefly. No other tool calls.",
            "messages": [{"role": "user", "content": "Discover and call the deferred public "
                          "documentation topic-list tool for " + REPOSITORY + "."}],
            "mcp_servers": [{"type": "url", "name": SERVER, "url": ENDPOINT}],
            "tools": [{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
                      {"type": "mcp_toolset", "mcp_server_name": SERVER, "tools": pinned,
                       "default_config": {"enabled": False, "defer_loading": True},
                       "configs": {TOOL: {"enabled": True, "defer_loading": True}}}]}


def inspect(blocks):
    summary = observations({"content": blocks})
    calls = [b for b in blocks if b.get("type") == "server_tool_use"]
    results = [b for b in blocks if b.get("type") == "tool_search_tool_result"]
    refs = [ref for block in results for ref in block.get("content", {}).get("tool_references", [])]
    summary.update(search_calls=len(calls), search_results=len(results), reference_count=len(refs),
                   search_no_errors=all(r.get("content", {}).get("type") == "tool_search_tool_search_result" for r in results),
                   search_inputs_valid=all(c.get("name") == "tool_search_tool_regex" and
                       c.get("input") == {"pattern": TOOL} for c in calls),
                   exact_reference=all(ref == {"type": "tool_reference", "tool_name": REFERENCE}
                                       for ref in refs),
                   reference_hashes=[digest(ref) for ref in refs],
                   search_paired=all(any(r.get("tool_use_id") == c.get("id") and
                       r.get("content", {}).get("type") == "tool_search_tool_search_result"
                       for r in results) for c in calls),
                   no_client_calls=not any(b.get("type") == "tool_use" for b in blocks))
    mcp_calls = [b for b in blocks if b.get("type") == "mcp_tool_use"]
    mcp_results = [b for b in blocks if b.get("type") == "mcp_tool_result"]
    use_ids = [b.get("id") for b in calls + mcp_calls]
    result_ids = [b.get("tool_use_id") for b in results + mcp_results]
    def unique_ids(values):
        return all(isinstance(value, str) and bool(value.strip()) for value in values) and len(set(values)) == len(values)
    summary["valid_unique_ids"] = unique_ids(use_ids) and unique_ids(result_ids)
    kinds = ("server_tool_use", "tool_search_tool_result", "mcp_tool_use", "mcp_tool_result")
    positions = [next((i for i, block in enumerate(blocks) if block.get("type") == kind), None) for kind in kinds]
    summary["search_before_mcp"] = (all(position is not None for position in positions)
                                    and all(left < right for left, right in zip(positions, positions[1:])))
    summary["known_blocks"] = all(block.get("type") in kinds + (
        "text", "thinking", "redacted_thinking", "mcp_tool_listing") for block in blocks)
    return summary


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
    try:
        pinned = fetch_catalog()
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        evidence = {"passed": False, "stage": "anonymous_tools_list", "exception_type": type(error).__name__}
        args.output.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(evidence))
        raise SystemExit(1)
    body = initial_body(args.model, pinned)
    probe = Probe(args.base, key, args.model)
    blocks = []
    for attempt in range(2 if args.allow_one_pause_continuation else 1):
        result = probe.call("pinned-public-mcp-search" if not attempt else "pinned-public-mcp-pause",
                            body, lambda m: m.get("type") == "message" and m.get("role") == "assistant"
                            and isinstance(m.get("content"), list), beta=BETA)
        if result is None:
            break
        blocks.extend(result["content"])
        state = inspect(blocks)
        safe = (state["permitted_public_arguments"] and state["search_inputs_valid"] and
                state["exact_reference"] and state["no_client_calls"] and state["search_no_errors"]
                and not state["tool_result_errors"] and state["valid_unique_ids"] and state["known_blocks"] and
                state["search_calls"] <= 1 and state["mcp_calls"] <= 1)
        if result.get("stop_reason") != "pause_turn" or not safe:
            break
        if attempt == 0 and args.allow_one_pause_continuation:
            body["messages"].append({"role": "assistant", "content": result["content"]})
    combined = inspect(blocks)
    passed = (bool(probe.results) and all(r["passed"] for r in probe.results)
              and probe.results[-1].get("stop") == "end_turn"
              and combined["search_calls"] == combined["search_results"] == combined["reference_count"] == 1
              and combined["mcp_calls"] == combined["mcp_results"] == combined["successful_pairs"] == 1
              and all(combined[k] for k in ("permitted_public_arguments", "search_inputs_valid", "exact_reference",
                                           "search_paired", "search_no_errors", "no_client_calls", "search_before_mcp", "valid_unique_ids", "known_blocks")))
    evidence = {"passed": passed, "endpoint": ENDPOINT, "public_repository": REPOSITORY,
                "beta": BETA, "catalog_count": len(pinned), "catalog_sha256": digest(pinned),
                "selected_schema_sha256": digest(next(t["input_schema"] for t in pinned if t["name"] == TOOL)),
                "results": probe.results, "combined": combined,
                "scope": "Anonymous complete tools/list; one initial model request plus optional one pause continuation; "
                         "no retry or raw response persistence. Real search encoding validated only when passed."}
    args.output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": passed, "combined": combined}), flush=True)
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
