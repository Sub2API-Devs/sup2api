
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{q5}from"./chunk-exfmq47h.js";import{i}from"./chunk-xjnnz630.js";import{Hf,sE,YHe}from"./chunk-7kayq7nc.js";import{w9t,UQ}from"./chunk-mk7xxmed.js";import{Us}from"./chunk-1k7dqggz.js";var t=300000,yje=UQ.recurringMaxAgeMs/86400000;function LM(){return!i.CLAUDE_CODE_DISABLE_CRON&&q5("tengu_kairos_cron",!0,t)}function $xn(){return LM()||w9t()}function QMe(){return q5("tengu_kairos_cron_durable",!0,t)}function nas(e){return e?"Schedule a prompt to run at a future time \u2014 either recurring on a cron schedule, or once at a specific time. Pass durable: true to persist to .claude/scheduled_tasks.json; otherwise session-only.":"Schedule a prompt to run at a future time within this Claude session \u2014 either recurring on a cron schedule, or once at a specific time."}function ras(e){return e?"true = persist to .claude/scheduled_tasks.json and survive restarts. false (default) = in-memory only, dies when this Claude session ends. Use true only when the user asks the task to survive across sessions.":"Has no effect \u2014 durable persistence is not available. All jobs are session-only (in-memory, gone when this Claude session ends)."}function oas(e){let{recurringFrac:o,recurringCapMs:s,oneShotMaxMs:n}=UQ;return`Schedule a prompt to be enqueued at a future time. Use for both recurring schedules and one-shot reminders.

Uses standard 5-field cron in the user's local timezone: minute hour day-of-month month day-of-week. "0 9 * * *" means 9am local \u2014 no timezone conversion needed.

## One-shot tasks (recurring: false)

For "remind me at X" or "at <time>, do Y" requests \u2014 fire once then auto-delete.
Pin minute/hour/day-of-month/month to specific values:
  "remind me at 2:30pm today to check the deploy" \u2192 cron: "30 14 <today_dom> <today_month> *", recurring: false
  "tomorrow morning, run the smoke test" \u2192 cron: "57 8 <tomorrow_dom> <tomorrow_month> *", recurring: false

## Recurring jobs (recurring: true, the default)

For "every N minutes" / "every hour" / "weekdays at 9am" requests:
  "*/5 * * * *" (every 5 min), "0 * * * *" (hourly), "0 9 * * 1-5" (weekdays at 9am local)

## Avoid the :00 and :30 minute marks when the task allows it

Every user who asks for "9am" gets \`0 9\`, and every user who asks for "hourly" gets \`0 *\` \u2014 which means requests from across the planet land on the API at the same instant. When the user's request is approximate, pick a minute that is NOT 0 or 30:
  "every morning around 9" \u2192 "57 8 * * *" or "3 9 * * *" (not "0 9 * * *")
  "hourly" \u2192 "7 * * * *" (not "0 * * * *")
  "in an hour or so, remind me to..." \u2192 pick whatever minute you land on, don't round

Only use minute 0 or 30 when the user names that exact time and clearly means it ("at 9:00 sharp", "at half past", coordinating with a meeting). When in doubt, nudge a few minutes early or late \u2014 the user will not notice, and the fleet will.

${e?`## Durability

By default (durable: false) the job lives only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits. Pass durable: true to write to .claude/scheduled_tasks.json so the job survives restarts. Only use durable: true when the user explicitly asks for the task to persist ("keep doing this every day", "set this up permanently"). Most "remind me in 5 minutes" / "check back in an hour" requests should stay session-only.`:`## Session-only

Jobs live only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits.`}

## Not for live watching

${Hf} re-runs a prompt at fixed wall-clock intervals. To watch a log file, process, or command output and be notified the moment something changes, use the ${Us} tool instead \u2014 ${Us} streams events as they happen; cron polls on a schedule.

## Runtime behavior

Jobs only fire while the REPL is idle (not mid-query). ${e?"Durable jobs persist to .claude/scheduled_tasks.json and survive session restarts \u2014 on next launch they resume automatically. One-shot durable tasks that were missed while the REPL was closed are surfaced for catch-up. Session-only jobs die with the process. ":""}The scheduler shifts each job by a fixed per-job offset on top of whatever you pick: by default a recurring job runs up to ${Math.round(o*100)}% of its period late (max ${s/60000} min), and a one-shot job landing on :00 or :30 runs up to ${n/1000} s early. The result of this tool and of ${YHe} gives each job's actual next run time: when you tell the user when a job will run, give that time, not the minute in the cron expression. Picking an off-minute is still the bigger lever.

Recurring tasks auto-expire after ${yje} days \u2014 they fire one final time, then are deleted. This bounds session lifetime. Tell the user about the ${yje}-day limit when scheduling recurring jobs.

Returns a job ID you can pass to ${sE}.`}var sas="Cancel a scheduled cron job by ID";function ias(e){return e?`Cancel a cron job previously scheduled with ${Hf}. Removes it from .claude/scheduled_tasks.json (durable jobs) or the in-memory session store (session-only jobs).`:`Cancel a cron job previously scheduled with ${Hf}. Removes it from the in-memory session store.`}var aas="List scheduled cron jobs";function las(e){return e?`List all cron jobs scheduled via ${Hf}, both durable (.claude/scheduled_tasks.json) and session-only.`:`List all cron jobs scheduled via ${Hf} in this session.`}
export{yje,LM,$xn,QMe,nas,ras,oas,sas,ias,aas,las};
