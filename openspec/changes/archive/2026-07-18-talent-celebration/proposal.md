# 展示我的天分（talent-celebration）· Proposal

## Why

听写训练目前只有逐题的对错反馈（diff / 音效），缺少正向激励：连续答对没有任何"爽点"，章节结束的结算页也只有干巴巴的数字。已备好四张"天分"梯度徽章图（洛克王国式卡通横幅），用它们构建一套轻量激励系统，让练习节奏中有可追逐的小目标、结算时有情绪化的"盖章"评定。

## What Changes

- **练习中连对阶梯**（仅逐词听写模式）：连续答对触发天分徽章弹出——连对 3 →「还不错的天分」、连对 4 →「相当好的天分」、连对 5 →「了不起的天分」（叠加 confetti 粒子）；此后每再连对 5 题（10、15、…）重复弹出「了不起」。答错时计数器静默归零。弹出为非阻塞 overlay（约 1.5s 自动消失），游戏成就标识风格：右侧偏上（顶栏下方）、小尺寸、倾斜 + 投影 + 砸入抖动动画；不影响"答对 1s 自动下一词 / 答错 Enter 继续"的既有节奏。
- **结算正确率评级**：按正确率盖章——≥80%「了不起」、≥70%「相当好」、≥60%「还不错」、<60% 不盖章。仅生效于逐词听写的章节结算页（ResultScreen）。
- **设置开关**：听写设置中新增「展示我的天分」开关，默认开启；关闭后连对弹窗与结算盖章均不出现。
- **范围限制**：仅逐词听写模式生效；普通打字练习与连播卷面均不触发。
- **资产迁移**：三张正面徽章 PNG 从 `manifests/天分/` 迁入 `src/assets/talent/` 并重命名为 ASCII 文件名（「一般般的天分」暂不使用，予以封存）。

## Capabilities

### New Capabilities

- `talent-celebration`: 听写模式下的「展示我的天分」——练习中连对阶梯弹出徽章、结算按正确率盖章评级、可配置开关。

### Modified Capabilities

（无。`listen-dictation-mode` / `continuous-dictation-sheet` 的既有需求不变，激励为叠加的新能力；若实现中发现需要改动既有 spec 行为，再补充 delta。）

## Impact

- **新增组件**：天分徽章弹出 overlay（练习中）、结算盖章展示（ResultScreen）。
- **状态**：连对计数器（挂在 Typing store 或 WordPanel 层，跨词存活、换章/答错归零）；`talentCelebrationConfigAtom` 开关（jotai + localStorage，沿用现有 `*ConfigAtom` 模式）。
- **触发点**：
  - `src/pages/Typing/components/WordPanel/components/DictationWord/index.tsx` 的 `handleSubmit` 判对/判错分支；
  - `src/pages/Typing/components/ResultScreen/`（章节结算）。
- **设置入口**：`src/pages/Typing/components/ListenDictationSwitcher/`（听写设置面板）。
- **资产**：`src/assets/talent/talent-nice.png` / `talent-great.png` / `talent-amazing.png`（迁移自 `manifests/天分/`，约 150~260KB/张，迁移时做无损压缩）。
- **依赖**：复用已有 `canvas-confetti`，无新增依赖。
