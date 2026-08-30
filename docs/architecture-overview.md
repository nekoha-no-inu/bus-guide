# bus-guide 設計ドキュメント（全体構造）

## 1. 目的と概要
このアプリは、家庭内の生活支援を1つにまとめたクライアントサイドWebアプリです。
主な機能は、バス案内、時刻表、天気、ゴミ収集、共有メモ、買い物リスト、ToDo、スケジューラー、タイマー/アラーム、家計簿、行きたい場所管理です。

構成は「1ページ1機能」のマルチページ構成で、共通UI（キャラクター吹き出し）と共通ユーティリティを各ページで共有します。

## 2. 技術スタック
- フロントエンド: HTML + CSS + Vanilla JavaScript
- データ保存: Firebase Firestore（compat SDK）
- 外部API:
  - Open-Meteo（天気）
  - Google Calendar API（日本祝日）
  - Transit API（バス乗換: API優先、失敗時はCSVフォールバック）
- PWA:
  - manifest: manifest.json
  - service worker: service-worker.js（現状は no-op fetch）

## 3. ディレクトリ構成
- 画面
  - home.html, transfer.html, timetable.html, weather.html, garbage.html
  - memo.html, shopping.html, todo.html, scheduler.html
  - alarm.html, kakeibo.html, kakeibo-input.html, kakeibo-detail.html, places.html
  - index.html（home.html へリダイレクト）
- スクリプト
  - js/common.js（共通ロジック）
  - js/firebase.js（Firebase初期化）
  - js/*.js（機能別ロジック）
- データ
  - data/conversation.json（セリフ定義）
  - data/routes.csv, data/schedules.csv（バスデータ）
- スタイル
  - css/style.css
- 画像
  - img/character_*.png, img/weather/*, img/icon-192.png, img/icon-512.png

## 4. レイヤ構成
### 4.1 UIレイヤ
各HTMLが画面骨組みを持ち、対応する機能別JSがDOMを更新します。

### 4.2 共通アプリレイヤ
common.js が以下を提供します。
- キャラクター画像の初期化と表情切替
- 吹き出し表示（1文字ずつ表示、最終サイズ固定、instant表示対応）
- conversation.json からのメッセージ取得・テンプレート変数置換
- 天気コード変換
- ホーム画面タップリアクション
- Service Worker 登録

### 4.3 機能レイヤ
各機能JSが、画面固有の業務ロジックを担当します（バス探索、家計簿集計、予定管理など）。

### 4.4 データレイヤ
- Firestore: メモ、買い物、ToDo、スケジュール、家計簿、行きたい場所
- ローカルファイル: 会話文JSON、CSV時刻表
- localStorage: scheduler から home へのリマインダー連携（homeReminder）

## 5. 主要な依存関係
- Firebaseを使うページは次の読み込み順を前提とします。
  1) Firebase SDK
  2) js/common.js
  3) js/firebase.js
  4) 機能別JS

- 会話UIを使うページは js/common.js と #bubble / #character 要素を前提にします。

## 6. ページと機能の対応
- ホーム: home.html + js/home.js
- バス乗換案内: transfer.html + js/transfer.js
- バス時刻表: timetable.html + js/timetable.js
- 天気: weather.html + js/weather.js
- ゴミ収集: garbage.html + js/garbage.js
- 共有メモ: memo.html + js/memo.js
- 買い物: shopping.html + js/shopping.js
- ToDo: todo.html + js/todo.js
- スケジューラー: scheduler.html + js/scheduler.js
- タイマー/アラーム: alarm.html + js/timer.js + js/alarm.js
- 家計簿一覧: kakeibo.html + js/kakeibo.js
- 家計簿入力: kakeibo-input.html + js/kakeibo.js
- 家計簿明細: kakeibo-detail.html + js/kakeibo.js
- 行きたい場所: places.html + js/places.js

## 7. 代表フロー
### 7.1 セリフ表示フロー
1. 各機能JSが getMessage(...) で文言を取得
2. setBubbleSpeech(...) または setCharacterSpeech(...) で表示
3. common.js がタイプライター表示と吹き出しサイズ固定を実行

### 7.2 予定リマインダー連携
1. scheduler.js が当日/翌日の未完了予定を集計
2. home向け文言を生成し localStorage.homeReminder に保存
3. home.js が起動時に homeReminder を優先表示

### 7.3 バス検索
1. transfer.js が routes.csv + schedules.csv をロード（停留所名の互換変換を含む）
2. 日付から平日/土曜/休日ダイヤを決定（祝日API併用）
3. Transit API による経路候補取得を試行
4. API失敗・0件時はCSV探索ロジックへ自動フォールバック
5. 候補便を探索し、最適候補と系統別候補を表示

## 8. 状態管理の方針
- 画面内一時状態: 各機能JS内のグローバル変数で保持
- 永続状態:
  - Firestore（主データ）
  - localStorage（軽量連携データ）
- サーバーサイドは持たず、ブラウザ実行中心

## 9. PWA構成
- manifest.json でアプリ名・テーマ色・アイコンを定義
- service-worker.js は install/activate/fetch を持つ最小構成
- オフラインキャッシュ戦略は現時点では未実装

## 10. 現在の設計上の注意点
- kakeibo.html / kakeibo-input.html が js/kakeibo-initial-data.js を参照しているが、現ワークスペースに同ファイルは存在しない。
- js/transfer2.js は存在するが transfer.html では未使用（実運用は js/transfer.js）。

## 11. 拡張時のガイド
- 新ページ追加時は、#bubble と #character を置き、common.jsの共通UIを活用する。
- Firestore利用ページは既存の読み込み順を守る。
- 会話文は data/conversation.json に集約し、文言ハードコードを避ける。
- 外部API失敗時のフォールバックメッセージを必ず持つ。
