package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// testStore は FileStore と PostgresStore の両方で同じことを確かめる。
// PostgresStore は環境変数 TEST_DATABASE_URL があるときだけテストする（例: postgres://localhost:5432/blackbox_test）。
// 注意: テストのたびに responses テーブルを空にするので、本番の DB を指定しないこと。
func testStore(t *testing.T, newStore func(t *testing.T) Store) {
	t.Run("空のとき", func(t *testing.T) {
		all, err := newStore(t).All()
		if err != nil || len(all) != 0 {
			t.Fatalf("All() = %v, %v; want empty", all, err)
		}
	})

	t.Run("保存して読み出す", func(t *testing.T) {
		s := newStore(t)
		b := "B"
		t0 := time.Date(2026, 11, 25, 9, 0, 0, 0, time.UTC)
		in := []Response{
			{ID: "a", Dataset: &b, Pre: Answers{4, 1, 2}, Post: Answers{2, 4, 5}, CreatedAt: t0},
			{ID: "b", Dataset: nil, Pre: Answers{2, 3, 2}, Post: Answers{2, 4, 3}, CreatedAt: t0.Add(time.Minute)},
		}
		for _, r := range in {
			if err := s.Add(r); err != nil {
				t.Fatal(err)
			}
		}
		got, err := s.All()
		if err != nil {
			t.Fatal(err)
		}
		if len(got) != 2 {
			t.Fatalf("len = %d, want 2", len(got))
		}
		if got[0].ID != "a" || *got[0].Dataset != "B" || got[0].Pre != in[0].Pre || got[0].Post != in[0].Post || !got[0].CreatedAt.Equal(t0) {
			t.Errorf("got[0] = %+v", got[0])
		}
		if got[1].ID != "b" || got[1].Dataset != nil {
			t.Errorf("got[1] = %+v", got[1])
		}
	})

	t.Run("同じidは二重に保存しない", func(t *testing.T) {
		s := newStore(t)
		r := Response{ID: "dup", Pre: Answers{1, 1, 1}, Post: Answers{1, 1, 1}, CreatedAt: time.Now()}
		r2 := r
		r2.Pre = Answers{5, 5, 5} // 2回目は内容が違っても無視される
		for _, x := range []Response{r, r2} {
			if err := s.Add(x); err != nil {
				t.Fatal(err)
			}
		}
		all, err := s.All()
		if err != nil {
			t.Fatal(err)
		}
		if len(all) != 1 || all[0].Pre != r.Pre {
			t.Errorf("All() = %+v, want only the first response", all)
		}
	})
}

func TestFileStore(t *testing.T) {
	testStore(t, func(t *testing.T) Store {
		return NewFileStore(filepath.Join(t.TempDir(), "responses.jsonl"))
	})
}

func TestPostgresStore(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL が未設定なのでスキップ")
	}
	testStore(t, func(t *testing.T) Store {
		s, err := NewPostgresStore(context.Background(), url)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(s.Close)
		if _, err := s.pool.Exec(context.Background(), "TRUNCATE responses"); err != nil {
			t.Fatal(err)
		}
		return s
	})

	t.Run("RLSが有効になっている", func(t *testing.T) {
		s, err := NewPostgresStore(context.Background(), url)
		if err != nil {
			t.Fatal(err)
		}
		defer s.Close()
		var enabled bool
		if err := s.pool.QueryRow(context.Background(),
			"SELECT relrowsecurity FROM pg_class WHERE oid = 'responses'::regclass").Scan(&enabled); err != nil {
			t.Fatal(err)
		}
		if !enabled {
			t.Error("responses テーブルの RLS が無効です")
		}
	})

}
