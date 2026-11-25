# フロントのビルド → Go のビルド → 小さな実行用イメージ、の3段階。
# このイメージ1つでフロントも API も配信する（STATIC_DIR）。

# 1. フロントエンド（web/dist を作る）
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2. Go サーバー
FROM golang:1-alpine AS server
WORKDIR /server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /app .

# 3. 実行用
FROM alpine:3
RUN apk add --no-cache ca-certificates && adduser -D -H app
COPY --from=server /app /app
COPY --from=web /web/dist /static
ENV STATIC_DIR=/static PORT=8080
USER app
EXPOSE 8080
CMD ["/app"]
