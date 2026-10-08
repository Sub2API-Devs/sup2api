"""Opt-in bounded forced mixed probe; three calls maximum, no retries."""
import argparse
import contextlib
import io
import json
import os
from pathlib import Path
from live_api_smoke import Probe, assistant, user, text
from public_inline_search import evidence_rows, valid_message
from public_pinned_mcp_search import digest

TOOL = "forced_eager_fixture"
MARKER = "FORCED_MIXED_RESULT_7139"
BRANCH = "FORCED_MIXED_BRANCH_8264"


def run(probe):
    schema = {"type": "object", "properties": {"key": {"type": "string", "enum": ["fixture"]}}, "required": ["key"], "additionalProperties": False}
    tools = [{"name": TOOL, "description": "Return the supplied fixture marker.", "input_schema": schema, "defer_loading": False},
             {"name": "unrelated_deferred_fixture", "description": "Unrelated; never call.", "input_schema": {"type": "object"}, "defer_loading": True}]
    first_history = [user("Call forced_eager_fixture once with key fixture. After a tool result, reply only its exact marker. Never call the unrelated tool.")]
    checks = {"forced": False, "continuation": False, "rollback": False}
    def call(label, history, choice):
        return probe.call(label, {"model": probe.model, "max_tokens": 256, "tools": tools, "tool_choice": choice, "messages": history}, valid_message, protocol_only=True)
    first = call("forced-mixed-first", first_history, {"type": "tool", "name": TOOL, "disable_parallel_tool_use": True})
    calls = [b for b in (first or {}).get("content", []) if isinstance(b, dict) and b.get("type") == "tool_use"]
    valid = (valid_message(first) and first.get("stop_reason") == "tool_use" and len(calls) == 1
             and calls[0].get("name") == TOOL and calls[0].get("input") == {"key": "fixture"}
             and isinstance(calls[0].get("id"), str) and bool(calls[0]["id"].strip())
             and all(isinstance(b, dict) and b.get("type") in ("text", "thinking", "redacted_thinking", "tool_use") for b in first["content"]))
    if valid:
        checks["forced"] = True
        checks["call_id_sha256"] = digest(calls[0]["id"])
        for label, marker in [("continuation", MARKER), ("rollback", BRANCH)]:
            history = first_history + [assistant(first), user([{"type": "tool_result", "tool_use_id": calls[0]["id"], "content": marker}])]
            result = call("forced-mixed-" + label, history, {"type": "auto"})
            checks[label] = bool(valid_message(result) and result.get("stop_reason") == "end_turn" and text(result) == marker
                                 and all(b.get("type") in ("text", "thinking", "redacted_thinking") for b in result["content"]))
            if not checks[label]:
                break
    return {"passed": all(checks[k] for k in ("forced", "continuation", "rollback")), "checks": checks,
            "catalog_sha256": digest(tools), "results": evidence_rows(probe.results),
            "scope": "At most three calls. Sonnet forced request then exact tool-result auto continuation and rollback. No retry. Worker logs must independently prove original catalog/defer/choice and zero hidden calls; usage is raw reported evidence."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-sonnet-4-6")
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
