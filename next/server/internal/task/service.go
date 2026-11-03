package task

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Options wires the service to this node.
type Options struct {
	NodeID  string
	Version string // the core version, recorded with the cluster tasks it registers
	Redis   redis.UniversalClient
	Bus     core.Bus
	// CanWork is the node's background admission (nil: always admitted).
	CanWork func() bool
	Logger  *slog.Logger
}

// Service implements core.Tasks: one registry, the node backend (gocron) and
// the cluster backend (River).
type Service struct {
	opts Options
	log  *slog.Logger
	reg  *Registry
	node *nodeBackend

	mu      sync.Mutex
	cancels []func()
}

var _ core.Tasks = (*Service)(nil)

// New builds the service; nothing runs before StartNode.
func New(opts Options) (*Service, error) {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.CanWork == nil {
		opts.CanWork = func() bool { return true }
	}
	log := opts.Logger.With("component", "tasks")
	node, err := newNodeBackend(log, opts.NodeID, opts.CanWork, nodeStore{rdb: opts.Redis, nodeID: opts.NodeID})
	if err != nil {
		return nil, err
	}
	return &Service{opts: opts, log: log, reg: NewRegistry(), node: node}, nil
}

// Registry is the registry behind the service (console, tests).
func (s *Service) Registry() *Registry { return s.reg }

// Register adds a core task.
func (s *Service) Register(spec core.TaskSpec) error {
	t, err := s.reg.Add(spec, SourceCore, "")
	if err != nil {
		return err
	}
	switch t.Scope {
	case core.TaskNode:
		err = s.node.add(t)
	case core.TaskCluster:
		err = fmt.Errorf("%w: cluster tasks are not available yet", core.ErrTaskNotReady)
	}
	if err != nil {
		s.reg.Remove(t.Name)
	}
	return err
}

// StartNode starts the node backend and listens for manual runs requested on
// other nodes (task:run).
func (s *Service) StartNode(ctx context.Context) error {
	s.node.start(ctx)
	if s.opts.Bus != nil {
		cancel := s.opts.Bus.Subscribe(core.ChannelTaskRun, s.onRunRequest)
		s.mu.Lock()
		s.cancels = append(s.cancels, cancel)
		s.mu.Unlock()
	}
	return nil
}

// Trigger runs a task once now (core.Tasks).
func (s *Service) Trigger(_ context.Context, name string) error {
	t, ok := s.reg.Get(name)
	if !ok {
		return core.ErrTaskUnknown
	}
	if t.Scope == core.TaskNode {
		return s.node.trigger(name)
	}
	return core.ErrTaskNotReady
}

// RunOnNodes asks node nodeID ("" for every node) to run node task name now.
func (s *Service) RunOnNodes(ctx context.Context, name, nodeID string) error {
	t, ok := s.reg.Get(name)
	if !ok || t.Scope != core.TaskNode {
		return core.ErrTaskUnknown
	}
	if nodeID == s.opts.NodeID {
		return s.node.trigger(name)
	}
	if s.opts.Bus == nil {
		if nodeID == "" {
			return s.node.trigger(name)
		}
		return core.ErrTaskNotReady
	}
	payload, _ := json.Marshal(runRequest{Name: name, NodeID: nodeID})
	return s.opts.Bus.Publish(ctx, core.ChannelTaskRun, payload)
}

type runRequest struct {
	Name   string `json:"name"`
	NodeID string `json:"node_id,omitempty"`
}

func (s *Service) onRunRequest(payload []byte) {
	var req runRequest
	if json.Unmarshal(payload, &req) != nil || (req.NodeID != "" && req.NodeID != s.opts.NodeID) {
		return
	}
	if err := s.node.trigger(req.Name); err != nil && err != core.ErrTaskUnknown {
		s.log.Debug("task: manual run request", "task", req.Name, "err", err)
	}
}

// Enqueue submits one run of a cluster task (core.Tasks).
func (s *Service) Enqueue(context.Context, string, any, core.EnqueueOpts) error {
	return core.ErrTaskNotReady
}

// EnqueueTx submits one run of a cluster task inside tx (core.Tasks).
func (s *Service) EnqueueTx(context.Context, pgx.Tx, string, any, core.EnqueueOpts) error {
	return core.ErrTaskNotReady
}

// NodeStates returns this node's node task states (tests, console).
func (s *Service) NodeStates() []NodeTaskState { return s.node.states() }

// Stop stops both backends: running tasks get up to 20 seconds each backend
// before their contexts are cancelled.
func (s *Service) Stop(ctx context.Context) {
	s.mu.Lock()
	cancels := s.cancels
	s.cancels = nil
	s.mu.Unlock()
	for _, c := range cancels {
		c()
	}
	s.node.stop(ctx)
}
