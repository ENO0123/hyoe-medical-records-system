# GitHubリポジトリ作成手順

このプロジェクトをGitHubリポジトリとして作成し、Railwayでデプロイできるようにする手順です。

## 前提条件

- GitHubアカウントを持っていること
- RailwayとGitHubが既に連携していること

## 手順

### ステップ1：GitHubでリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」アイコン → 「New repository」をクリック
3. リポジトリ情報を入力：
   - **Repository name**: `medical-records-system`（任意の名前でOK）
   - **Description**: `電子カルテシステム`（任意）
   - **Visibility**: Private または Public を選択
   - **Initialize this repository with**: チェックを外す（既存のコードをプッシュするため）
4. 「Create repository」をクリック

### ステップ2：ローカルでGitリポジトリを初期化

ターミナルで以下を実行してください：

```bash
# プロジェクトディレクトリに移動
cd "/Users/ryoenomoto/work/11_兵衛/電子カルテ"

# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: 電子カルテシステム"

# GitHubリポジトリをリモートとして追加
# YOUR_USERNAME を実際のGitHubユーザー名に置き換えてください
git remote add origin https://github.com/YOUR_USERNAME/medical-records-system.git

# ブランチ名をmainに設定
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

**注意：** `YOUR_USERNAME` の部分を実際のGitHubユーザー名に置き換えてください。

### ステップ3：プッシュが完了したら確認

1. GitHubのリポジトリページを開く
2. ファイルが正しくアップロードされているか確認
3. `railway.json`、`Dockerfile`、`.dockerignore` が含まれているか確認

### ステップ4：Railwayでリポジトリを選択

1. [Railwayダッシュボード](https://railway.app)にアクセス
2. 「New Project」をクリック
3. 「Deploy from GitHub repo」を選択
4. 作成したリポジトリ（`medical-records-system`）を選択
5. ブランチを選択（`main`）
6. デプロイが開始されます

## トラブルシューティング

### プッシュ時に認証エラーが出る場合

GitHubの認証方法を確認してください：

**方法1：HTTPS + Personal Access Token（推奨）**
```bash
# ユーザー名とパスワードの代わりにPersonal Access Tokenを使用
git push -u origin main
# Username: YOUR_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN（GitHubのSettings > Developer settings > Personal access tokensで作成）
```

**方法2：SSHキーを使用**
```bash
# SSH URLを使用
git remote set-url origin git@github.com:YOUR_USERNAME/medical-records-system.git
git push -u origin main
```

### ファイルが大きすぎてプッシュできない場合

`.gitignore` に大きなファイルや不要なファイルが含まれているか確認してください。

### 既にGitリポジトリが存在する場合

```bash
# 既存のリモートを確認
git remote -v

# 既存のリモートを削除して新しく追加
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/medical-records-system.git
```

## 次のステップ

GitHubへのプッシュが完了したら：

1. Railwayでリポジトリを選択
2. データベースサービスを追加
3. 環境変数を設定
4. デプロイとデータベース初期化

詳細は `Railway構築手順.md` を参照してください。
