"""One opt-in local Claude run; five fixture Reads in one assistant message."""
import argparse
import hashlib
import json
import ntpath
import os
from pathlib import Path
import subprocess
import time
import uuid

from live_api_smoke import redact_evidence


def hashed(value):
    return hashlib.sha256(value.encode()).hexdigest()


def path_key(value):
    return ntpath.normcase(ntpath.normpath(value)) if isinstance(value, str) else None


def summarize(stdout, returncode, fixtures):
    expected = {path_key(str(path)): marker for path, marker in fixtures.items()}
    calls, returned, groups, sessions = {}, set(), {}, set()
    invalid, refused, terminal = False, False, []
    usages = []
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            invalid = True
            continue
        if not isinstance(event, dict):
            invalid = True
            continue
        if isinstance(event.get("session_id"), str):
            sessions.add(hashed(event["session_id"]))
        if event.get("type") == "error" or event.get("is_error"):
            invalid = True
        message = event.get("message") or {}
        if not isinstance(message, dict):
            invalid = True
            continue
        refused |= message.get("stop_reason") == "refusal" or event.get("stop_reason") == "refusal"
        content = message.get("content", [])
        if not isinstance(content, list):
            invalid = True
            continue
        group = []
        for block in content:
            if not isinstance(block, dict):
                invalid = True
                continue
            if block.get("type") == "tool_use":
                ident, args = block.get("id"), block.get("input")
                path = path_key(args.get("file_path")) if isinstance(args, dict) else None
                if (event.get("type") != "assistant" or block.get("name") != "Read"
                        or not isinstance(ident, str) or not ident or ident in calls or path not in expected):
                    invalid = True
                    continue
                calls[ident] = path
                group.append(ident)
            elif block.get("type") == "tool_result":
                ident = block.get("tool_use_id")
                if (ident not in calls or ident in returned or block.get("is_error")):
                    invalid = True
                    continue
                payload = json.dumps(block.get("content"), ensure_ascii=False)
                if expected[calls[ident]] not in payload:
                    invalid = True
                returned.add(ident)
            elif block.get("type") == "refusal":
                refused = True
        if group:
            message_id = message.get("id")
            if not isinstance(message_id, str) or not message_id:
                invalid = True
            else:
                groups.setdefault(message_id, []).extend(group)
        if event.get("type") == "result":
            terminal.append(event)
            if isinstance(event.get("usage"), dict):
                usages.append(event["usage"])
    final = terminal[0] if len(terminal) == 1 else {}
    final_text = final.get("result", "")
    markers = isinstance(final_text, str) and all(marker in final_text for marker in expected.values())
    parallel = len(groups) == 1 and len(next(iter(groups.values()))) == 5 and len(set(calls.values())) == 5
    paired = len(calls) == 5 and returned == set(calls)
    passed = (returncode == 0 and not invalid and not refused and parallel and paired and markers
              and len(terminal) == 1 and final.get("subtype") == "success" and not final.get("is_error"))
    return {"passed": bool(passed), "same_assistant_five_reads": parallel,
            "paired_results": paired, "final_contains_five_markers": bool(markers),
            "normal_provider_refusal": refused, "malformed_or_error": invalid,
            "read_count": len(calls), "result_count": len(returned),
            "assistant_read_group_sizes": [len(g) for g in groups.values()], "terminal_count": len(terminal),
            "assistant_message_id_sha256": sorted(hashed(i) for i in groups),
            "call_id_sha256": sorted(hashed(i) for i in calls),
            "session_id_sha256": sorted(sessions), "usage": usages,
            "exit_code": returncode}


def create_fixtures(project):
    directory = project / ("ccg-parallel-read-" + uuid.uuid4().hex)
    directory.mkdir()
    fixtures = {}
    for index in range(1, 6):
        marker = "READ_FIXTURE_" + uuid.uuid4().hex
        path = directory / ("fixture-" + str(index) + ".txt")
        path.write_bytes(("Synthetic Read fixture " + str(index) + "\n" + marker
                          + ("\t" if index == 5 else "\n")).encode())
        fixtures[path] = marker
    return directory, fixtures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", required=True)
    parser.add_argument("--base", required=True)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    project = args.project.resolve(strict=True)
    directory, fixtures = create_fixtures(project)
    prompt = ("In one single assistant message, issue exactly five Read tool calls, one per file below. "
              "Do not read any other file. Do not split the calls across assistant messages. "
              "After all five results return, summarize by repeating each file's unique READ_FIXTURE marker. "
              "Do not edit files. Read each file completely.\n" + "\n".join(str(p) for p in fixtures))
    env = os.environ.copy()
    for name in ("SUP2API_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"):
        env.pop(name, None)
    env.update(ANTHROPIC_BASE_URL=args.base, ANTHROPIC_AUTH_TOKEN=key)
    command = [args.cli, "-p", prompt, "--model", "claude-opus-5-5", "--tools", "Read",
               "--allowedTools", "Read", "--setting-sources", "", "--no-session-persistence",
               "--max-turns", "3", "--output-format", "stream-json", "--verbose"]
    report = {"passed": False, "fixture_directory": str(directory), "fixture_paths": [str(p) for p in fixtures],
              "fixture_sha256": [hashlib.sha256(p.read_bytes()).hexdigest() for p in fixtures],
              "model": "claude-opus-5-5", "scope": "Single CLI process; same-message five Read calls, not execution-overlap proof."}
    started = time.monotonic()
    try:
        run = subprocess.run(command, cwd=project, env=env, capture_output=True, text=True,
                             encoding="utf-8", errors="replace", timeout=180)
        report.update(summarize(run.stdout, run.returncode, fixtures))
    except (subprocess.TimeoutExpired, OSError) as error:
        report["exception_type"] = type(error).__name__
    report["seconds"] = round(time.monotonic() - started, 3)
    report = redact_evidence(report, key)
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
