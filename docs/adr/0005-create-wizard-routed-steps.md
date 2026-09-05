# 0005. 创建大会向导按步骤拆分为独立路由，草稿收归 rune store

## 状态

已接受

## 背景

创建大会向导曾以单文件 + currentStep 分支实现（约 538 行，/conference/create），
五步（大会信息/会场规划/角色权限/席位分配/确认创建）共享页面内 $state，步骤跳转不受
校验约束，左侧步骤条可任意跳步；能力清单、默认角色等数据也埋在页面里。应用为
Electron 纯客户端（无 URL 输入入口，无深链），但流程路由化后各步职责清晰、
入口/跳步守卫可统一收口，也为未来"编辑大会"复用草稿模型留出空间。

## 决策

- /conference/create 改为目录路由：+layout.svelte 承载步骤条与进退按钮；
  +page.svelte 为入口，加载时自动跳转第一个未完成步骤；五个子路由
  info | meetings | roles | seats | review 各渲染一步的表单。
- 草稿与每步校验集中到 rune store：stores/runes/create-conference-event-wizard.svelte.ts
  （新增 stores/runes/ 目录，作为 rune 系 store 的约定位置，区别于旧式 writable store）。
  草稿仅存内存，刷新即清空，与重构前行为一致；localStorage 草稿为未来独立增量。
- 前进守卫 = 点击"下一步/步骤条"时校验当前步，失败则内联标错并聚焦首错；
  不做页面加载级重定向（Electron 无深链，无法直达 URL）。
- 能力清单真源化：Capability 中文标签收敛为 types 层 CAPABILITY_LABELS，
  创建向导与席位管理两编辑器统一消费，删除类型外幽灵值 internal_vote。
- 创建成功后 goto /conference/{首个会议 id}/settings（大会总览：小会议与 Key），
  并重置草稿。settings 页经 conference_id → conference.eventId 解析大会。

## 后果

每个步骤页只做渲染，流程与校验状态在 store 中可测可复用；后续"编辑大会"或
localStorage 草稿可复用同一草稿模型。旧单文件向导被删除，无历史 URL 依赖
（Electron 无外链）。能力清单的多份拷贝被消灭，标签以 CONTEXT.md 术语为口径。
