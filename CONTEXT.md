# Veto

模拟联合国大会统筹平台。用户可创建完整大会，管理席位组（内阁/委员会、MPC、学团 IPC），
分配代表权限，支持常委模式（standing）和危机联动模式（crisis）之间的切换。

三种角色：**Chair**（主席/学团控制端）、**Delegate**（代表端）、**Display**（投屏端）。

## Conference（大会）

一场完整的模拟联合国大会的顶层容器。包含多个席位组、时间线，统筹管理整场活动。
旧模型中"一个委员会"的 Conference 现已降级为 standing 模式下的一类 SeatGroup 行为。

**Conference (大会)**:
整场模拟联合国活动的根实体。包含席位组列表、时间线绑定，是主席创建会议的入口。
_Avoid_: Meeting, Session, Committee

## SeatGroup（席位组）

大会下的一级组织单元。有三种类型：内阁/委员会、MPC、学团 IPC。

**SeatGroup (席位组)**:
一组 Seats 的集合，带有默认能力集（Capability）。类型决定了其在大会议事规则中的角色。
可选择性绑定到一个 Delegation。
_Avoid_: Role, Team, Group

**SeatGroup 类型**:

| 类型 | 绑定 Delegation | 模式 | 说明 |
|---|---|---|---|
| 内阁/委员会 (Cabinet) | 是 | standing ↔ crisis 可切换 | 代表国家或政治实体 |
| MPC | 否 | 固定 | 主新闻中心 |
| 学团 IPC | 否（可临时绑定） | 固定 | 推演控制中心 |

**内阁/委员会 (Cabinet)**:
既可指危机模式下的国家内阁，也可指常委模式下的多国委员会。两种模式中途可切换。
- **危机模式 (crisis)**：Seat 独立运作，各自绑定部门（海军部、情报局等），直接发送指令。
- **常委模式 (standing)**：内阁统一为国家立场，通过会议机制（发言名单、动议、表决）产出国家文件。
模式切换信号由 Chair 端发出，代表端被动接收。
_Avoid_: Committee, Council

**MPC (主新闻中心)**:
新闻的生产方。成员起草新闻草稿，提交学团审核后发布。已发布新闻可被学团撤回（从全局列表移除）。
内部可细分多家通讯社（通过 source 字段标识）。
_Avoid_: Press, Media

**学团 IPC (推演控制中心)**:
大会的控制中枢。成员能力独立灵活分配（某人处理指令、某人审核新闻、某人发布局势、某人控制会议）。
可随时绑定/取消绑定到 Delegation。
_Avoid_: Chair, Admin, Director

## Seat（席位）

**Seat (席位)**:
席位组内的具体座位。每个 Seat 绑定一个 Account，携带独立于 SeatGroup 默认值的 Capability 覆盖。
在 crisis 模式下，Seat 绑定具体部门（如"海军部长""情报局局长"）；在 standing 模式下，
Seat 代表国家代表团内的一个角色（如"德国外交部长"）。
_Avoid_: Member, User, Delegate

## Account（账号）

**Account (账号)**:
本地管理的登录凭证。一人一码（邀请码），一个账号只能在一个大会中占据一个 Seat。
先做本地管理（Chair 端预设），预留迁移至云服务的接口。
通过"邀请码 + 密码"连接会议，邀请码预先绑定 SeatGroup 和 Seat。
_Avoid_: User, Login

## Capability（能力）

**Capability (能力)**:
Seat 可执行的操作权限。SeatGroup 设默认值，Seat 级别可覆盖（开/关）。

| 能力 | 说明 |
|---|---|
| `view_conference` | 查看会议状态（发言名单、动议、投票等） |
| `draft_news` | MPC：起草新闻草稿 |
| `review_news` | 学团：审核新闻 |
| `submit_directive` | 危机模式：提交指令 |
| `process_directive` | 学团：处理指令 |
| `publish_situation` | 学团：发布局势更新 |
| `control_conference` | 控制会议流程（点名、发言、动议、投票） |
| `draft_resolution` | 常委模式：起草决议 |
| `internal_vote` | 内阁内部表决 |

_Avoid_: Permission, Right, Role

## Directive（指令）

