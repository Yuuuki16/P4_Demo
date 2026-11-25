package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresStore は回答を PostgreSQL の responses テーブルに保存する。
// 環境変数 DATABASE_URL が設定されているときに使われる（main.go）。
type PostgresStore struct {
	pool *pgxpool.Pool
}

// 1回の DB 操作にかけてよい最大時間。
const dbTimeout = 5 * time.Second

const createTableSQL = `
CREATE TABLE IF NOT EXISTS responses (
	id              TEXT        PRIMARY KEY,
	dataset         TEXT,
	pre_scary       SMALLINT    NOT NULL,
	pre_understand  SMALLINT    NOT NULL,
	pre_fixable     SMALLINT    NOT NULL,
	post_scary      SMALLINT    NOT NULL,
	post_understand SMALLINT    NOT NULL,
	post_fixable    SMALLINT    NOT NULL,
	created_at      TIMESTAMPTZ NOT NULL
)`

// NewPostgresStore は DB に接続し、テーブルがなければ作る。
func NewPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	if _, err := pool.Exec(ctx, createTableSQL); err != nil {
		pool.Close()
		return nil, fmt.Errorf("create table: %w", err)
	}
	return &PostgresStore{pool: pool}, nil
}

func (s *PostgresStore) Close() { s.pool.Close() }

// Add は回答を1件保存する。同じ id がすでにあれば何もしない（送信の再試行で二重に数えないため）。
func (s *PostgresStore) Add(r Response) error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO responses (
			id, dataset,
			pre_scary, pre_understand, pre_fixable,
			post_scary, post_understand, post_fixable,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO NOTHING`,
		r.ID, r.Dataset,
		r.Pre.Scary, r.Pre.Understand, r.Pre.Fixable,
		r.Post.Scary, r.Post.Understand, r.Post.Fixable,
		r.CreatedAt,
	)
	return err
}

// All は保存されている回答を古い順にすべて返す。
func (s *PostgresStore) All() ([]Response, error) {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		SELECT
			id, dataset,
			pre_scary, pre_understand, pre_fixable,
			post_scary, post_understand, post_fixable,
			created_at
		FROM responses
		ORDER BY created_at, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Response
	for rows.Next() {
		var r Response
		if err := rows.Scan(
			&r.ID, &r.Dataset,
			&r.Pre.Scary, &r.Pre.Understand, &r.Pre.Fixable,
			&r.Post.Scary, &r.Post.Understand, &r.Post.Fixable,
			&r.CreatedAt,
		); err != nil {
			return nil, err
		}
		r.CreatedAt = r.CreatedAt.UTC()
		out = append(out, r)
	}
	return out, rows.Err()
}
