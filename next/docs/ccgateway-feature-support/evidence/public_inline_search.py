"""Opt-in, at most two real public requests; no retries or private policy headers."""
import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path

from live_api_smoke import Probe, assistant, text, user

BETA = "inline-tools-2026-09-15,advanced-tool-use-2025-11-20"
LOOKUP = "lookup_fixture"
MARKER = "INLINE_SEARCH_FIXTURE_OK_6842"


def valid_message(result):
    return (isinstance(result, dict) and result.get("type") == "message"
            and result.get("role") == "assistant" and bool(result.get("id"))
            and isinstance(result.get("content"), list) and bool(result.get("stop_reason")))


def requested_tool(result):
    if not valid_message(result) or result.get("stop_reason") != "tool_use":
        return None
    calls = [b for b in result["content"] if b.get("type") == "tool_use"]
    if len(calls) != 1:
        return None
    call = calls[0]
    if (call.get("name") != LOOKUP or not isinstance(call.get("id"), str)
            or not call["id"] or call.get("input") != {"key": "fixture"}):
        return None
    return call


def evidence_rows(rows):
    allowed = {"name", "path", "beta", "status", "stop", "usage", "content_types",
               "error_type", "protocol_passed", "content_completed", "passed",
               "outcome", "seconds", "exception_type"}
    result = []
    for row in rows:
        item = {k: v for k, v in row.items() if k in allowed}
        if row.get("request_id"):
            item["request_id_sha256"] = hashlib.sha256(row["request_id"].encode()).hexdigest()
        result.append(item)
    return result


def run(probe):
    schema = {"type": "object", "properties": {"key": {"type": "string", "enum": ["fixture"]}},
              "required": ["key"], "additionalProperties": False}
    tool = {"name": LOOKUP, "description": "Return the fixture marker for key fixture.",
            "input_schema": schema, "defer_loading": True}
    temporary = {"name": "retired_fixture", "description": "Obsolete fixture, never call.",
                 "input_schema": {"type": "object", "properties": {}}, "defer_loading": True}
    messages = [user("Find the deferred lookup_fixture tool and call it once with key fixture. "
                     "Use tool discovery if required. Do not guess its result or call any other tool."),
                {"role": "system", "content": [
                    {"type": "tool_addition", "tool": {"type": "tool_definition", "definition": temporary}},
                    {"type": "tool_removal", "tool": {"type": "tool_reference", "name": "retired_fixture"}}]}]
    # Protocol success is separate from task success: a normal refusal is not an API error.
    first = probe.call("inline-search-tool", probe.body(messages, tools=[tool]),
                       valid_message, protocol_only=True, beta=BETA)
    call = requested_tool(first)
    facts = {"external_tool_handoff": bool(call), "fixture_completed": False,
             "internal_search_verified": False}
    if call:
        facts["tool_call_id_sha256"] = hashlib.sha256(call["id"].encode()).hexdigest()
        messages += [assistant(first), user([{"type": "tool_result", "tool_use_id": call["id"],
                                              "content": MARKER}])]
        second = probe.call("inline-search-result", probe.body(messages, tools=[tool]),
                            valid_message, protocol_only=True, beta=BETA)
        facts["fixture_completed"] = bool(second and second.get("stop_reason") == "end_turn"
                                             and MARKER in text(second)
                                             and not any(b.get("type") == "tool_use" for b in second["content"]))
    return {"model": probe.model, "results": evidence_rows(probe.results), "checks": facts,
            "scope": "Public JSON tool roundtrip only. Internal search requires correlated Worker logs; "
                     "public success alone cannot prove helper execution or saved policy. No settings changed."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    # Probe may print sanitized error prose. This artifact intentionally retains only facts.
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, args.model))
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded, encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["checks"]["fixture_completed"] else 1)


if __name__ == "__main__":
    main()
