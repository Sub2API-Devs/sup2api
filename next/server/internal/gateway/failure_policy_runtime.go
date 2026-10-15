package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
)

type failureState struct {
	facts           *FailureFacts
	decision        FailureDecision
	blocked         bool
	accountResult   string
	retryAfter      string
	unsafeTransport bool
	sameID          int64
	sameRetries     map[int64]int
	retrySlots      map[int64]int
	accountProxies  map[int64]int64
	baseSet         bool
	baseProxy       int64
	sameProxy       bool
	proxyOnly       bool
	waited          time.Duration
	preserveSticky  bool
	stickyErr       error
	events          []failureEvent
}

type failureEvent struct {
	Revision  int64  `json:"revision"`
	Attempt   int    `json:"attempt"`
	AccountID int64  `json:"account_id"`
	Source    string `json:"source"`
	Status    int    `json:"status,omitempty"`
	FailureDecision
	Reason        string `json:"reason"`
	AccountResult string `json:"account_result"`
}

func (c *call) attemptLimit() int {
	if c.failurePolicy == nil {
		return c.gw.MaxAttempts
	}
	if !c.failurePolicy.RetryEnabled {
		return 1
	}
	return 1 + c.failurePolicy.MaxRetries
}

func proxyIdentity(id *int64) int64 {
	if id == nil {
		return 0
	}
	return *id
}

func (c *call) beginFailureAttempt(ref *core.AccountRef) {
	if c.failurePolicy == nil {
		return
	}
	s := &c.failureState
	if s.baseSet && c.failurePolicy.SchemaVersion >= 2 {
		if s.retrySlots == nil {
			s.retrySlots = map[int64]int{}
		}
		// Every retry consumes a slot, including the first attempt on a new account.
		s.retrySlots[ref.ID]++
	}
	if s.accountProxies == nil {
		s.accountProxies = map[int64]int64{}
	}
	s.accountProxies[ref.ID] = proxyIdentity(ref.ProxyID)
	s.facts, s.blocked, s.accountResult, s.retryAfter, s.unsafeTransport = nil, false, "unchanged", "", false
	if !s.baseSet {
		s.baseSet, s.baseProxy = true, proxyIdentity(ref.ProxyID)
	}
}

func (c *call) failureFacts(source string, status int, text string) FailureFacts {
	f := FailureFacts{Source: source, Status: status, Text: text, Model: c.model, Protocol: c.ep.Protocol}
	if c.principal != nil {
		f.GroupID = c.principal.Group.ID
	}
	return f
}

