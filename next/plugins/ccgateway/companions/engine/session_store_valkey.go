package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/redis/go-redis/v9/maintnotifications"
)

// valkeyStore keeps the session memory in the controller host's Valkey
// (SESSION-MEMORY-TOOLS-USED-DESIGN.md §5), which every Worker of the host
// shares: each account's ACL user reaches only its own prefix, ccg:<key>:.
// Every key has the lifetime it was written with, and Valkey itself keeps
// nothing across a restart (a restart is every session expiring).
type valkeyStore struct {
	client *redis.Client
	prefix string // ccg:<key>:
}

// The Worker's Valkey settings (the controller passes them to a container it
// creates with the shared store mounted, §7.5).
const (
	stateSocketEnv   = "CCG_STATE_SOCKET"
	stateUserEnv     = "CCG_STATE_USER"
	statePasswordEnv = "CCG_STATE_PASSWORD"
	// stateUserPrefix: the ACL user of account <key> is acct-<key>.
	stateUserPrefix = "acct-"
	// statePoolSize is the client's connections (§4.2).
	statePoolSize = 4
)

// stateAccountKey is an account key as the ACL's key pattern ccg:<key>:*
// can hold it: no glob character, no separator.
var stateAccountKey = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// StateStore is where the Worker connects to the shared session memory; the
// zero value is none (process memory only).
type StateStore struct {
	Socket, User, Password string
}

// configured says whether all three settings are given and the socket is
// there; otherwise the Worker keeps its memory in process memory (§7.6).
func (c StateStore) configured() (key string, ok bool) {
	if c.Socket == "" || c.User == "" || c.Password == "" {
		return "", false
	}
	key, found := strings.CutPrefix(c.User, stateUserPrefix)
	if !found || !stateAccountKey.MatchString(key) {
		return "", false
	}
	if info, err := os.Stat(c.Socket); err != nil || info.IsDir() {
		return "", false
	}
	return key, true
}

// newValkeyStore is the store over the account's Valkey user. The client
// speaks RESP2 and authenticates with AUTH: the account's ACL user may run
// neither HELLO nor CLIENT (§5.4), so neither is sent.
func newValkeyStore(network, addr, user, password, key string) *valkeyStore {
	return newValkeyStoreWith(network, addr, user, password, key, storeOpTimeout)
}

// newValkeyStoreWith is newValkeyStore with the connection's own timeouts
// (a call's deadline still bounds it).
func newValkeyStoreWith(network, addr, user, password, key string, timeout time.Duration) *valkeyStore {
	client := redis.NewClient(&redis.Options{
		Network: network, Addr: addr, Username: user, Password: password,
		Protocol: 2, DisableIdentity: true,
		// The endpoint type is named: left to auto, go-redis v9.22 resolves
		// the address as a host name, a socket path included, which stalls
		// the client's construction for up to 2 s where DNS goes nowhere
		// (an account container).
		MaintNotificationsConfig: &maintnotifications.Config{Mode: maintnotifications.ModeDisabled, EndpointType: maintnotifications.EndpointTypeNone},
		// Every call has its own deadline (storeOpTimeout); the client never
		// retries within it.
		ContextTimeoutEnabled: true, MaxRetries: -1,
		DialTimeout: time.Second, ReadTimeout: timeout, WriteTimeout: timeout,
		PoolSize: statePoolSize, PoolTimeout: timeout,
	})
	return &valkeyStore{client: client, prefix: "ccg:" + key + ":"}
}

func (s *valkeyStore) threadKey(session, thread string) string {
	return s.prefix + "s:" + storeDigest(session) + ":t:" + storeDigest(thread)
}

func (s *valkeyStore) toolsKey(session string) string {
	return s.prefix + "s:" + storeDigest(session) + ":tools"
}

// ttlArgument is a lifetime in whole seconds, at least one.
func ttlArgument(ttl time.Duration) int64 { return max(int64(ttl/time.Second), 1) }

func (s *valkeyStore) loadThread(ctx context.Context, session, thread string, _ time.Duration) (*sessionEntry, error) {
	raw, err := s.client.Get(ctx, s.threadKey(session, thread)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return decodeThread(raw), nil
}

func (s *valkeyStore) saveThread(ctx context.Context, session, thread string, e *sessionEntry, ttl time.Duration) error {
	raw, err := encodeThread(e)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, s.threadKey(session, thread), raw, time.Duration(ttlArgument(ttl))*time.Second).Err()
}

// loadTools reads the session's set and renews it (GETEX … EX).
func (s *valkeyStore) loadTools(ctx context.Context, session string, ttl time.Duration) ([]string, error) {
	raw, err := s.client.GetEx(ctx, s.toolsKey(session), time.Duration(ttlArgument(ttl))*time.Second).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return decodeTools(raw), nil
}

// decodeTools is a stored set's names; Lua's cjson writes an empty one as {}.
// A value it cannot read is an empty set.
func decodeTools(raw []byte) []string {
	if string(raw) == "{}" || len(raw) > storeValueMax {
		return []string{}
	}
	var names []string
	if json.Unmarshal(raw, &names) != nil {
		return []string{}
	}
	return toolNames(names)
}

// toolsMergeScript appends the names a session's set does not have, in order,
// up to a count and a size, and renews the set (§5.3, with the size bound of
// §5.2 added: the set is never larger than a value may be).
//
//	KEYS[1] = ccg:<key>:s:<s>:tools
//	ARGV[1] = TTL seconds, ARGV[2] = cap (256), ARGV[3] = size cap (bytes),
//	ARGV[4..] = names in order
var toolsMergeScript = redis.NewScript(`
local cur = redis.call('GET', KEYS[1])
local list = {}
if cur then
  local ok, decoded = pcall(cjson.decode, cur)
  if ok and type(decoded) == 'table' then list = decoded end
end
local seen = {}
local size = 2
for _, n in ipairs(list) do seen[n] = true; size = size + #n + 3 end
local changed = false
local cap, bytes = tonumber(ARGV[2]), tonumber(ARGV[3])
for i = 4, #ARGV do
  local n = ARGV[i]
  if not seen[n] and #list < cap and size + #n + 3 <= bytes then
    list[#list + 1] = n; seen[n] = true; changed = true; size = size + #n + 3
  end
end
if changed or not cur then
  redis.call('SET', KEYS[1], cjson.encode(list), 'EX', ARGV[1])
else
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return #list
`)

// mergeTools runs toolsMergeScript (EVALSHA; EVAL when Valkey does not have
// it, as after a restart).
func (s *valkeyStore) mergeTools(ctx context.Context, session string, names []string, ttl time.Duration) error {
	args := make([]any, 0, 3+len(names))
	args = append(args, strconv.FormatInt(ttlArgument(ttl), 10), strconv.Itoa(toolsUsedMax), strconv.Itoa(storeValueMax))
	for _, name := range names {
		args = append(args, name)
	}
	if err := toolsMergeScript.Run(ctx, s.client, []string{s.toolsKey(session)}, args...).Err(); err != nil && !errors.Is(err, redis.Nil) {
		return fmt.Errorf("merge tools: %w", err)
	}
	return nil
}

func (s *valkeyStore) close() { _ = s.client.Close() }
