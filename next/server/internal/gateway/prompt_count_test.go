package gateway

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func promptCountCall(body string) *call {
	c := &call{gen: newFakeGen(), platform: "anthropic", body: []byte(body)}
	c.ep.Request.PromptTextPaths = []string{"messages"}
	return c
}

// The prefetched count is the same number the synchronous path produced, and
// joining it does not fill the prompt-text cache: precharge really used the
// goroutine's answer instead of counting again.
func TestLocalPromptEstimateUsesPrefetch(t *testing.T) {
	ctx := context.Background()
	c := promptCountCall(`{"messages":[{"role":"user","content":"hello world"}]}`)
	c.startPromptCount(ctx)
	if c.prompt == nil {
		t.Fatal("built-in platform did not start the local count")
	}
	got, err := c.localPromptEstimate(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	want, err := localTokenizerEstimate(ctx, "hello world", 0)
	if err != nil {
		t.Fatal(err)
	}
	if got.GetTokens().GetInputTokens() != want.GetTokens().GetInputTokens() {
		t.Fatalf("prefetched %d tokens, synchronous path %d", got.GetTokens().GetInputTokens(), want.GetTokens().GetInputTokens())
	}
	if c.prompt != nil || c.promptCache != nil {
		t.Fatalf("prefetch was not joined (prompt=%v, cache=%v)", c.prompt, c.promptCache != nil)
	}
}

// Without a prefetch (a plugin platform, or a call built before the start
// point) the estimate is taken on the spot, exactly as before.
func TestLocalPromptEstimateWithoutPrefetch(t *testing.T) {
	ctx := context.Background()
	c := promptCountCall(`{"messages":[{"role":"user","content":"hello world"}]}`)
	got, err := c.localPromptEstimate(ctx, 3)
	if err != nil {
		t.Fatal(err)
	}
	want, err := localTokenizerEstimate(ctx, "hello world", 3)
	if err != nil || got.GetTokens().GetInputTokens() != want.GetTokens().GetInputTokens() {
		t.Fatalf("got %v/%v want %v/%v", got.GetTokens(), err, want.GetTokens(), nil)
	}
	if c.promptCache == nil {
		t.Fatal("synchronous path did not use promptText")
	}
}

// A body replaced after the start (no such path exists today, but setBody is
// the one authority) invalidates the prefetched count.
func TestLocalPromptEstimateIgnoresStaleBodyVersion(t *testing.T) {
	ctx := context.Background()
	c := promptCountCall(`{"messages":[{"role":"user","content":"old prompt"}]}`)
	c.startPromptCount(ctx)
	c.setBody([]byte(`{"messages":[{"role":"user","content":"new prompt"}]}`))
	got, err := c.localPromptEstimate(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	want, err := localTokenizerEstimate(ctx, "new prompt", 0)
	if err != nil || got.GetTokens().GetInputTokens() != want.GetTokens().GetInputTokens() {
		t.Fatalf("stale count used: got %v err %v", got.GetTokens(), err)
	}
}

// A platform plugin estimates itself: starting a local count would be wasted
// work and is never done.
func TestStartPromptCountSkipsPluginPlatform(t *testing.T) {
	c := &call{gen: &fakeGen{platforms: []core.PlatformBinding{{
		Platform: manifest.Platform{ID: "plug"},
		Client:   &fakePlatform{},
	}}}, platform: "plug", body: []byte(`{}`)}
	c.startPromptCount(context.Background())
	if c.prompt != nil {
		t.Fatal("started a local count for a plugin estimator")
	}
}

// Free endpoints and task.submit never precharge locally.
func TestStartPromptCountSkipsFreeAndTaskSubmit(t *testing.T) {
	c := promptCountCall(`{}`)
	c.ep.Billing = "free"
	c.startPromptCount(context.Background())
	if c.prompt != nil {
		t.Fatal("started a local count for a free endpoint")
	}
	c = promptCountCall(`{}`)
	c.ep.Task = &manifest.AsyncTaskEndpoint{Action: manifest.TaskActionSubmit}
	c.startPromptCount(context.Background())
	if c.prompt != nil {
		t.Fatal("started a local count for task.submit")
	}
}

// The prefetch never keeps the handler alive afterwards: joining it waits for
// the goroutine to finish and drops it.
func TestJoinPromptCountFinishesTheGoroutine(t *testing.T) {
	c := promptCountCall(`{"messages":[{"role":"user","content":"hello"}]}`)
	c.startPromptCount(context.Background())
	pc := c.prompt
	c.joinPromptCount()
	select {
	case <-pc.done:
	default:
		t.Fatal("joinPromptCount returned before the count finished")
	}
	if c.prompt != nil {
		t.Fatal("joinPromptCount kept the prefetch")
	}
}