func (c *call) decideFailure(ctx context.Context, accountID int64, f FailureFacts) {
	s := &c.failureState
	s.facts, s.decision = &f, c.failurePolicy.decide(f)
	s.accountResult = "unchanged"
	if c.diagnosticRequest != nil {
		s.accountResult = "diagnostic_request"
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	reason := "failure policy " + s.decision.AccountRule + ": " + f.Source + " HTTP " + strconv.Itoa(f.Status)
	switch s.decision.AccountAction {
	case "disable":
		disabled, err := c.g.d.Accounts.AutoDisableByPolicy(ctx, accountID, reason)
		if err != nil {
			s.accountResult = "write_failed"
			return
		}
		s.blocked = disabled
		if disabled {
			s.accountResult = "disabled"
			if c.sticky != nil && !c.sticky.keep && c.sticky.bound == accountID && c.nextFailureAction(accountID) != failureSwitch {
				s.stickyErr = c.writePolicyBinding(ctx, c.sticky, 0)
			}
		} else {
			s.accountResult = "not_allowed"
		}
	case "cooldown":
		if err := c.g.d.Accounts.SetCooldown(ctx, accountID, c.g.now().Add(time.Duration(s.decision.CooldownSeconds)*time.Second), reason); err != nil {
			s.accountResult = "write_failed"
			return
		}
		s.blocked, s.accountResult = true, "cooldown"
	}
}

// classifyFailure consumes only core-observed network facts. It never invokes
// the platform's ClassifyError and does not read its retry/account suggestions.
func (c *call) classifyFailure(ctx context.Context, accountID int64, status int, header http.Header, raw []byte, transport string, converted bool) attemptResult {
	source, text := "upstream", string(raw)
	if status == 0 {
		source, text = "transport", transport
	}
	c.decideFailure(ctx, accountID, c.failureFacts(source, status, text))
	c.failureState.retryAfter = header.Get("Retry-After")
	clientStatus := status
	if clientStatus < 400 || clientStatus > 599 {
		clientStatus = http.StatusBadGateway
	}
	e := &gwError{Status: clientStatus, Code: codeUpstreamError, RecordType: errTypeUpstream, Message: "upstream request failed"}
	if status != 0 {
		e.Message = "upstream returned HTTP " + strconv.Itoa(status)
	}
	if !converted && len(raw) != 0 {
		e.Raw = raw
		e.ContentType = header.Get("Content-Type")
	}
	return attemptResult{kind: attemptFailover, err: e}
}

// policyCandidates refreshes availability before every attempt. A same-account
// retry never silently turns into a different-account retry when unavailable.
func (c *call) policyCandidates(ctx context.Context, original []core.AccountRef) ([]core.AccountRef, error) {
	if c.failurePolicy == nil {
		return original, nil
	}
	refs, err := c.g.d.Accounts.Candidates(ctx, c.principal.Group.ID, c.routeKeys)
	if err != nil {
		return nil, err
	}
	allowed := map[int64]bool{}
	for _, ref := range original {
		allowed[ref.ID] = true
	}
	s := &c.failureState
	var out []core.AccountRef
	for _, ref := range refs {
		if !c.candidateEligible(&ref) || !c.diagnosticAccountAllowed(&ref) || !c.creditAccountAllowed(&ref) {
			continue
		}
		if !allowed[ref.ID] || s.sameID != 0 && ref.ID != s.sameID {
			continue
		}
		proxy := proxyIdentity(ref.ProxyID)
		if initial, seen := s.accountProxies[ref.ID]; seen && initial != proxy {
			continue
		}
		if s.baseSet && (s.sameProxy && proxy != s.baseProxy || s.proxyOnly && proxy == 0) {
			continue
		}
		out = append(out, ref)
	}
	return out, nil
}

// Used both for the initial pool and each refreshed account snapshot.
func (c *call) candidateEligible(ref *core.AccountRef) bool {
	return c.route(ref) != nil && c.servesAllModels(ref) && c.resourceAccountAllowed(ref) && c.helperAccountAllowed(ref)
}

func (c *call) endFailurePolicy(reason string) {
	s := &c.failureState
	if c.failurePolicy == nil || len(s.events) == 0 || c.rec == nil {
		return
	}
	s.events[len(s.events)-1].Reason = reason
	raw, _ := json.Marshal(s.events)
	c.rec.FailurePolicy = string(raw)
}

// Stream errors can affect account health but never replay a committed turn.
func (c *call) recordStreamFailure(ctx context.Context, accountID int64, text string) {
	if c.failurePolicy == nil {
		return
	}
	c.decideFailure(ctx, accountID, c.failureFacts("upstream", 0, text))
	c.finishFailureDecision(&core.AccountRef{ID: accountID}, c.rec.Attempts, "response_committed")
}

func (c *call) finishFailureDecision(ref *core.AccountRef, attempts int, reason string) {
	s := &c.failureState
	if s.facts == nil {
		return
	}
	s.events = append(s.events, failureEvent{Revision: c.failurePolicy.Revision, Attempt: attempts, AccountID: ref.ID,
		Source: s.facts.Source, Status: s.facts.Status, FailureDecision: s.decision, Reason: reason, AccountResult: s.accountResult})
	if c.rec != nil {
		raw, _ := json.Marshal(s.events)
		c.rec.FailurePolicy = string(raw)
	}
}

func (c *call) planFailure(ctx context.Context, ref *core.AccountRef, res attemptResult, attempts int, excluded map[int64]bool) attemptResult {
	if c.failurePolicy == nil || res.kind == attemptDone || res.kind == attemptCanceled {
		return res
	}
	s := &c.failureState
	if s.facts == nil {
		if res.err == nil {
			return res
		}
		c.decideFailure(ctx, ref.ID, c.failureFacts("core", res.err.Status, res.err.Message))
	}
	action := c.nextFailureAction(ref.ID)
	reason := c.retryBlocked(ctx, res, attempts, action)
	if reason == "" {
		reason = c.waitForRetry(ctx, attempts)
	}
	if reason == "" {
		reason = c.prepareRetry(ctx, ref, action, excluded)
	}
	if reason != "" {
		c.finishFailureDecision(ref, attempts, reason)
		res.kind = attemptReturn
		return res
	}
	s.decision.Action = action
	c.finishFailureDecision(ref, attempts, "retry_scheduled")
	res.kind = attemptFailover
	return res
}

func (c *call) nextFailureAction(accountID int64) string {
	s := &c.failureState
	d := s.decision
	if d.Action != failureRetry {
		return d.Action
	}
	retries := s.sameRetries[accountID]
	if c.failurePolicy.SchemaVersion >= 2 {
		retries = s.retrySlots[accountID]
	}
	if s.blocked || retries >= d.SameAccountRetries {
		return d.ExhaustedAction
	}
	return failureRetry
}

func (c *call) retryBlocked(ctx context.Context, res attemptResult, attempts int, action string) string {
	if res.kind != attemptFailover {
		return "not_replayable"
	}
	if c.c != nil && c.c.Writer.Written() {
		return "response_committed"
	}
	if c.creditDispatched || c.helperWasDispatched() || c.task != nil || c.failureState.unsafeTransport {
		return "outcome_uncertain"
	}
	if c.diagnosticRequest != nil {
		return "diagnostic_request"
	}
	if c.failureState.decision.Action == failureReturn {
		return "return"
	}
	if attempts >= c.attemptLimit() {
		return "attempt_limit"
	}
	if ctx.Err() != nil {
		return "canceled"
	}
	if action == "" || action == failureReturn {
		return "same_account_limit"
	}
	if action != failureRetry && (len(c.resourceRefs) > 0 || gjson.GetBytes(c.body, "previous_response_id").String() != "") {
		return "account_bound_resource"
	}
	return ""
}

func (c *call) prepareRetry(ctx context.Context, ref *core.AccountRef, action string, excluded map[int64]bool) string {
	s := &c.failureState
	if action == failureRetry {
		if s.sameRetries == nil {
			s.sameRetries = map[int64]int{}
		}
		s.sameID = ref.ID
		s.sameRetries[ref.ID]++
		return ""
	}
	if action == failureReset {
		if err := c.resetPolicyBinding(ctx); err != nil {
			return "sticky_reset_failed"
		}
	}
	s.preserveSticky = action == failureSwitch
	s.sameID = 0
	excluded[ref.ID] = true
	s.sameProxy = s.sameProxy || s.decision.Egress == "same_proxy"
	s.proxyOnly = s.proxyOnly || s.decision.Egress == "proxy_only"
	return ""
}

func (c *call) waitForRetry(ctx context.Context, attempts int) string {
	s := &c.failureState
	delay := time.Duration(c.failurePolicy.BackoffMS) * time.Millisecond
	for i := 1; i < attempts && delay < 30*time.Second; i++ {
		delay *= 2
	}
	if delay > 30*time.Second {
		delay = 30 * time.Second
	}
	delay = time.Duration(float64(delay) * (0.5 + c.g.randFloat()*0.5))
	if c.failurePolicy.SchemaVersion < 3 && c.failurePolicy.RespectRetryAfter {
		if after, ok := retryAfterDuration(s.retryAfter, c.g.now()); ok && after > delay {
			delay = after
		}
	}
	if c.failurePolicy.SchemaVersion < 3 && s.waited+delay > time.Duration(c.failurePolicy.MaxWaitMS)*time.Millisecond {
		return "wait_budget"
	}
	if deadline, ok := ctx.Deadline(); ok && time.Now().Add(delay).After(deadline) {
		return "deadline"
	}
	if delay > 0 {
		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return "canceled"
		case <-timer.C:
		}
	}
	s.waited += delay
	return ""
}

func retryAfterDuration(raw string, now time.Time) (time.Duration, bool) {
	raw = strings.TrimSpace(raw)
	if n, err := strconv.ParseInt(raw, 10, 32); err == nil && n >= 0 {
		return time.Duration(n) * time.Second, true
	}
	if at, err := http.ParseTime(raw); err == nil {
		if at.Before(now) {
			return 0, true
		}
		return at.Sub(now), true
	}
	return 0, false
}
