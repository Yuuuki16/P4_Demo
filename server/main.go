package main

import (
	"context"
	"log"
	"net/http"
	"os"
)

// 環境変数
//
//	PORT           待ち受けるポート（デフォルト 8080）
//	DATABASE_URL   指定すると、回答を PostgreSQL に保存する（例: postgres://user:pass@host:5432/db）
//	DATA_FILE      DATABASE_URL がないときに回答を保存するファイル（デフォルト responses.jsonl）
//	STATIC_DIR     指定すると、ビルド済みのフロント（web/dist）も同じサーバーから配信する
//	ALLOWED_ORIGIN フロントを別ドメインに置くときに許可するオリジン（例: https://example.vercel.app）
func main() {
	port := getenv("PORT", "8080")

	var store Store
	if url := os.Getenv("DATABASE_URL"); url != "" {
		pg, err := NewPostgresStore(context.Background(), url)
		if err != nil {
			log.Fatalf("database: %v", err)
		}
		store = pg
		log.Printf("storage: PostgreSQL")
	} else {
		path := getenv("DATA_FILE", "responses.jsonl")
		store = NewFileStore(path)
		log.Printf("storage: file %s", path)
	}

	mux := http.NewServeMux()
	NewServer(store).Routes(mux)

	if dir := os.Getenv("STATIC_DIR"); dir != "" {
		mux.Handle("/", http.FileServer(http.Dir(dir)))
	}

	handler := withCORS(os.Getenv("ALLOWED_ORIGIN"), mux)
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func withCORS(origin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin != "" && r.Header.Get("Origin") == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
