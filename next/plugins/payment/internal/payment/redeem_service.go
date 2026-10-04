package payment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// RedeemService handles redeem code operations
type RedeemService struct {
	db     dbFunc
	credit creditFunc
}

// NewRedeemService creates a new RedeemService
func NewRedeemService(db dbFunc, credit creditFunc) *RedeemService {
	return &RedeemService{db: db, credit: credit}
}

// GenerateRedeemCode generates a random redeem code
func GenerateRedeemCode() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return strings.ToUpper(hex.EncodeToString(b)), nil
}

// GenerateCodesRequest represents batch code generation request
type GenerateCodesRequest struct {
	Count        int             `json:"count"`
	Type         string          `json:"type"`
	Value        decimal.Decimal `json:"value"`
	GroupID      *int64          `json:"group_id,omitempty"`
	ValidityDays int             `json:"validity_days,omitempty"`
	ExpiresAt    *time.Time      `json:"expires_at,omitempty"`
	Notes        string          `json:"notes,omitempty"`
}

// GenerateCodes generates multiple redeem codes
func (s *RedeemService) GenerateCodes(ctx context.Context, req GenerateCodesRequest) ([]RedeemCode, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, err
	}
	if req.Count <= 0 || req.Count > 1000 {
		return nil, fmt.Errorf("invalid count: must be 1-1000")
	}

	if req.Value.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("invalid value: must be positive")
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var codes []RedeemCode
	for i := 0; i < req.Count; i++ {
		code, err := GenerateRedeemCode()
		if err != nil {
			return nil, fmt.Errorf("generate code: %w", err)
		}

		codeHash := HashRedeemCode(code)

		var id int64
		var createdAt time.Time
		err = tx.QueryRow(ctx, `
			INSERT INTO redeem_codes (
				code, code_hash, type, value, group_id, validity_days,
				status, expires_at, notes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id, created_at
		`, code, codeHash, req.Type, req.Value, req.GroupID, req.ValidityDays,
			RedeemStatusUnused, req.ExpiresAt, req.Notes).Scan(&id, &createdAt)
		if err != nil {
			return nil, fmt.Errorf("insert code: %w", err)
		}

		rc := RedeemCode{
			ID:           id,
			Code:         code,
			CodeHash:     codeHash,
			Type:         req.Type,
			Value:        req.Value,
			GroupID:      req.GroupID,
			ValidityDays: req.ValidityDays,
			Status:       RedeemStatusUnused,
			ExpiresAt:    req.ExpiresAt,
			Notes:        req.Notes,
			CreatedAt:    createdAt,
		}
		codes = append(codes, rc)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	slog.Info("redeem codes generated", "count", len(codes), "type", req.Type)
	return codes, nil
}

// RedeemCode redeems a code for a user
func (s *RedeemService) RedeemCode(ctx context.Context, userID int64, code string) (*RedeemCode, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, err
	}
	code = strings.TrimSpace(strings.ToUpper(code))
	if code == "" {
		return nil, fmt.Errorf("code is required")
	}

	codeHash := HashRedeemCode(code)

	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock and fetch code
	var rc RedeemCode
	err = tx.QueryRow(ctx, `
		SELECT id, code_hash, type, value, group_id, validity_days,
			status, used_by, used_at, expires_at, notes, created_at
		FROM redeem_codes
		WHERE code_hash = $1
		FOR UPDATE
	`, codeHash).Scan(
		&rc.ID, &rc.CodeHash, &rc.Type, &rc.Value, &rc.GroupID, &rc.ValidityDays,
		&rc.Status, &rc.UsedBy, &rc.UsedAt, &rc.ExpiresAt, &rc.Notes, &rc.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("invalid code")
	}
	if err != nil {
		return nil, fmt.Errorf("query code: %w", err)
	}

	// Validate code
	if !rc.CanUse() {
		if rc.IsUsed() {
			return nil, fmt.Errorf("code already used")
		}
		if rc.IsExpired() {
			return nil, fmt.Errorf("code expired")
		}
		return nil, fmt.Errorf("code not available")
	}

	// Mark as used
	now := time.Now()
	_, err = tx.Exec(ctx, `
		UPDATE redeem_codes
		SET status = $1, used_by = $2, used_at = $3, updated_at = $4
		WHERE id = $5
	`, RedeemStatusUsed, userID, now, now, rc.ID)
	if err != nil {
		return nil, fmt.Errorf("update code: %w", err)
	}

	// Credit balance (only for balance type)
	if rc.Type == RedeemTypeBalance {
		resp, err := s.credit(ctx, pluginsdk.LedgerChange{
			UserID:         userID,
			Amount:         rc.Value.String(),
			RefType:        "redeem_code",
			RefID:          strconv.FormatInt(rc.ID, 10),
			IdempotencyKey: fmt.Sprintf("redeem_code_%d", rc.ID),
			Note:           fmt.Sprintf("兑换码充值 ¥%s", rc.Value.String()),
		})
		if err != nil {
			return nil, fmt.Errorf("credit ledger: %w", err)
		}

		slog.Info("redeem code credited",
			"code_id", rc.ID,
			"user_id", userID,
			"amount", rc.Value.String(),
			"ledger_id", resp.LedgerID,
			"duplicate", resp.Duplicate)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	rc.Status = RedeemStatusUsed
	rc.UsedBy = &userID
	rc.UsedAt = &now

	slog.Info("redeem code redeemed", "code_id", rc.ID, "user_id", userID, "type", rc.Type)
	return &rc, nil
}

