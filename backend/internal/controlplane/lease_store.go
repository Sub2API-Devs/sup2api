package controlplane

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
	"google.golang.org/protobuf/proto"
)

const (
	leaseKeyPrefix          = "sup2api:dp:lease:"
	leaseArchiveKeyPrefix   = "sup2api:dp:lease_archive:"
	leaseRequestKeyPrefix   = "sup2api:dp:request:"
	leaseReservationPrefix  = "sup2api:dp:reserved:"
	leaseExpirationIndexKey = "sup2api:dp:lease_expirations"
	leasePhysicalRetention  = 24 * time.Hour
	leaseSweepBatchSize     = 256
)

var (
	ErrReservationExceeded = errors.New("billing reservation exceeds available funds")
	ErrLeaseNotFound       = errors.New("request lease not found")
	ErrRequestFinalized    = errors.New("request ID belongs to a finalized lease")
)

var createLeaseScript = redis.NewScript(`
	local existing = redis.call('GET', KEYS[2])
	if existing then return 2 end
	local amount = tonumber(ARGV[3])
	local limit = tonumber(ARGV[4])
	local current = tonumber(redis.call('GET', KEYS[3]) or '0')
	if amount > 0 and current + amount > limit then return 0 end
	if redis.call('SET', KEYS[1], ARGV[2], 'NX', 'EX', ARGV[5]) == false then return -1 end
	if redis.call('SET', KEYS[2], ARGV[1], 'NX', 'EX', ARGV[5]) == false then
		redis.call('DEL', KEYS[1])
		return 2
	end
	if amount > 0 then
		redis.call('INCRBY', KEYS[3], amount)
		redis.call('EXPIRE', KEYS[3], ARGV[5])
	end
	redis.call('ZADD', KEYS[4], ARGV[6], ARGV[1])
	return 1
`)

var renewLeaseScript = redis.NewScript(`
	if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
	redis.call('EXPIRE', KEYS[1], ARGV[2])
	redis.call('EXPIRE', KEYS[2], ARGV[2])
	redis.call('ZADD', KEYS[3], ARGV[1], ARGV[3])
	return 1
`)

var releaseLeaseScript = redis.NewScript(`
	local payload = redis.call('GET', KEYS[1])
	if payload == false then
		redis.call('ZREM', KEYS[4], ARGV[3])
		return 0
	end
	local record = cjson.decode(payload)
	record['release_reason'] = ARGV[4]
	redis.call('SET', KEYS[5], cjson.encode(record), 'EX', ARGV[2])
	redis.call('DEL', KEYS[1])
	redis.call('EXPIRE', KEYS[2], ARGV[2])
	local amount = tonumber(ARGV[1])
	if amount > 0 then
		local current = tonumber(redis.call('GET', KEYS[3]) or '0')
		local remaining = current - amount
		if remaining > 0 then
			redis.call('SET', KEYS[3], remaining, 'EX', ARGV[2])
		else
			redis.call('DEL', KEYS[3])
		end
	end
	redis.call('ZREM', KEYS[4], ARGV[3])
	return 1
`)

type LeaseRecord struct {
	LeaseID                string                   `json:"lease_id"`
	RequestID              string                   `json:"request_id"`
	DataPlaneID            string                   `json:"data_plane_id"`
	APIKeyID               int64                    `json:"api_key_id"`
	UserID                 int64                    `json:"user_id"`
	GroupID                int64                    `json:"group_id"`
	SubscriptionID         int64                    `json:"subscription_id,omitempty"`
	AccountID              int64                    `json:"account_id"`
	RequestedModel         string                   `json:"requested_model"`
	MappedModel            string                   `json:"mapped_model"`
	PricingVersion         string                   `json:"pricing_version"`
	BillingMode            string                   `json:"billing_mode"`
	BillingReservationID   string                   `json:"billing_reservation_id"`
	ReservationKey         string                   `json:"reservation_key"`
	ReservedAmountMicrousd int64                    `json:"reserved_amount_microusd"`
	Plan                   *controlv1.ExecutionPlan `json:"plan"`
	ReleaseReason          string                   `json:"release_reason,omitempty"`
	Stream                 bool                     `json:"stream"`
	Path                   string                   `json:"path"`
	ClientIP               string                   `json:"client_ip"`
	UserAgent              string                   `json:"user_agent"`
}

