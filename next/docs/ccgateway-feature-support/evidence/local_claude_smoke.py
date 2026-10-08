"""Opt-in real local Claude Read roundtrip, with process-only API configuration."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time

from live_api_smoke import redact_evidence


def summarize_cli(stdout, returncode):
    report = {'tool_names': [], 'tool_results': 0, 'passed': False}
    calls, returned, terminal = {}, set(), 0
    malformed = False
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if not isinstance(event, dict):
            malformed = True
            continue
        message = event.get('message', {})
        if message.get('stop_reason') == 'refusal':
            report['normal_provider_refusal'] = True
        content = message.get('content', [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get('type') == 'tool_use':
                name, ident = block.get('name'), block.get('id')
                report['tool_names'].append(name)
                path = block.get('input', {}).get('file_path', '')
                fixture = isinstance(path, str) and path.replace('\\', '/').split('/')[-1] == 'pelican-bicycle.svg'
                if not isinstance(ident, str) or not ident or ident in calls or name != 'Read' or not fixture:
                    malformed = True
                else:
                    calls[ident] = block
            elif block.get('type') == 'tool_result':
                ident = block.get('tool_use_id')
                report['tool_results'] += 1
                report['tool_result_error'] = report.get('tool_result_error', False) or bool(block.get('is_error'))
                if ident not in calls or ident in returned:
                    malformed = True
                returned.add(ident)
        if event.get('type') == 'result':
            terminal += 1
            report.update(result_subtype=event.get('subtype'), is_error=event.get('is_error'),
                          usage=event.get('usage'), turns=event.get('num_turns'),
                          has_final_text=isinstance(event.get('result'), str) and bool(event['result'].strip()))
            if event.get('is_error'):
                report['error_summary'] = str(event.get('result', ''))[:1000]
    report['paired_fixture_read'] = bool(calls) and returned == set(calls)
    report['passed'] = (returncode == 0 and terminal == 1 and not malformed
                        and report.get('result_subtype') == 'success' and not report.get('is_error')
                        and report['paired_fixture_read'] and not report.get('tool_result_error')
                        and report.get('has_final_text') and not report.get('normal_provider_refusal'))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cli', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get('SUP2API_API_KEY')
    if not key:
        parser.error('SUP2API_API_KEY is required')
    fixture = args.project / 'pelican-bicycle.svg'
    if not fixture.is_file():
        parser.error('Expected read-only SVG fixture is absent')
    env = os.environ.copy()
    env.pop('ANTHROPIC_API_KEY', None)
    env.pop('SUP2API_API_KEY', None)
    env.pop('CLAUDE_CODE_OAUTH_TOKEN', None)
    env.update(ANTHROPIC_BASE_URL=args.base, ANTHROPIC_AUTH_TOKEN=key)
    command = [args.cli, '-p', 'Use Read to inspect the first 40 lines of pelican-bicycle.svg in the current project. Then briefly describe the picture in Chinese. Do not edit any files.',
               '--model', 'claude-opus-5-5', '--tools', 'Read', '--allowedTools', 'Read',
               '--setting-sources', '', '--no-session-persistence', '--max-turns', '3',
               '--output-format', 'stream-json', '--verbose']
    start = time.monotonic()
    report = {'model': 'claude-opus-5-5', 'tool_names': [], 'tool_results': 0,
              'passed': False, 'scope': 'Real local CLI, public API, read-only fixture; no global settings changed.'}
    try:
        run = subprocess.run(command, cwd=args.project, env=env, capture_output=True,
                             text=True, encoding='utf-8', errors='replace', timeout=180)
        report['exit_code'] = run.returncode
        report.update(summarize_cli(run.stdout, run.returncode))
    except subprocess.TimeoutExpired:
        report['exception_type'] = 'TimeoutExpired'
    report['seconds'] = round(time.monotonic() - start, 3)
    report = redact_evidence(report, key)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    raise SystemExit(0 if report['passed'] else 1)


if __name__ == '__main__':
    main()