// ListCodes lists redeem codes (admin only)
func (s *RedeemService) ListCodes(ctx context.Context, status string, limit, offset int) ([]RedeemCode, int, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, 0, err
	}
	// Count total
	var total int
	var countQuery string
	var countArgs []any

	if status != "" {
		countQuery = `SELECT COUNT(*) FROM redeem_codes WHERE status = $1`
		countArgs = []any{status}
	} else {
		countQuery = `SELECT COUNT(*) FROM redeem_codes`
	}

	err = db.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count codes: %w", err)
	}

	// Query codes
	var query string
	var args []any

	if status != "" {
		query = `
			SELECT id, code_hash, type, value, group_id, validity_days,
				status, used_by, used_at, expires_at, notes, created_at
			FROM redeem_codes
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []any{status, limit, offset}
	} else {
		query = `
			SELECT id, code_hash, type, value, group_id, validity_days,
				status, used_by, used_at, expires_at, notes, created_at
			FROM redeem_codes
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []any{limit, offset}
	}

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query codes: %w", err)
	}
	defer rows.Close()

	var codes []RedeemCode
	for rows.Next() {
		var rc RedeemCode
		err := rows.Scan(
			&rc.ID, &rc.CodeHash, &rc.Type, &rc.Value, &rc.GroupID, &rc.ValidityDays,
			&rc.Status, &rc.UsedBy, &rc.UsedAt, &rc.ExpiresAt, &rc.Notes, &rc.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan code: %w", err)
		}
		codes = append(codes, rc)
	}

	return codes, total, nil
}

// GetUserRedeemHistory returns user's redeem history
func (s *RedeemService) GetUserRedeemHistory(ctx context.Context, userID int64, limit, offset int) ([]RedeemCode, int, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, 0, err
	}
	// Count total
	var total int
	err = db.QueryRow(ctx, `
		SELECT COUNT(*) FROM redeem_codes WHERE used_by = $1
	`, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count user codes: %w", err)
	}

	// Query codes
	rows, err := db.Query(ctx, `
		SELECT id, code_hash, type, value, status, used_at, notes, created_at
		FROM redeem_codes
		WHERE used_by = $1
		ORDER BY used_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query user codes: %w", err)
	}
	defer rows.Close()

	var codes []RedeemCode
	for rows.Next() {
		var rc RedeemCode
		err := rows.Scan(
			&rc.ID, &rc.CodeHash, &rc.Type, &rc.Value, &rc.Status,
			&rc.UsedAt, &rc.Notes, &rc.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan code: %w", err)
		}
		rc.UsedBy = &userID
		codes = append(codes, rc)
	}

	return codes, total, nil
}

// DeleteCode deletes (invalidates) a redeem code
func (s *RedeemService) DeleteCode(ctx context.Context, codeID int64) error {
	db, err := s.db(ctx)
	if err != nil {
		return err
	}
	result, err := db.Exec(ctx, `
		UPDATE redeem_codes
		SET status = $1, updated_at = $2
		WHERE id = $3 AND status = $4
	`, RedeemStatusExpired, time.Now(), codeID, RedeemStatusUnused)
	if err != nil {
		return fmt.Errorf("update code: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("code not found or already used")
	}

	slog.Info("redeem code invalidated", "code_id", codeID)
	return nil
}
