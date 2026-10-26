package gateway

import (
	"context"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

// promptCount is the local token estimate of one body version, computed off
// the request path. The goroutine fills it and closes done; the handler reads
// it only after receiving from done.
type promptCount struct {
	version uint64
	done    chan struct{}
	tokens  int64
	err     error
}

// startPromptCount launches the local tokenizer count of the final request
// body. It is started just before the helper-history lookup and the balance
// check, so 60–70 ms of counting a ~1 MB prompt overlaps their database round
// trips instead of delaying precharge. It runs only where precharge will
// certainly take the local path: a built-in platform (no plugin estimator), a
// billing endpoint that is not free, and not task.submit (which refuses a
// local estimate). A platform plugin is never affected: its EstimateUsage
// request is built and sent exactly as before.
//
// The one case it cannot rule out from here is a model the price policy
// leaves free (precharge returns before estimating): the count then runs for
// nothing, but it overlaps the upstream request, both concurrency slots are
// released before the join, and the result is dropped, so it costs CPU only.
func (c *call) startPromptCount(ctx context.Context) {
	if c.prompt != nil || c.ep.TaskSubmit() || strings.EqualFold(c.ep.Billing, "free") {
		return
	}
	if pb, ok := c.gen.Platform(c.platform); ok && pb.Client != nil {
		return
	}
	// Capture body and paths: the goroutine must not read c.body, which
	// submit may release once the handler returns. The version detects a body
	// replaced after this point (none exists today) without touching c.
	body, paths, version := c.body, c.ep.Request.PromptTextPaths, c.bodyVersion
	pc := &promptCount{version: version, done: make(chan struct{})}
	c.prompt = pc
	go func() {
		defer close(pc.done)
		text := extractPromptText(body, paths, tokenizer.MaxTextBytes)
		pc.tokens, _, pc.err = tokenizer.Count(ctx, text, "")
	}()
}

// joinPromptCount waits for the prefetch and drops it. It runs on every exit
// path of run, before submit may free the body, so no goroutine outlives the
// handler.
func (c *call) joinPromptCount() {
	if pc := c.prompt; pc != nil {
		<-pc.done
		c.prompt = nil
	}
}

// localPromptEstimate is the local tokenizer estimate of the current body:
// the prefetched count while it still belongs to this body version, else the
// same count taken now. The number is identical; startPromptCount only moves
// the work off the request path.
func (c *call) localPromptEstimate(ctx context.Context, floor int64) (*pluginv1.UsageReport, error) {
	if pc := c.prompt; pc != nil {
		<-pc.done
		c.prompt = nil
		if pc.version == c.bodyVersion {
			if pc.err != nil {
				return nil, pc.err
			}
			return tokenReport(pc.tokens, floor), nil
		}
	}
	return localTokenizerEstimate(ctx, c.promptText(tokenizer.MaxTextBytes), floor)
}

func tokenReport(tokens, floor int64) *pluginv1.UsageReport {
	return &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{InputTokens: max(tokens, floor)}}
}
