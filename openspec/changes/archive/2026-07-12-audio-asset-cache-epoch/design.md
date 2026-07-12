## Context

自定义词库音频位于 `public/audio/**`，经 GitHub Pages 分发。浏览器 HTTP 缓存可能按路径长期保留旧 MP3。此前用构建 hash 给所有静态资源加 `v=`，导致「每次发版都失效音频缓存」，且无法表达「这次只想刷音频」。

## Goals / Non-Goals

**Goals**

- 开发者可主动递增世代号，强制用户拉新音频
- 日常代码发版不改变音频 URL 的世代参数，便于复用缓存
- 不清除练习记录 / 错题本（IndexedDB）

**Non-Goals**

- 不做终端用户「一键清音频」设置页
- 不改 CDN / GitHub Pages 服务端 Cache-Control

## Decisions

1. **单一常量 `AUDIO_ASSET_EPOCH`**（`src/utils/cacheBust.ts`）

   - 音频 URL：`?av=<epoch>`
   - 非音频同源资源：仍用 `?v=<git hash>`

2. **世代切换钩子**（`deployServiceWorker.ts`）

   - `localStorage` 记录上次 epoch
   - 变化时 `caches.keys()` 全删 Cache Storage（当前 SW 几乎不缓存音频，作为兜底）
   - 不调用 Dexie / IndexedDB 清理

3. **预加载**
   - `fetch(..., { cache: 'no-cache' })`：允许协商，避免 `force-cache` 粘死旧实体

## 运维手册（以后怎么用）

1. 本地重切并提交 `public/audio/**`
2. 将 `AUDIO_ASSET_EPOCH` 改成新值（建议日期，如 `20260712-hq`）
3. 提交、推送、等 Pages 部署
4. 用户刷新后自动带新 `av=`，拉到新文件

若只改 UI/逻辑、音频不变：**不要**改 `AUDIO_ASSET_EPOCH`。

## Risks / Trade-offs

- Cache Storage 全清可能顺带清掉其它 Cache API 条目（本项目 SW 几乎不用，可接受）
- 忽略 query 的中间代理仍可能忽略 `av=`（罕见；必要时再改路径前缀）
