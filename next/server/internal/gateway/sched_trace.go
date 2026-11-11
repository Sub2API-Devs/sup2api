package gateway

import (
	"context"
	"log/slog"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Bounds of a SchedulingTrace (CONTRACTS §24.6).
const (
	maxSchedSkips     = 40
	maxSchedCountKeys = 16
	maxSchedDetail    = 100
)

// schedDetailCredit is the detail of a bound_elsewhere skip for a fallback
// credit: dispatch answers the credit's own lookup error when it left no
// account.
const schedDetailCredit = "fallback_credit"

// schedTrace collects, while a request is scheduled, each account that was
// not used and why. It costs a slice append per skipped account and is only
// turned into a record when the request found no account or passed one over
// for a passing reason (schedulingTrace).
type schedTrace struct {
	candidates, eligible int
	skips                []core.SchedulingSkip
	seen                 map[schedSkipKey]struct{}
	omitted              int
	// passing: an account was passed over for something that changes from
	// one request to the next (rate limit, concurrency, a failed attempt),
	// which is worth a record even when another account served.
	passing bool
	// unschedulable: the accounts of the group that were never offered, read
	// once when no account could be picked.
	unschedulable []core.UnschedulableAccount
	concluded     bool
}

type schedSkipKey struct {
	id     int64
	reason string
}

// passingSchedReason reports whether reason is a state of the moment rather
// than of the account's configuration and the request's shape.
func passingSchedReason(reason string) bool {
	switch reason {
	case core.SchedRateLimited, core.SchedConcurrencyFull, core.SchedQueued, core.SchedAttemptFailed, core.SchedFailurePolicy:
		return true
	}
	return false
}

// skipAccount notes that account id is not used for this request. An account
// is noted once per reason; the first detail stands.
func (c *call) skipAccount(id int64, reason, detail string) {
	t := &c.sched
	t.passing = t.passing || passingSchedReason(reason)
	key := schedSkipKey{id, reason}
	if _, ok := t.seen[key]; ok {
		return
	}
	if t.seen == nil {
		t.seen = map[schedSkipKey]struct{}{}
	}
	t.seen[key] = struct{}{}
	if len(t.skips) >= maxSchedSkips {
		t.omitted++
		return
	}
	t.skips = append(t.skips, core.SchedulingSkip{AccountID: id, Reason: reason, Detail: truncateUTF8(detail, maxSchedDetail)})
}

// ineligibleReason says why ref cannot serve this request whatever its load:
// the reason candidateEligible and creditAccountAllowed refuse it for, in
// their order. ok is true when neither does.
func (c *call) ineligibleReason(ref *core.AccountRef) (reason, detail string, ok bool) {
	rt := c.route(ref)
	if rt == nil {
		return core.SchedNoRoute, ref.PluginKey + "/" + ref.Type, false
	}
	if !ref.ServesModel(c.model) {
		return core.SchedModelNotServed, c.model, false
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredPrimaryUsage(rt) {
		return core.SchedUsageUnsupported, "additional", false
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredAttempts(rt, c.body) {
		return core.SchedUsageUnsupported, "attempts", false
	}
	for _, extra := range c.modelRefs {
		if !ref.ServesModel(extra.model) {
			return core.SchedReferencedModelNotServed, extra.model, false
		}
		if c.ep.Billing != "free" && !routeAccountsFor(rt, extra.kind) {
			return core.SchedUsageUnsupported, extra.kind, false
		}
	}
	if !c.resourceAccountAllowed(ref) {
		return core.SchedBoundElsewhere, "resource", false
	}
	if !c.helperAccountAllowed(ref) {
		return core.SchedBoundElsewhere, "helper_history", false
	}
	if !c.creditAccountAllowed(ref) {
		return core.SchedBoundElsewhere, schedDetailCredit, false
	}
	return "", "", true
}

// noteDropped notes the accounts of before that are not in after.
func (c *call) noteDropped(before, after []core.AccountRef, reason string) {
	for i := range before {
		id := before[i].ID
		if !slices.ContainsFunc(after, func(r core.AccountRef) bool { return r.ID == id }) {
			c.skipAccount(id, reason, "")
		}
	}
}

// concludeScheduling runs when the record is finished. A request that found no account
// reads the accounts of the group that were never offered (disabled, cooling
// down), so the record says what the group holds, and logs one line: the
// client only sees "no available account" or "busy".
func (c *call) concludeScheduling(ctx context.Context) {
	t := &c.sched
	if t.concluded || c.rec == nil || c.rec.ErrorType != errTypeNoAccount {
		return
	}
	t.concluded = true
	if c.principal != nil && c.g.d.Accounts != nil {
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
		off, err := c.g.d.Accounts.Unschedulable(rctx, c.principal.Group.ID)
		cancel()
		if err != nil {
			slog.WarnContext(ctx, "gateway: read unschedulable accounts", "err", err)
		}
		t.unschedulable = off
	}
	tr := c.schedulingTrace()
	reasons := make([]string, 0, len(tr.Skipped))
	for _, s := range tr.Skipped {
		text := strconv.FormatInt(s.AccountID, 10) + ":" + s.Reason
		if s.Detail != "" {
			text += ":" + s.Detail
		}
		reasons = append(reasons, text)
	}
	slog.WarnContext(ctx, "gateway: no account for the request", "request_id", c.rid, "group", c.principal.Group.ID,
		"model", c.model, "protocol", c.ep.Protocol, "outcome", tr.Outcome, "candidates", tr.Candidates,
		"eligible", tr.Eligible, "skipped", strings.Join(reasons, " "), "omitted", tr.Omitted)
}

// schedulingTrace is usage_logs.anomalies.scheduling: nil unless the request
// found no account or passed one over for a passing reason.
func (c *call) schedulingTrace() *core.SchedulingTrace {
	t := &c.sched
	none := c.rec != nil && c.rec.ErrorType == errTypeNoAccount
	if !none && !t.passing {
		return nil
	}
	tr := &core.SchedulingTrace{V: 1, Outcome: core.SchedulingPicked, Candidates: t.candidates, Eligible: t.eligible,
		Counts: map[string]int{}, Skipped: slices.Clone(t.skips), Omitted: t.omitted}
	if none {
		tr.Outcome = core.SchedulingNone
		if c.rec.StatusCode == http.StatusTooManyRequests {
			tr.Outcome = core.SchedulingBusy
		}
	}
	for _, u := range t.unschedulable {
		s := core.SchedulingSkip{AccountID: u.ID, Reason: core.SchedNotSchedulable, Detail: u.Reason}
		if !u.Until.IsZero() {
			s.Until = u.Until.Unix()
		}
		// An account that left during the request is already listed, without
		// what it left for.
		if i := slices.IndexFunc(tr.Skipped, func(o core.SchedulingSkip) bool {
			return o.AccountID == u.ID && o.Reason == core.SchedNotSchedulable
		}); i >= 0 {
			tr.Skipped[i] = s
		} else if len(tr.Skipped) >= maxSchedSkips {
			tr.Omitted++
		} else {
			tr.Skipped = append(tr.Skipped, s)
		}
	}
	for _, s := range tr.Skipped {
		if _, ok := tr.Counts[s.Reason]; ok || len(tr.Counts) < maxSchedCountKeys {
			tr.Counts[s.Reason]++
		}
	}
	if tr.Skipped == nil {
		tr.Skipped = []core.SchedulingSkip{}
	}
	return tr
}

// attemptFailureDetail is the detail of an attempt_failed skip: the status the
// attempt ended with and how the record classifies it.
func attemptFailureDetail(e *gwError) string {
	if e == nil {
		return ""
	}
	return strconv.Itoa(e.Status) + " " + e.RecordType
}
