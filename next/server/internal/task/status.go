package task

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/redis/go-redis/v9"
)

// Run statuses (scheduled_tasks.last_status, run history).
const (
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusTimeout   = "timeout"
	StatusSkipped   = "skipped"
	// StatusContinued is a run that did part of the work and has a
	// continuation (core.TaskContinue); it counts as a success.
	StatusContinued = "continued"
)

const (
	maxTextLen = 2000
	// Node task state lives in Redis (TASK-FRAMEWORK-DESIGN §8.3).
	nodeStateTTL     = 2 * time.Minute
	nodeStateRefresh = 30 * time.Second
	nodeRunsKeep     = 100
	nodeRunsTTL      = 24 * time.Hour
	redisWriteBudget = 2 * time.Second
)

// NodeTaskState is the current state of one node task on one node.
type NodeTaskState struct {
	Name                string     `json:"name"`
	Schedule            string     `json:"schedule"`
	TimeoutMS           int64      `json:"timeout_ms"`
	RequireWork         bool       `json:"require_work"`
	Running             bool       `json:"running"`
	LastStartedAt       *time.Time `json:"last_started_at,omitempty"`
	LastFinishedAt      *time.Time `json:"last_finished_at,omitempty"`
	DurationMS          int64      `json:"duration_ms"`
	Status              string     `json:"status,omitempty"`
	Count               int        `json:"count"`
	Message             string     `json:"message,omitempty"`
	Error               string     `json:"error,omitempty"`
	LastSuccessAt       *time.Time `json:"last_success_at,omitempty"`
	ConsecutiveFailures int        `json:"consecutive_failures"`
	Skipped             int64      `json:"skipped"`
	NextRunAt           *time.Time `json:"next_run_at,omitempty"`
}

// NodeTaskRun is one entry of a node task's run history.
type NodeTaskRun struct {
	ID         string    `json:"id"`
	StartedAt  time.Time `json:"started_at"`
	FinishedAt time.Time `json:"finished_at"`
	DurationMS int64     `json:"duration_ms"`
	Status     string    `json:"status"`
	Manual     bool      `json:"manual,omitempty"`
	Count      int       `json:"count"`
	Message    string    `json:"message,omitempty"`
	Error      string    `json:"error,omitempty"`
}

func nodeStateKey(nodeID string) string { return "tasks:node:" + nodeID }
func nodeRunsKey(nodeID, name string) string {
	return "tasks:node:" + nodeID + ":runs:" + name
}

// nodeStore keeps node task state and history in Redis. A nil client keeps
// nothing (tests, a core without Redis).
type nodeStore struct {
	rdb    redis.UniversalClient
	nodeID string
}

// put writes one task's state, and appends run to its history when not nil.
func (s nodeStore) put(ctx context.Context, st NodeTaskState, run *NodeTaskRun) error {
	if s.rdb == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), redisWriteBudget)
	defer cancel()
	state, err := json.Marshal(st)
	if err != nil {
		return err
	}
	pipe := s.rdb.Pipeline()
	pipe.HSet(ctx, nodeStateKey(s.nodeID), st.Name, state)
	pipe.Expire(ctx, nodeStateKey(s.nodeID), nodeStateTTL)
	if run != nil {
		entry, err := json.Marshal(run)
		if err != nil {
			return err
		}
		key := nodeRunsKey(s.nodeID, st.Name)
		pipe.LPush(ctx, key, entry)
		pipe.LTrim(ctx, key, 0, nodeRunsKeep-1)
		pipe.Expire(ctx, key, nodeRunsTTL)
	}
	_, err = pipe.Exec(ctx)
	return err
}

// refresh rewrites every state (next run times move) and renews the TTL.
func (s nodeStore) refresh(ctx context.Context, states []NodeTaskState) error {
	if s.rdb == nil || len(states) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), redisWriteBudget)
	defer cancel()
	values := make([]any, 0, 2*len(states))
	for _, st := range states {
		b, err := json.Marshal(st)
		if err != nil {
			return err
		}
		values = append(values, st.Name, b)
	}
	pipe := s.rdb.Pipeline()
	pipe.HSet(ctx, nodeStateKey(s.nodeID), values...)
	pipe.Expire(ctx, nodeStateKey(s.nodeID), nodeStateTTL)
	_, err := pipe.Exec(ctx)
	return err
}

// drop removes this node's state and one task's field (unregistered).
func (s nodeStore) drop(ctx context.Context, names ...string) error {
	if s.rdb == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), redisWriteBudget)
	defer cancel()
	if len(names) == 0 {
		return s.rdb.Del(ctx, nodeStateKey(s.nodeID)).Err()
	}
	return s.rdb.HDel(ctx, nodeStateKey(s.nodeID), names...).Err()
}

// ReadNodeStates returns the node task states one node published.
func ReadNodeStates(ctx context.Context, rdb redis.UniversalClient, nodeID string) (map[string]NodeTaskState, error) {
	raw, err := rdb.HGetAll(ctx, nodeStateKey(nodeID)).Result()
	if err != nil {
		return nil, err
	}
	out := make(map[string]NodeTaskState, len(raw))
	for name, v := range raw {
		var st NodeTaskState
		if err := json.Unmarshal([]byte(v), &st); err != nil {
			return nil, fmt.Errorf("node %s task %s: %w", nodeID, name, err)
		}
		out[name] = st
	}
	return out, nil
}

// ReadNodeRuns returns the run history of one node task, newest first.
func ReadNodeRuns(ctx context.Context, rdb redis.UniversalClient, nodeID, name string) ([]NodeTaskRun, error) {
	raw, err := rdb.LRange(ctx, nodeRunsKey(nodeID, name), 0, nodeRunsKeep-1).Result()
	if err != nil {
		return nil, err
	}
	return decodeRuns(raw), nil
}

// truncate keeps at most maxTextLen bytes of s on a rune boundary.
func truncate(s string) string {
	if len(s) <= maxTextLen {
		return s
	}
	cut := maxTextLen
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut]
}
