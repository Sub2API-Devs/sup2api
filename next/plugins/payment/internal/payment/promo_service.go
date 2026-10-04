package payment

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// PromoService handles promotional code operations
type PromoService struct {
	db     dbFunc
	credit creditFunc
}

// NewPromoService creates a new PromoService
func NewPromoService(db dbFunc, credit creditFunc) *PromoService {
	return &PromoService{db: db, credit: credit}
}

// CreatePromoCodeRequest represents promo code creation request
type CreatePromoCodeRequest struct {
	Code        string          `json:"code,omitempty"`
	BonusAmount decimal.Decimal `json:"bonus_amount"`
	MaxUses     int             `json:"max_uses,omitempty"`
	ExpiresAt   *time.Time      `json:"expires_at,omitempty"`
	Notes       string          `json:"notes,omitempty"`
}

// CreatePromoCode creates a new promotional code
func (s *PromoService) CreatePromoCode(ctx context.Context, req CreatePromoCodeRequest) (*PromoCode, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(strings.ToUpper(req.Code))
	if code == "" {
		// Generate random code
		rc, err := GenerateRedeemCode()
		if err != nil {
			return nil, fmt.Errorf("generate code: %w", err)
		}
		code = rc[:16] // Use first 16 chars
	}

	if req.BonusAmount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("bonus amount must be positive")
	}

	var pc PromoCode
	err = db.QueryRow(ctx, `
		INSERT INTO promo_codes (code, bonus_amount, max_uses, status, expires_at, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, code, bonus_amount, max_uses, used_count, status, expires_at, notes, created_at
	`, code, req.BonusAmount, req.MaxUses, PromoStatusActive, req.ExpiresAt, req.Notes).Scan(
		&pc.ID, &pc.Code, &pc.BonusAmount, &pc.MaxUses, &pc.UsedCount,
		&pc.Status, &pc.ExpiresAt, &pc.Notes, &pc.CreatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			return nil, fmt.Errorf("code already exists")
		}
		return nil, fmt.Errorf("insert promo code: %w", err)
	}

	slog.Info("promo code created", "id", pc.ID, "code", pc.Code, "bonus", pc.BonusAmount.String())
	return &pc, nil
}

