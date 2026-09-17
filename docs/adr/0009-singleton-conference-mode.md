# 0009. 单例大会模式复用 Conference 领域并绕过 Host Service

## 状态

已接受

## 背景

原“大会模式”服务大型会议，流程包含角色模板、席位访问邀请、Host Service、
LAN 发布和 Host Console。单例模式聚焦一场属于大会概念的会议，不需要分配
角色和席位访问；但主持会议仍需要席位来表达出席、发言和投票等议事程序。

## 决策

- `Conference.mode` 新增 `conference | singleton`；旧数据缺省为 `conference`，
  保证既有大会行为不变。
- 创建向导第一步选择模式。单例模式隐藏角色步骤，只允许一个 Cabinet 委员会，
  支持可选议程和席位投票权；席位投票权缺省为“有”。
- 单例创建时复用本地 `Conference`、`Committee` 和 `Seat` 模型，但不生成角色
  模板与席位邀请码，也不启动或发布 Host Service。
- 首页单例卡片从 Host 组织者入口直接进入既有
  `/client/{conferenceId}/committee/{committeeId}` 议程控制路由。
- Client 端该路由按模式裁剪：隐藏与大会角色、席位访问和 Host Service 相关的
  控制，保留议程、席位和议事流程控制；点名跳转到既有 Client 点名路由。

## 后果

单例模式不引入新的 Committee 路由和重复控制面板，创建完成后可立即在 Client
主持会议。代价是 Client 页面需要维护模式分支；后续单例细节不得访问 Host
Service 的运行状态，否则会重新耦合两条会议形态。
