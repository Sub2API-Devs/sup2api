package store

import (
	"errors"
	"fmt"

	"ccgateway/controller/internal/pyjson"
)

// Binding is one shared-gateway binding (S31): bindings[<key>].
type Binding struct {
	IP          string
	Gateway     string
	NetworkID   string
	ContainerID string
	Interface   string
	Port        int64
	Tag         string
	Revision    string
	Active      bool

	object
}

// NewBinding is the dict configure() writes, in its key order.
func NewBinding(ip, gateway, networkID, containerID, iface string, port int64, tag, revision string, active bool) *Binding {
	b := &Binding{IP: ip, Gateway: gateway, NetworkID: networkID, ContainerID: containerID, Interface: iface,
		Port: port, Tag: tag, Revision: revision, Active: active}
	b.mark("ip", "gateway", "network_id", "container_id", "interface", "port", "tag", "revision", "active")
	return b
}

func (b *Binding) specs() []spec {
	o := &b.object
	return []spec{
		strField(o, "ip", &b.IP),
		strField(o, "gateway", &b.Gateway),
		strField(o, "network_id", &b.NetworkID),
		strField(o, "container_id", &b.ContainerID),
		strField(o, "interface", &b.Interface),
		{key: "port", present: func() bool { return b.Port != 0 || o.has("port") },
			get: func() any { return b.Port },
			set: func(v any) error {
				n, err := asInt(v)
				b.Port = n
				return err
			},
			unset: func() { b.Port = 0 }},
		strField(o, "tag", &b.Tag),
		strField(o, "revision", &b.Revision),
		{key: "active", present: func() bool { return b.Active || o.has("active") },
			get: func() any { return b.Active },
			set: func(v any) error {
				// b.get('active') is truthiness; keep a bool.
				b.Active = pyjson.Truthy(v)
				return nil
			},
			unset: func() { b.Active = false }},
	}
}

// PyValue is the binding as a Python dict.
func (b *Binding) PyValue() any { return b.object.encode(b.specs()) }

func (b *Binding) decode(raw pyjson.Ordered) error { return b.object.decode(raw, b.specs()) }

// Clone is a deep copy.
func (b *Binding) Clone() *Binding {
	c := &Binding{}
	if err := c.decode(b.PyValue().(pyjson.Ordered)); err != nil {
		panic(err)
	}
	return c
}

// Endpoint is a node's pinned [address, port]; nil for direct.
type Endpoint struct {
	IP   string
	Port int64
}

// PyValue is the two-element list.
func (e *Endpoint) PyValue() any {
	if e == nil {
		return nil
	}
	return []any{e.IP, e.Port}
}

func endpointOf(v any) (*Endpoint, error) {
	if v == nil {
		return nil, nil
	}
	list, ok := v.([]any)
	if !ok || len(list) != 2 {
		return nil, errType
	}
	ip, err := asString(list[0])
	if err != nil {
		return nil, err
	}
	port, err := pyjson.IntOf(list[1])
	if err != nil {
		return nil, err
	}
	return &Endpoint{IP: ip, Port: port}, nil
}

// Node is one retained outbound (S32): {"outbound", "endpoint"}. Outbound is
// kept as decoded JSON and sent to `xray api ado` unchanged; an existing
// node is never regenerated.
type Node struct {
	Outbound any
	Endpoint *Endpoint

	object
}

// NewNode is the dict node() returns.
func NewNode(outbound any, endpoint *Endpoint) *Node {
	n := &Node{Outbound: outbound, Endpoint: endpoint}
	n.mark("outbound", "endpoint")
	return n
}

func (n *Node) specs() []spec {
	o := &n.object
	return []spec{
		{key: "outbound", present: func() bool { return n.Outbound != nil || o.has("outbound") },
			get:   func() any { return n.Outbound },
			set:   func(v any) error { n.Outbound = v; return nil },
			unset: func() { n.Outbound = nil }},
		{key: "endpoint", present: func() bool { return n.Endpoint != nil || o.has("endpoint") },
			get: func() any { return n.Endpoint },
			set: func(v any) error {
				e, err := endpointOf(v)
				n.Endpoint = e
				return err
			},
			unset: func() { n.Endpoint = nil }},
	}
}

// PyValue is the node as a Python dict.
func (n *Node) PyValue() any { return n.object.encode(n.specs()) }

func (n *Node) decode(raw pyjson.Ordered) error { return n.object.decode(raw, n.specs()) }

// Tag is outbound["tag"] ("" when absent).
func (n *Node) Tag() string {
	if o, ok := n.Outbound.(pyjson.Ordered); ok {
		if t, ok := o.Get("tag"); ok {
			s, _ := t.(string)
			return s
		}
	}
	return ""
}

// Bindings is the ordered bindings dict.
type Bindings struct {
	keys []string
	m    map[string]*Binding
}

// Get is bindings.get(key).
func (b *Bindings) Get(key string) (*Binding, bool) {
	v, ok := b.m[key]
	return v, ok
}

// Set is bindings[key] = v (an existing key keeps its position).
func (b *Bindings) Set(key string, v *Binding) {
	if b.m == nil {
		b.m = map[string]*Binding{}
	}
	if _, ok := b.m[key]; !ok {
		b.keys = append(b.keys, key)
	}
	b.m[key] = v
}

// Delete is del bindings[key].
func (b *Bindings) Delete(key string) {
	if _, ok := b.m[key]; !ok {
		return
	}
	delete(b.m, key)
	for i, k := range b.keys {
		if k == key {
			b.keys = append(b.keys[:i:i], b.keys[i+1:]...)
			break
		}
	}
}