// ApplyPromoCode applies a promo code for a user
func (s *PromoService) ApplyPromoCode(ctx context.Context, userID int64, code string) error {
	db, err := s.db(ctx)
	if err != nil {
		return err
	}
	code = strings.TrimSpace(strings.ToUpper(code))
	if code == "" {
		return fmt.Errorf("code is required")
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock and fetch promo code
	var pc PromoCode
	err = tx.QueryRow(ctx, `
		SELECT id, code, bonus_amount, max_uses, used_count, status, expires_at
		FROM promo_codes
		WHERE code = $1
		FOR UPDATE
	`, code).Scan(
		&pc.ID, &pc.Code, &pc.BonusAmount, &pc.MaxUses, &pc.UsedCount,
		&pc.Status, &pc.ExpiresAt,
	)
	if err == pgx.ErrNoRows {
		return fmt.Errorf("invalid promo code")
	}
	if err != nil {
		return fmt.Errorf("query promo code: %w", err)
	}

	// Validate promo code
	if !pc.CanUse() {
		if pc.Status != PromoStatusActive {
			return fmt.Errorf("promo code is disabled")
		}
		if pc.ExpiresAt != nil && time.Now().After(*pc.ExpiresAt) {
			return fmt.Errorf("promo code expired")
		}
		if pc.MaxUses > 0 && pc.UsedCount >= pc.MaxUses {
			return fmt.Errorf("promo code usage limit reached")
		}
		return fmt.Errorf("promo code not available")
	}

	// Check if user already used this code
	var existingUsage int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM promo_code_usage
		WHERE promo_code_id = $1 AND user_id = $2
	`, pc.ID, userID).Scan(&existingUsage)
	if err != nil {
		return fmt.Errorf("check existing usage: %w", err)
	}
	if existingUsage > 0 {
		return fmt.Errorf("you have already used this promo code")
	}

	// Credit balance
	resp, err := s.credit(ctx, pluginsdk.LedgerChange{
		UserID:         userID,
		Amount:         pc.BonusAmount.String(),
		RefType:        "promo_code",
		RefID:          strconv.FormatInt(pc.ID, 10),
		IdempotencyKey: fmt.Sprintf("promo_%d_%d", pc.ID, userID),
		Note:           fmt.Sprintf("优惠码 %s 赠送 ¥%s", pc.Code, pc.BonusAmount.String()),
	})
	if err != nil {
		return fmt.Errorf("credit ledger: %w", err)
	}

	// Record usage
	now := time.Now()
	_, err = tx.Exec(ctx, `
		INSERT INTO promo_code_usage (promo_code_id, user_id, bonus_amount, used_at)
		VALUES ($1, $2, $3, $4)
	`, pc.ID, userID, pc.BonusAmount, now)
	if err != nil {
		return fmt.Errorf("insert usage record: %w", err)
	}

	// Increment used count
	_, err = tx.Exec(ctx, `
		UPDATE promo_codes
		SET used_count = used_count + 1, updated_at = $1
		WHERE id = $2
	`, now, pc.ID)
	if err != nil {
		return fmt.Errorf("increment used count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	slog.Info("promo code applied",
		"promo_id", pc.ID,
		"code", pc.Code,
		"user_id", userID,
		"bonus", pc.BonusAmount.String(),
		"ledger_id", resp.LedgerID,
		"duplicate", resp.Duplicate)

	return nil
}

// ListPromoCodes lists all promo codes (admin only)
func (s *PromoService) ListPromoCodes(ctx context.Context, status string, limit, offset int) ([]PromoCode, int, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, 0, err
	}
	// Count total
	var total int
	var countQuery string
	var countArgs []any

	if status != "" {
		countQuery = `SELECT COUNT(*) FROM promo_codes WHERE status = $1`
		countArgs = []any{status}
	} else {
		countQuery = `SELECT COUNT(*) FROM promo_codes`
	}

	err = db.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count promo codes: %w", err)
	}

	// Query promo codes
	var query string
	var args []any

	if status != "" {
		query = `
			SELECT id, code, bonus_amount, max_uses, used_count, status,
				expires_at, notes, created_at
			FROM promo_codes
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []any{status, limit, offset}
	} else {
		query = `
			SELECT id, code, bonus_amount, max_uses, used_count, status,
				expires_at, notes, created_at
			FROM promo_codes
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []any{limit, offset}
	}

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query promo codes: %w", err)
	}
	defer rows.Close()

	var codes []PromoCode
	for rows.Next() {
		var pc PromoCode
		err := rows.Scan(
			&pc.ID, &pc.Code, &pc.BonusAmount, &pc.MaxUses, &pc.UsedCount,
			&pc.Status, &pc.ExpiresAt, &pc.Notes, &pc.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan promo code: %w", err)
		}
		codes = append(codes, pc)
	}

	return codes, total, nil
}

// UpdatePromoCode updates a promo code
func (s *PromoService) UpdatePromoCode(ctx context.Context, id int64, status string, maxUses int) error {
	db, err := s.db(ctx)
	if err != nil {
		return err
	}
	now := time.Now()
	result, err := db.Exec(ctx, `
		UPDATE promo_codes
		SET status = $1, max_uses = $2, updated_at = $3
		WHERE id = $4
	`, status, maxUses, now, id)
	if err != nil {
		return fmt.Errorf("update promo code: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("promo code not found")
	}

	slog.Info("promo code updated", "id", id, "status", status, "max_uses", maxUses)
	return nil
}

// DeletePromoCode deletes a promo code
func (s *PromoService) DeletePromoCode(ctx context.Context, id int64) error {
	db, err := s.db(ctx)
	if err != nil {
		return err
	}
	result, err := db.Exec(ctx, `
		DELETE FROM promo_codes WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("delete promo code: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("promo code not found")
	}

	slog.Info("promo code deleted", "id", id)
	return nil
}

// GetUserPromoUsage returns user's promo code usage history
func (s *PromoService) GetUserPromoUsage(ctx context.Context, userID int64) ([]PromoCodeUsage, error) {
	db, err := s.db(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `
		SELECT u.id, u.promo_code_id, u.user_id, u.bonus_amount, u.used_at,
			p.code
		FROM promo_code_usage u
		JOIN promo_codes p ON u.promo_code_id = p.id
		WHERE u.user_id = $1
		ORDER BY u.used_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query promo usage: %w", err)
	}
	defer rows.Close()

	var usages []PromoCodeUsage
	for rows.Next() {
		var u PromoCodeUsage
		var code string
		err := rows.Scan(
			&u.ID, &u.PromoCodeID, &u.UserID, &u.BonusAmount, &u.UsedAt, &code,
		)
		if err != nil {
			return nil, fmt.Errorf("scan promo usage: %w", err)
		}
		usages = append(usages, u)
	}

	return usages, nil
}
