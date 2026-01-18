FROM node:20-alpine AS base

# pnpmの有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依存関係のインストール
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 本番環境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 本番用の依存関係のみインストール
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public

# ポートを公開
EXPOSE 3000

# アプリケーションを起動
CMD ["node", "dist/index.js"]
