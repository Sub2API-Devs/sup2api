// Package fakevalkey is an in-memory Valkey for the controller's tests: the
// RESP2 subset the controller speaks (AUTH, ACL SETUSER/DELUSER/LIST, INFO,
// PING), the management user's command set enforced as users.acl grants it,
// and a record of every command. miniredis has no ACL, hence this fake; the
// real ACL isolation is tested against a real Valkey (design §10.2).
package fakevalkey

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
)

// AdminCommands are what users.acl grants ccg-controller (lower case).
var AdminCommands = map[string]bool{"acl|setuser": true, "acl|deluser": true, "acl|list": true, "acl|getuser": true,
	"info": true, "ping": true}

// Server is the fake.
type Server struct {
	mu        sync.Mutex
	adminPass string
	users     map[string][]string // name -> rules as last set
	runID     int
	down      bool
	hang      bool
	failNext  map[string]string // lower-case command -> error reply
	commands  []string          // "acl setuser acct-21 ..." with AUTH passwords redacted
	usedMem   int64
	evicted   int64
}

// New is a running server whose management password is adminPassword.
func New(adminPassword string) *Server {
	return &Server{adminPass: adminPassword, users: map[string][]string{}, runID: 1, failNext: map[string]string{},
		usedMem: 1 << 20}
}

// RunID is the current run_id (40 hex characters, as Valkey's).
func (s *Server) RunID() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.runIDLocked()
}

func (s *Server) runIDLocked() string { return fmt.Sprintf("%040x", s.runID) }

// Restart forgets every runtime user (no persistence) and changes run_id.
func (s *Server) Restart() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users = map[string][]string{}
	s.runID++
}

// SetDown makes every dial fail (connection refused) or succeed again.
func (s *Server) SetDown(down bool) { s.mu.Lock(); s.down = down; s.mu.Unlock() }

// SetHang makes the server read commands and never answer.
func (s *Server) SetHang(hang bool) { s.mu.Lock(); s.hang = hang; s.mu.Unlock() }

// FailNext makes the next command (e.g. "acl|setuser") answer -msg.
func (s *Server) FailNext(cmd, msg string) { s.mu.Lock(); s.failNext[cmd] = msg; s.mu.Unlock() }

// SetStats sets used_memory and evicted_keys.
func (s *Server) SetStats(used, evicted int64) {
	s.mu.Lock()
	s.usedMem, s.evicted = used, evicted
	s.mu.Unlock()
}

// DeleteUser removes a user behind the controller's back.
func (s *Server) DeleteUser(name string) { s.mu.Lock(); delete(s.users, name); s.mu.Unlock() }

// User is a user's rules (nil when absent).
func (s *Server) User(name string) []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.users[name]
	if !ok {
		return nil
	}
	return append([]string{}, r...)
}

// Users are the user names, sorted.
func (s *Server) Users() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0, len(s.users))
	for n := range s.users {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// Commands are the commands received so far.
func (s *Server) Commands() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.commands...)
}

// ResetCommands clears the record.
func (s *Server) ResetCommands() { s.mu.Lock(); s.commands = nil; s.mu.Unlock() }

// Count is the number of recorded commands starting with prefix.
func (s *Server) Count(prefix string) int {
	n := 0
	for _, c := range s.Commands() {
		if strings.HasPrefix(c, prefix) {
			n++
		}
	}
	return n
}

// Dial is sessionstate.Client.Dial.
func (s *Server) Dial(ctx context.Context, _ string) (net.Conn, error) {
	s.mu.Lock()
	down := s.down
	s.mu.Unlock()
	if down {
		return nil, &net.OpError{Op: "dial", Net: "unix", Err: syscall.ECONNREFUSED}
	}
	client, server := net.Pipe()
	go s.serve(server)
	return client, nil
}

// Serve answers every connection of l (a real unix socket in the Linux
// tests) until l is closed.
func (s *Server) Serve(l net.Listener) {
	for {
		c, err := l.Accept()
		if err != nil {
			return
		}
		go s.serve(c)
	}
}

func (s *Server) serve(c net.Conn) {
	defer c.Close()
	r, w := bufio.NewReader(c), bufio.NewWriter(c)
	authed := false
	for {
		argv, err := readCommand(r)
		if err != nil {
			return
		}
		s.mu.Lock()
		hang := s.hang
		s.mu.Unlock()
		if hang {
			continue
		}
		reply := s.handle(argv, &authed)
		if _, err := w.WriteString(reply); err != nil {
			return
		}
		if w.Flush() != nil {
			return
		}
	}
}