**Directive (指令)**:
危机模式下 Seat 发出的结构化请求。有发送方和接收方，接收方审核（通过/驳回）。
驳回后可修改重发，本地保留修改记录。一条指令只能有一个接收方。
内阁之间的外交指令走同样的审核流程（接收方审核），所有指令通过"局势更新"展示最终处理结果，
不建显式指令→局势更新的因果关系。

指令字段：id、标题、发起人 Seat、发起人职务、接收方、保密等级（绝密/机密/秘密/公开）、
正文、状态（draft → submitted → approved/rejected）、所属内阁、时间戳。
_Avoid_: Order, Command, Request

## News（新闻）

**News (新闻)**:
MPC 成员起草、学团审核后发布的新闻稿。生命周期：
draft → submitted → review（学团审核）→ published / rejected。
驳回后可修改重交。已发布新闻可被撤回（从全局新闻列表移除，非软删除）。
包含 source 字段标识通讯社名称，为 MPC 内部细分预留。
_Avoid_: Article, Post, Bulletin

## SituationUpdate（局势更新）

**SituationUpdate (局势更新)**:
学团 IPC 发布的局势变化公告。关联 Timeline，全局可见（所有代表看到相同内容）。
当前阶段不考虑分内阁差异化情报。预留 `relatedBattleId` 和 `relatedLocation` 字段供未来地图集成。
_Avoid_: Event, Update, Intel

## 角色（Role）

**Chair (主席/学团控制端)**:
大会创建者和管理者。控制会议流程、处理指令、审核新闻、发布局势更新、
管理 SeatGroup/Seat 配置、控制模式切换。运行内置 WS 服务端供代表端和投屏端连接。

**Delegate (代表端)**:
代表使用的 Veto 实例。通过邀请码+密码连接主席的会议，查看同步的会议状态，
根据 Seat 的 Capability 执行操作（提交指令、起草新闻等）。
拥有与 Display 同级的实时同步能力。
_Avoid_: Client, Member

**Display (投屏端)**:
只读投影窗口（已有）。通过 WebSocket 连接 Chair，不维护自身计时器（见 ADR-0002）。
_Avoid_: Projector, Screen

## Delegation（代表团）

（保留，重新定位）

**Delegation (代表团)**:
代表一个国家或政治实体的抽象概念。SeatGroup（内阁/委员会类型）可选择绑定到 Delegation。
在 standing 模式下，Delegation 是传统会议机制中的参与者（发言、投票）。
_Avoid_: Faction, Country, Nation, Team

## SpeakerList / Motion / Voting / Caucus 等

（保留原定义，略）

以下概念属于 standing 模式下的传统会议机制，已在旧 CONTEXT.md 中定义，
此处仅保留关键术语表。详细定义见 [types-conference.ts](src/renderer/lib/types-conference.ts)。

- **SpeakerList (主发言名单)** — 有序发言队列
- **SpeakerEntry (发言条目)** — 状态机：waiting → ready → speaking → finished
- **Yield (让渡)** — 剩余时间转移
- **Motion (动议)** — 程序性提议，13 种类型
- **Caucus (磋商)** — moderated / unmoderated / individual
- **Point (问题)** — 程序性/咨询性/个人特权
- **DraftResolution (决议草案)** — 起草国+附议国，需表决
- **VotingSession (表决)** — 唱名表决，simple_majority / two_thirds
- **RollCall (点名)** — 会议出席确认

## Timeline（时间线）

（保留，重新定位）

**Timeline (时间线)**:
独立时间模拟实例。Conference 可绑定多个 Timeline（如 JCC 的快轴/慢轴/停轴）。
通过倍率控制模拟时间流速。SituationUpdate 按 Timeline 时间排序展示。
_Avoid_: Clock, Timer, Speed

## Battle（兵棋推演 / 军事推演）

**Battle (战局)**:
HOI4 风格地图推演。Conference 的下属实体，一场大会可关联多个军推（如 JCC 多轴推演）。
插件可注入静态数据（兵种、部署、事件），但不能在运行时与 Battle 交互。
预留与 SituationUpdate 的 `relatedBattleId` 关联。
_Avoid_: War, Scenario, Game

## File（文件）

**File (文件)**:
大会中产出的所有文档。包括决议草案（DraftResolution）、工作文件（Working Paper）、
修正案（Amendment）、主席团公告、会议记录（minutes）、代表立场文件（Position Paper）。
按类型分类，与会议议程平行，随时可访问。
_Avoid_: Document, Archive

## Plugin System（插件系统）

（保留，略）