type LeaseStore struct {
	rdb       *redis.Client
	ttl       time.Duration
	physical  time.Duration
	live      service.LiveConcurrencyCache
	cancel    context.CancelFunc
	wg        sync.WaitGroup
	startOnce sync.Once
	stopOnce  sync.Once
}

func NewLeaseStore(cfg *config.Config, rdb *redis.Client, concurrency service.ConcurrencyCache) *LeaseStore {
	ttl := time.Minute
	if cfg != nil && cfg.DataPlaneControl.LeaseTTLSeconds > 0 {
		ttl = time.Duration(cfg.DataPlaneControl.LeaseTTLSeconds) * time.Second
	}
	physical := leasePhysicalRetention
	if ttl*10 > physical {
		physical = ttl * 10
	}
	live, _ := concurrency.(service.LiveConcurrencyCache)
	return &LeaseStore{rdb: rdb, ttl: ttl, physical: physical, live: live}
}

func (s *LeaseStore) Start(parent context.Context) {
	if s == nil || s.rdb == nil {
		return
	}
	s.startOnce.Do(func() {
		ctx, cancel := context.WithCancel(parent)
		s.cancel = cancel
		s.wg.Add(1)
		go s.sweepLoop(ctx)
	})
}

func (s *LeaseStore) Stop() {
	if s == nil {
		return
	}
	s.stopOnce.Do(func() {
		if s.cancel != nil {
			s.cancel()
		}
		s.wg.Wait()
	})
}

// Create atomically reserves billing capacity and records a retry-safe lease.
// limitMicrousd is the authoritative balance/subscription headroom snapshot;
// Redis accounts for concurrent reservations not yet visible in that snapshot.
func (s *LeaseStore) Create(ctx context.Context, record *LeaseRecord, limitMicrousd int64) (*LeaseRecord, bool, error) {
	if s == nil || s.rdb == nil || record == nil || record.LeaseID == "" || record.RequestID == "" || record.ReservationKey == "" {
		return nil, false, fmt.Errorf("invalid lease creation input")
	}
	payload, err := json.Marshal(record)
	if err != nil {
		return nil, false, fmt.Errorf("marshal request lease: %w", err)
	}
	expiresAt := time.Now().Add(s.ttl)
	retentionSeconds := int64(s.physical / time.Second)
	result, err := createLeaseScript.Run(ctx, s.rdb, []string{
		leaseKey(record.LeaseID),
		leaseRequestKey(record.RequestID),
		leaseReservationKey(record.ReservationKey),
		leaseExpirationIndexKey,
	}, record.LeaseID, payload, record.ReservedAmountMicrousd, limitMicrousd, retentionSeconds, expiresAt.UnixMilli()).Int()
	if err != nil {
		return nil, false, fmt.Errorf("create request lease: %w", err)
	}
	switch result {
	case 1:
		return cloneLeaseRecord(record), true, nil
	case 0:
		return nil, false, ErrReservationExceeded
	case 2:
		existing, _, loadErr := s.LoadActiveByRequest(ctx, record.RequestID)
		if errors.Is(loadErr, ErrLeaseNotFound) {
			return nil, false, ErrRequestFinalized
		}
		return existing, false, loadErr
	default:
		return nil, false, fmt.Errorf("request lease collision")
	}
}

func (s *LeaseStore) Load(ctx context.Context, leaseID string) (*LeaseRecord, error) {
	if s == nil || s.rdb == nil || leaseID == "" {
		return nil, ErrLeaseNotFound
	}
	payload, err := s.rdb.Get(ctx, leaseKey(leaseID)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrLeaseNotFound
	}
	if err != nil {
		return nil, err
	}
	var record LeaseRecord
	if err := json.Unmarshal(payload, &record); err != nil {
		return nil, fmt.Errorf("decode request lease: %w", err)
	}
	return &record, nil
}