// Keys in insertion order.
func (b *Bindings) Keys() []string { return append([]string(nil), b.keys...) }

// SortedKeys in string order (deterministic iteration, BUG-17).
func (b *Bindings) SortedKeys() []string { return sortedKeys(b.m) }

// Len is the number of bindings.
func (b *Bindings) Len() int { return len(b.keys) }

// PyValue is the bindings dict.
func (b *Bindings) PyValue() any {
	out := pyjson.Ordered{}
	for _, k := range b.keys {
		out = append(out, pyjson.KV{Key: k, Value: b.m[k]})
	}
	return out
}

// Nodes is the ordered nodes dict.
type Nodes struct {
	keys []string
	m    map[string]*Node
}

// Get is nodes.get(tag).
func (n *Nodes) Get(tag string) (*Node, bool) {
	v, ok := n.m[tag]
	return v, ok
}

// Set is nodes[tag] = v.
func (n *Nodes) Set(tag string, v *Node) {
	if n.m == nil {
		n.m = map[string]*Node{}
	}
	if _, ok := n.m[tag]; !ok {
		n.keys = append(n.keys, tag)
	}
	n.m[tag] = v
}

// Delete is del nodes[tag].
func (n *Nodes) Delete(tag string) {
	if _, ok := n.m[tag]; !ok {
		return
	}
	delete(n.m, tag)
	for i, k := range n.keys {
		if k == tag {
			n.keys = append(n.keys[:i:i], n.keys[i+1:]...)
			break
		}
	}
}

// Keys in insertion order.
func (n *Nodes) Keys() []string { return append([]string(nil), n.keys...) }

// SortedKeys in string order.
func (n *Nodes) SortedKeys() []string { return sortedKeys(n.m) }

// Len is the number of nodes.
func (n *Nodes) Len() int { return len(n.keys) }

// PyValue is the nodes dict.
func (n *Nodes) PyValue() any {
	out := pyjson.Ordered{}
	for _, k := range n.keys {
		out = append(out, pyjson.KV{Key: k, Value: n.m[k]})
	}
	return out
}

// SharedState is the shared gateway state (S30-S33):
// {"schema": 1, "salt", "bindings", "nodes"}. It holds every proxy
// credential; it lives in the controller's data root, never in a directory
// mounted into the gateway.
type SharedState struct {
	Schema   any // must equal 1 (Python data.get('schema') != 1)
	Salt     string
	Bindings Bindings
	Nodes    Nodes

	object
}

// ErrSchema is "unsupported shared egress schema": the controller refuses to start.
var ErrSchema = errors.New("unsupported shared egress schema")

// NewSharedState is the state Python creates when none exists.
func NewSharedState(salt string) *SharedState {
	s := &SharedState{Schema: int64(1), Salt: salt}
	s.mark("schema", "salt", "bindings", "nodes")
	return s
}

func (s *SharedState) specs() []spec {
	o := &s.object
	return []spec{
		{key: "schema", present: func() bool { return s.Schema != nil || o.has("schema") },
			get: func() any { return s.Schema }, set: func(v any) error { s.Schema = v; return nil },
			unset: func() { s.Schema = nil }},
		strField(o, "salt", &s.Salt),
		{key: "bindings", present: func() bool { return s.Bindings.Len() > 0 || o.has("bindings") },
			get: func() any { return &s.Bindings },
			set: func(v any) error {
				obj, err := asObject(v)
				if err != nil {
					return err
				}
				s.Bindings = Bindings{}
				for _, kv := range obj {
					raw, err := asObject(kv.Value)
					if err != nil {
						return fmt.Errorf("binding %s: %w", kv.Key, err)
					}
					b := &Binding{}
					if err := b.decode(raw); err != nil {
						return fmt.Errorf("binding %s: %w", kv.Key, err)
					}
					s.Bindings.Set(kv.Key, b)
				}
				return nil
			},
			unset: func() { s.Bindings = Bindings{} }},
		{key: "nodes", present: func() bool { return s.Nodes.Len() > 0 || o.has("nodes") },
			get: func() any { return &s.Nodes },
			set: func(v any) error {
				obj, err := asObject(v)
				if err != nil {
					return err
				}
				s.Nodes = Nodes{}
				for _, kv := range obj {
					raw, err := asObject(kv.Value)
					if err != nil {
						return fmt.Errorf("node %s: %w", kv.Key, err)
					}
					n := &Node{}
					if err := n.decode(raw); err != nil {
						return fmt.Errorf("node %s: %w", kv.Key, err)
					}
					s.Nodes.Set(kv.Key, n)
				}
				return nil
			},
			unset: func() { s.Nodes = Nodes{} }},
	}
}

// PyValue is the state as a Python dict.
func (s *SharedState) PyValue() any { return s.object.encode(s.specs()) }

// Marshal is json.dumps(data).
func (s *SharedState) Marshal() ([]byte, error) { return pyjson.Marshal(s) }

// ParseSharedState decodes the shared state file. A document that is JSON
// null is "no state" (read_json returns None): (nil, nil).
func ParseSharedState(data []byte) (*SharedState, error) {
	v, err := pyjson.Decode(data)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, nil
	}
	raw, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errors.New("shared egress state is not an object")
	}
	s := &SharedState{}
	if err := s.object.decode(raw, s.specs()); err != nil {
		return nil, err
	}
	if !pyjson.Equal(s.Schema, 1) {
		return nil, ErrSchema
	}
	return s, nil
}
