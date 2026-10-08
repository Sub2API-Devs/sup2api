"""Opt-in public API smoke checks. No retries, account overrides or stored keys.

Set SUP2API_API_KEY in the process environment. This makes real model calls.
Only fixture prompts are sent; result files contain checks and usage, not bodies.
This verifies the public route, not every provider feature or forced cold routing.
"""
import argparse
import copy
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request
import uuid


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Probe:
    def __init__(self, base, key, model, selected=None):
        self.base, self.key, self.model = base.rstrip("/"), key, model
        self.opener = urllib.request.build_opener(NoRedirect)
        self.results = []
        self.selected = set(selected or [])

    def body(self, messages, **extra):
        return dict(model=self.model, max_tokens=512,
                    output_config={"effort": "low"}, messages=messages, **extra)

    def call(self, name, body, check, path="/v1/messages"):
        if self.selected and name not in self.selected:
            return None
        request = urllib.request.Request(self.base + path,
            data=json.dumps(body, separators=(",", ":")).encode(),
            headers={"Authorization": "Bearer " + self.key,
                     "Content-Type": "application/json", "anthropic-version": "2023-06-01"})
        started = time.monotonic()
        row = {"name": name, "path": path}
        result = None
        try:
            try:
                response = self.opener.open(request, timeout=120)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                raw = response.read(8 * 1024 * 1024 + 1)
                row.update(status=response.status, request_id=response.headers.get("X-Request-Id"))
                if len(raw) > 8 * 1024 * 1024:
                    raise ValueError("bounded response limit")
                if "text/event-stream" in response.headers.get("Content-Type", ""):
                    events = [json.loads(line[5:].strip()) for line in raw.decode().splitlines()
                              if line.startswith("data:") and line[5:].strip() != "[DONE]"]
                    result = {"events": events}
                    row["event_types"] = sorted({event.get("type", "") for event in events})
                else:
                    result = json.loads(raw)
                    row.update(stop=result.get("stop_reason"), usage=result.get("usage"),
                               content_types=[v.get("type") for v in result.get("content", [])],
                               error_type=result.get("error", {}).get("type"))
                row["passed"] = response.status == 200 and bool(check(result))
                if response.status != 200:
                    row["outcome"] = "http_error"
                elif result.get("stop_reason") == "refusal":
                    row["outcome"] = "normal_provider_refusal"
                else:
                    row["outcome"] = "expected_result" if row["passed"] else "expectation_mismatch"
        except (OSError, ValueError, KeyError, TypeError) as error:
            # No raw network error/body: it can contain remote identities or keys.
            row.update(passed=False, exception_type=type(error).__name__)
        row["seconds"] = round(time.monotonic() - started, 3)
        self.results.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
        return result if row["passed"] else None


def text(message):
    return "".join(item.get("text", "") for item in message.get("content", [])
                   if item.get("type") == "text").strip()


def user(value):
    return {"role": "user", "content": value}


def assistant(message):
    # Preserve thinking, signature and all other blocks during tool/normal loops.
    return {"role": "assistant", "content": copy.deepcopy(message["content"])}


def exercise(probe):
    marker = "FIXTURE_" + uuid.uuid4().hex[:12].upper()
    messages = [user("Remember this fixture word: " + marker + ". Reply exactly SAVED.")]
    first = probe.call("json", probe.body(messages), lambda m: text(m) == "SAVED")
    if first:
        history = messages + [assistant(first)]
        follow = probe.call("continuation", probe.body(history + [user("Reply only with the fixture word.")]),
                            lambda m: text(m) == marker)
        if follow:
            # Roll back the last request/answer; create another branch at the earlier point.
            probe.call("rollback-branch", probe.body(history + [user("New branch. Reply exactly BRANCH_READY.")]),
                       lambda m: text(m) == "BRANCH_READY")
    long_history = [user("The initial fixture word is " + marker + "."),
                    {"role": "assistant", "content": "Noted."}]
    for index in range(40):
        long_history.extend([user(f"Fixture record {index}: this is supplied client history; preserve its order."),
                             {"role": "assistant", "content": f"Recorded fixture {index}."}])
    probe.call("fresh-long-history-import", probe.body(long_history + [user("Return only the initial fixture word.")]),
               lambda m: text(m) == marker)
    probe.call("sse", probe.body([user("Reply exactly STREAM_READY.")], stream=True),
               lambda m: any(e.get("type") == "message_stop" for e in m["events"])
               and not any(e.get("type") == "error" for e in m["events"])
               and "".join(e.get("delta", {}).get("text", "") for e in m["events"]).strip() == "STREAM_READY")
    tool = {"name": "lookup_fixture", "description": "Return the private fixture word for this protocol test.",
            "input_schema": {"type": "object", "properties": {}, "additionalProperties": False}}
    tool_messages = [user("Use lookup_fixture to get the private word. You do not know it until the tool returns.")]
    choice = probe.call("client-tool-call", probe.body(tool_messages, tools=[tool]),
                        lambda m: m.get("stop_reason") == "tool_use" and
                        any(b.get("type") == "tool_use" and b.get("name") == "lookup_fixture" for b in m["content"]))
    if choice:
        calls = [block for block in choice["content"] if block.get("type") == "tool_use"]
        returned = [{"type": "tool_result", "tool_use_id": block["id"], "content": marker} for block in calls]
        probe.call("client-tool-result", probe.body(tool_messages + [assistant(choice), user(returned)], tools=[tool]),
                   lambda m: marker in text(m))
    formatted = probe.body([user('Return an object with ready set to true.')])
    formatted["output_config"]["format"] = {"type": "json_schema", "schema": {
        "type": "object", "properties": {"ready": {"type": "boolean"}},
        "required": ["ready"], "additionalProperties": False}}
    probe.call("structured-output", formatted, lambda m: json.loads(text(m)) == {"ready": True})
    probe.call("count-tokens", {"model": probe.model, "messages": long_history},
               lambda m: isinstance(m.get("input_tokens"), int) and m["input_tokens"] > 0,
               "/v1/messages/count_tokens")
    cached = probe.body([user("Reply exactly CACHE_READY.")])
    cached["system"] = [{"type": "text", "text": "\n".join(
        f"Fixture reference {i}: preserve the exact reference and answer the final instruction." for i in range(100)),
        "cache_control": {"type": "ephemeral", "ttl": "5m"}}]
    probe.call("explicit-cache-first", cached, lambda m: text(m) == "CACHE_READY")
    probe.call("explicit-cache-repeat", cached, lambda m: text(m) == "CACHE_READY")
    probe.call("chat-completions", {"model": probe.model, "max_tokens": 512,
        "messages": [user("Reply exactly CHAT_READY.")]},
        lambda m: m["choices"][0]["message"]["content"].strip() == "CHAT_READY", "/v1/chat/completions")
    probe.call("responses", {"model": probe.model, "max_output_tokens": 512,
        "input": "Reply exactly RESPONSES_READY."},
        lambda m: "".join(c.get("text", "") for out in m.get("output", [])
                          for c in out.get("content", [])).strip() == "RESPONSES_READY", "/v1/responses")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--only", action="append", help="Run only a named check (repeatable); dependencies must also be named.")
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY must be set in the process environment")
    probe = Probe(args.base, key, args.model, args.only)
    exercise(probe)
    args.output.write_text(json.dumps({"model": args.model, "results": probe.results,
        "scope": "Public HTTP smoke; does not force a particular account or prove all provider features."},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raise SystemExit(0 if probe.results and all(row["passed"] for row in probe.results) else 1)


if __name__ == "__main__":
    main()