func (s *LeaseStore) LoadByRequest(ctx context.Context, requestID string) (*LeaseRecord, error) {
	if s == nil || s.rdb == nil || requestID == "" {
		return nil, ErrLeaseNotFound
	}
	leaseID, err := s.rdb.Get(ctx, leaseRequestKey(requestID)).Result()
	if errors.Is(err, redis.Nil) {
		return nil, ErrLeaseNotFound
	}
	if err != nil {
		return nil, err
	}
	return s.Load(ctx, leaseID)
}

func (s *LeaseStore) LoadArchived(ctx context.Context, leaseID string) (*LeaseRecord, error) {
	if s == nil || s.rdb == nil || leaseID == "" {
		return nil, ErrLeaseNotFound
	}
	payload, err := s.rdb.Get(ctx, leaseArchiveKey(leaseID)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrLeaseNotFound
	}
	if err != nil {
		return nil, err
	}
	var record LeaseRecord
	if err := json.Unmarshal(payload, &record); err != nil {
		return nil, fmt.Errorf("decode archived request lease: %w", err)
	}
	return &record, nil
}

func (s *LeaseStore) LoadForSettlement(ctx context.Context, leaseID string) (*LeaseRecord, error) {
	record, err := s.Load(ctx, leaseID)
	if err == nil {
		return record, nil
	}
	if !errors.Is(err, ErrLeaseNotFound) {
		return nil, err
	}
	return s.LoadArchived(ctx, leaseID)
}

func (s *LeaseStore) ExpiresAt(ctx context.Context, leaseID string) (time.Time, error) {
	if s == nil || s.rdb == nil || leaseID == "" {
		return time.Time{}, ErrLeaseNotFound
	}
	score, err := s.rdb.ZScore(ctx, leaseExpirationIndexKey, leaseID).Result()
	if errors.Is(err, redis.Nil) {
		return time.Time{}, ErrLeaseNotFound
	}
	if err != nil {
		return time.Time{}, err
	}
	return time.UnixMilli(int64(score)), nil
}

func (s *LeaseStore) LoadActiveByRequest(ctx context.Context, requestID string) (*LeaseRecord, time.Time, error) {
	record, err := s.LoadByRequest(ctx, requestID)
	if err != nil {
		return nil, time.Time{}, err
	}
	expiresAt, err := s.ExpiresAt(ctx, record.LeaseID)
	if err != nil {
		return nil, time.Time{}, err
	}
	if !time.Now().Before(expiresAt) {
		_, _, _ = s.Release(ctx, record.LeaseID, "expired")
		return nil, time.Time{}, ErrLeaseNotFound
	}
	return record, expiresAt, nil
}

func (s *LeaseStore) AcquireConcurrency(ctx context.Context, record *LeaseRecord, accountMax, userMax int) (bool, error) {
	if s == nil || s.live == nil || record == nil {
		return false, fmt.Errorf("distributed concurrency lease is unavailable")
	}
	return s.live.AcquireLiveLease(ctx, record.AccountID, accountMax, record.UserID, userMax, record.APIKeyID, record.LeaseID, true)
}

func (s *LeaseStore) ReleaseConcurrency(ctx context.Context, record *LeaseRecord) error {
	if s == nil || s.live == nil || record == nil {
		return nil
	}
	return s.live.ReleaseLiveLease(ctx, record.AccountID, record.UserID, record.APIKeyID, record.LeaseID)
}

func (s *LeaseStore) TTL() time.Duration {
	if s == nil {
		return 0
	}
	return s.ttl
}

