# 展示我的天分 · Tasks

## 1. 资产与工具函数

- [x] 1.1 将「还不错/相当好/了不起」三张图压缩后迁入 `src/assets/talent/`（实际转为 WebP：`talent-nice.webp` / `talent-great.webp` / `talent-amazing.webp`，各约 20KB），`manifests/天分/` 原图保留
- [x] 1.2 新建 `src/utils/talentCelebration.ts`：`TalentLevel` 类型、`getStreakLevel`、`getAccuracyLevel`、等级 → 图片/文案映射（含 `preloadTalentImages`）
- [x] 1.3 新建 `src/utils/talentCelebration.test.ts`：覆盖 streak 3/4/5/6/9/10/15 与正确率 0/59.9/60/70/79.9/80/100、total=0 等边界（8 测试通过）

## 2. 配置开关

- [x] 2.1 `ListenDictationConfig` 增加 `talentCelebration: boolean`（默认 `true`），更新 `src/typings` 与 `listenDictationConfigAtom` 默认值
- [x] 2.2 在 `ListenDictationSwitcher` 面板加「展示我的天分」开关 UI（听写设置内，普通/连播两形态均可见）

## 3. 连对徽章（逐词听写）

- [x] 3.1 新建 `TalentBadgeOverlay` 组件：非阻塞 fixed 层、游戏成就标识风格（右侧偏上顶栏下方、小尺寸、倾斜 + 投影、砸入抖动衰减 + 淡出约 1.5s）、`amazing` 触发 confetti、动画结束回调卸载、新徽章替换旧徽章（key 重挂载）
- [x] 3.2 在 WordPanel 层实现连对计数（useRef + 换章/换词典/复习模式/听写开关切换时重置），`DictationWord` 判对/判错时经 `onResult` 上报；达阈值且开关开启时渲染 overlay
- [x] 3.3 验证：overlay 为 `pointer-events-none` 且不触碰焦点（DictationWord 焦点逻辑零改动）；`onResult` 同步上报、`onFinish` 1s 节奏不变；`onResult` 仅接入 DictationWord，打字模式（WordComponent）无触发路径

## 4. 结算盖章

- [x] 4.1 新建 `TalentStamp` 组件：静态盖章 + 一次性 scale 盖章入场动画（`animate` prop 控制是否重播）
- [x] 4.2 ResultScreen 接入：听写模式且开关开启时按章节错词数算正确率、盖章于卡片左上角，<60% 不渲染
- [x] 4.3 ~~ContinuousDictationSheet 接入~~（2026-07-18 用户确认连播卷面不需要天分展示，已实现后撤销）

## 5. 收尾

- [x] 5.1 三张徽章图预加载（`preloadTalentImages`，在听写模式开启且开关打开时于 WordPanel / 卷面组件触发一次）
- [x] 5.2 `yarn test`：85 通过 / 2 失败（`pipeline.integration.test.mjs` 为既有失败，与本变更无关，stash 验证过）；改动文件 ESLint 0 error；`yarn build` 成功。暗色模式视觉效果留待用户在浏览器实际过一遍
- [x] 5.3 更新 `openspec/explore/training-enhancements-backlog.md`：「三连对庆祝」条目改为指向本 change 的最终方案
