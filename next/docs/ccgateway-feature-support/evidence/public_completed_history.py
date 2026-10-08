"""Two bounded public requests for completed, undeclared client-tool history. No retries."""
import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path

from live_api_smoke import Probe, assistant, text, user
from public_inline_search import evidence_rows, valid_message

MARKERS = ("RETIRED_FIXTURE_RESULT_9427", "BASH_HISTORY_RESULT_6318")


def completed(message):
    return (valid_message(message) and message.get("stop_reason") == "end_turn"
            and all(marker in text(message) for marker in MARKERS)
            and all(b.get("type") not in ("tool_use", "server_tool_use", "mcp_tool_use", "refusal", "error")
                    for b in message["content"]))


def run(probe):
    messages = [user("These two tool calls are a synthetic, already completed history fixture."),
                {"role": "assistant", "content": [
                    {"type": "tool_use", "id": "retired_call_fixture", "name": "retired_fixture", "input": {"fixture": True}},
                    {"type": "tool_use", "id": "retired_call_bash", "name": "bash", "input": {"command": "synthetic history only; never execute"}}]},
                user([{"type": "tool_result", "tool_use_id": "retired_call_fixture", "content": MARKERS[0]},
                      {"type": "tool_result", "tool_use_id": "retired_call_bash", "content": MARKERS[1]}]),
                {"role": "assistant", "content": "Both synthetic historical calls have completed."},
                user("Repeat both exact result markers from the historical tool results. Do not call tools.")]
    facts = {"initial_completed": False, "continuation_completed": False}
    first = probe.call("completed-retired-history", probe.body(messages), valid_message, protocol_only=True)
    facts["initial_completed"] = bool(first and completed(first))
    if facts["initial_completed"]:
        messages += [assistant(first), user("Repeat the same two exact markers once more. Do not call tools.")]
        second = probe.call("completed-retired-history-continue", probe.body(messages), valid_message, protocol_only=True)
        facts["continuation_completed"] = bool(second and completed(second))
    return {"model": probe.model, "results": evidence_rows(probe.results), "checks": facts,
            "fixture_sha256": hashlib.sha256(json.dumps(MARKERS).encode()).hexdigest(),
            "passed": all(facts.values()), "scope": "Completed direct client history without current tools; no executable registration or raw OAuth relay."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, "claude-opus-5-5"))
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