func (s *LeaseStore) Renew(ctx context.Context, leaseID string) (time.Time, error) {
	record, err := s.Load(ctx, leaseID)
	if err != nil {
		return time.Time{}, err
	}
	if currentExpiry, expiryErr := s.ExpiresAt(ctx, leaseID); expiryErr != nil || !time.Now().Before(currentExpiry) {
		return time.Time{}, ErrLeaseNotFound
	}
	if s.live != nil {
		refreshed, refreshErr := s.live.RefreshLiveLease(ctx, record.AccountID, record.UserID, record.APIKeyID, record.LeaseID)
		if refreshErr != nil || !refreshed {
			if refreshErr == nil {
				refreshErr = ErrLeaseNotFound
			}
			return time.Time{}, fmt.Errorf("refresh concurrency lease: %w", refreshErr)
		}
	}
	expiresAt := time.Now().Add(s.ttl)
	result, err := renewLeaseScript.Run(ctx, s.rdb, []string{
		leaseKey(record.LeaseID), leaseRequestKey(record.RequestID), leaseExpirationIndexKey,
	}, expiresAt.UnixMilli(), int64(s.physical/time.Second), record.LeaseID).Int()
	if err != nil {
		return time.Time{}, err
	}
	if result != 1 {
		return time.Time{}, ErrLeaseNotFound
	}
	return expiresAt, nil
}

func (s *LeaseStore) Release(ctx context.Context, leaseID, reason string) (*LeaseRecord, bool, error) {
	record, err := s.Load(ctx, leaseID)
	if errors.Is(err, ErrLeaseNotFound) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	result, err := releaseLeaseScript.Run(ctx, s.rdb, []string{
		leaseKey(record.LeaseID),
		leaseRequestKey(record.RequestID),
		leaseReservationKey(record.ReservationKey),
		leaseExpirationIndexKey,
		leaseArchiveKey(record.LeaseID),
	}, record.ReservedAmountMicrousd, int64(s.physical/time.Second), record.LeaseID, reason).Int()
	if err != nil {
		return nil, false, err
	}
	if result == 1 && s.live != nil {
		if releaseErr := s.live.ReleaseLiveLease(ctx, record.AccountID, record.UserID, record.APIKeyID, record.LeaseID); releaseErr != nil {
			return record, true, fmt.Errorf("release concurrency lease: %w", releaseErr)
		}
	}
	record.ReleaseReason = reason
	return record, result == 1, nil
}

func (s *LeaseStore) sweepLoop(ctx context.Context) {
	defer s.wg.Done()
	interval := min(s.ttl/3, 10*time.Second)
	if interval < time.Second {
		interval = time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := s.SweepExpired(ctx, time.Now(), leaseSweepBatchSize); err != nil && ctx.Err() == nil {
				slog.Error("expired data-plane lease sweep failed", "error", err)
			}
		}
	}
}

func (s *LeaseStore) SweepExpired(ctx context.Context, now time.Time, limit int64) (int, error) {
	if limit <= 0 {
		limit = leaseSweepBatchSize
	}
	leaseIDs, err := s.rdb.ZRangeByScore(ctx, leaseExpirationIndexKey, &redis.ZRangeBy{
		Min: "-inf", Max: strconv.FormatInt(now.UnixMilli(), 10), Offset: 0, Count: limit,
	}).Result()
	if err != nil {
		return 0, err
	}
	released := 0
	for _, leaseID := range leaseIDs {
		_, removed, releaseErr := s.Release(ctx, leaseID, "expired")
		if releaseErr != nil {
			return released, releaseErr
		}
		if removed {
			released++
			continue
		}
		_ = s.rdb.ZRem(ctx, leaseExpirationIndexKey, leaseID).Err()
	}
	return released, nil
}

func leaseKey(leaseID string) string            { return leaseKeyPrefix + leaseID }
func leaseArchiveKey(leaseID string) string     { return leaseArchiveKeyPrefix + leaseID }
func leaseRequestKey(requestID string) string   { return leaseRequestKeyPrefix + requestID }
func leaseReservationKey(subject string) string { return leaseReservationPrefix + subject }

func cloneLeaseRecord(record *LeaseRecord) *LeaseRecord {
	if record == nil {
		return nil
	}
	clone := *record
	if record.Plan != nil {
		clone.Plan = proto.Clone(record.Plan).(*controlv1.ExecutionPlan)
	}
	return &clone
}
