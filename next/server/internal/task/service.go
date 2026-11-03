package task

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
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
	// DB, Executor and ClientID serve the cluster backend (StartCluster).
	// ClientID names this node's River client; empty uses NodeID.
	DB       *store.DB
	Executor *background.Executor
	ClientID string
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
	cluster *clusterBackend
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
		// Before StartCluster the task is only registered; StartCluster
		// records and schedules every registered cluster task.
		if c := s.clusterBackend(); c != nil {
			err = c.add(context.Background(), t)
		}
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

// StartCluster starts the cluster backend: it records every registered
// cluster task in scheduled_tasks and runs River while CanWork holds.
func (s *Service) StartCluster(ctx context.Context) error {
	if s.opts.DB == nil {
		return fmt.Errorf("%w: no database", core.ErrTaskNotReady)
	}
	if _, ok := s.reg.Get(HousekeepingTask); !ok {
		if _, err := s.reg.Add(s.housekeepingSpec(), SourceCore, ""); err != nil {
			return err
		}
	}
	s.mu.Lock()
	if s.cluster != nil {
		s.mu.Unlock()
		return nil
	}
	clientID := s.opts.ClientID
	if clientID == "" {
		clientID = s.opts.NodeID
	}
	c, err := newClusterBackend(ctx, s.log, s.opts.DB, s.reg, s.opts.NodeID, clientID, s.opts.Version, s.opts.CanWork, s.opts.Executor)
	if err != nil {
		s.mu.Unlock()
		return err
	}
	s.cluster = c
	s.mu.Unlock()
	if err := c.start(ctx); err != nil {
		c.shutdown(ctx)
		s.mu.Lock()
		s.cluster = nil
		s.mu.Unlock()
		return err
	}
	return nil
}

func (s *Service) clusterBackend() *clusterBackend {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cluster
}

// Trigger runs a task once now (core.Tasks).
func (s *Service) Trigger(ctx context.Context, name string) error {
	t, ok := s.reg.Get(name)
	if !ok {
		return core.ErrTaskUnknown
	}
	if t.Scope == core.TaskNode {
		return s.node.trigger(name)
	}
	c := s.clusterBackend()
	if c == nil {
		return core.ErrTaskNotReady
	}
	return c.trigger(ctx, name)
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
func (s *Service) Enqueue(ctx context.Context, name string, args any, opts core.EnqueueOpts) error {
	c := s.clusterBackend()
	if c == nil {
		return core.ErrTaskNotReady
	}
	return c.enqueue(ctx, nil, name, args, opts)
}

// EnqueueTx submits one run of a cluster task inside tx (core.Tasks).
func (s *Service) EnqueueTx(ctx context.Context, tx pgx.Tx, name string, args any, opts core.EnqueueOpts) error {
	if tx == nil {
		return fmt.Errorf("%w: nil transaction", core.ErrTaskInvalid)
	}
	c := s.clusterBackend()
	if c == nil {
		return core.ErrTaskNotReady
	}
	return c.enqueue(ctx, tx, name, args, opts)
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
	if c := s.clusterBackend(); c != nil {
		c.shutdown(ctx)
	}
	s.node.stop(ctx)
}