func bulk(s string) string { return "$" + strconv.Itoa(len(s)) + "\r\n" + s + "\r\n" }

func (s *Server) handle(argv []string, authed *bool) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(argv) == 0 {
		return "-ERR empty command\r\n"
	}
	name := strings.ToLower(argv[0])
	full := name
	if name == "acl" && len(argv) > 1 {
		full = name + "|" + strings.ToLower(argv[1])
	}
	var rec string
	switch {
	case name == "auth" && len(argv) >= 3:
		rec = "auth " + strings.Join(argv[1:len(argv)-1], " ") + " <redacted>"
	case name == "acl" && len(argv) > 1:
		rec = "acl " + strings.ToLower(argv[1]) + " " + strings.Join(argv[2:], " ")
	default:
		rec = name + " " + strings.Join(argv[1:], " ")
	}
	s.commands = append(s.commands, strings.TrimSpace(rec))
	if msg, ok := s.failNext[full]; ok {
		delete(s.failNext, full)
		return "-" + msg + "\r\n"
	}
	if name == "auth" {
		if len(argv) == 3 && argv[1] == "ccg-controller" && argv[2] == s.adminPass {
			*authed = true
			return "+OK\r\n"
		}
		return "-WRONGPASS invalid username-password pair or user is disabled.\r\n"
	}
	if !*authed {
		return "-NOAUTH Authentication required.\r\n"
	}
	if !AdminCommands[full] {
		return "-NOPERM User ccg-controller has no permissions to run the '" + full + "' command\r\n"
	}
	switch full {
	case "ping":
		return "+PONG\r\n"
	case "acl|setuser":
		if len(argv) < 3 {
			return "-ERR wrong number of arguments\r\n"
		}
		rules := append([]string{}, argv[3:]...)
		if old, ok := s.users[argv[2]]; ok && (len(rules) == 0 || rules[0] != "reset") {
			rules = append(old, rules...)
		}
		s.users[argv[2]] = rules
		return "+OK\r\n"
	case "acl|deluser":
		n := 0
		for _, u := range argv[2:] {
			if _, ok := s.users[u]; ok {
				delete(s.users, u)
				n++
			}
		}
		return ":" + strconv.Itoa(n) + "\r\n"
	case "acl|list":
		names := []string{"ccg-controller", "default"}
		for n := range s.users {
			names = append(names, n)
		}
		sort.Strings(names)
		out := "*" + strconv.Itoa(len(names)) + "\r\n"
		for _, n := range names {
			switch n {
			case "default":
				out += bulk("user default off resetchannels -@all")
			case "ccg-controller":
				out += bulk("user ccg-controller on #0000 resetchannels -@all +acl|setuser +acl|deluser +acl|list +acl|getuser +info +ping")
			default:
				out += bulk("user " + n + " " + strings.Join(s.users[n], " "))
			}
		}
		return out
	case "info":
		text := "# Server\r\nvalkey_version:9.0.0\r\nrun_id:" + s.runIDLocked() + "\r\n\r\n# Memory\r\nused_memory:" +
			strconv.FormatInt(s.usedMem, 10) + "\r\n\r\n# Stats\r\nevicted_keys:" + strconv.FormatInt(s.evicted, 10) + "\r\n"
		return bulk(text)
	}
	return "-ERR unknown command\r\n"
}

var errProto = errors.New("protocol error")

func readCommand(r *bufio.Reader) ([]string, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	line = strings.TrimRight(line, "\r\n")
	if !strings.HasPrefix(line, "*") {
		return nil, errProto
	}
	n, err := strconv.Atoi(line[1:])
	if err != nil || n < 0 || n > 1024 {
		return nil, errProto
	}
	argv := make([]string, 0, n)
	for i := 0; i < n; i++ {
		h, err := r.ReadString('\n')
		if err != nil {
			return nil, err
		}
		h = strings.TrimRight(h, "\r\n")
		if !strings.HasPrefix(h, "$") {
			return nil, errProto
		}
		l, err := strconv.Atoi(h[1:])
		if err != nil || l < 0 || l > 1<<20 {
			return nil, errProto
		}
		buf := make([]byte, l+2)
		if _, err := io.ReadFull(r, buf); err != nil {
			return nil, err
		}
		argv = append(argv, string(buf[:l]))
	}
	return argv, nil
}
