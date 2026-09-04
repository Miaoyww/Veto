# Veto

模拟联合国大会统筹平台。用户创建大会（Conference），并在大会下规划多个委员会
（Committee），管理角色、席位、新闻、局势与文件，支持常委模式（standing）和危机联动模式
（crisis）之间的切换。

三种角色：**Chair**（主席/学团控制端）、**Delegate**（代表端）、**Display**（投屏端）。

## Conference（大会）

**Conference (大会)**:
一场完整模拟联合国活动的根实体，如“枣庄市第17届模拟联合国大会”。包含一场或多场小会议、
大会级 User、SeatAccess、角色模板、全局新闻和全局局势更新。大会本身不直接承载发言名单、
动议、表决等议事流程。
_Avoid_: Meeting, Session, ConferenceEvent

## Committee（委员会 / 会场）

**Committee (委员会 / 会场)**:
大会下的一场具体会议，如“美国内阁”“英国内阁”“MPC”。每场小会议拥有自己的主席、席位、
议事状态与局域网服务。发言名单、动议、表决等议事流程属于委员会。
_Avoid_: Event, Conference, Cabinet, Committee Group

## SeatGroup（席位组）

大会内的席位组织单元。有三种类型：内阁/委员会、MPC、学团 IPC。

**SeatGroup (席位组)**:
一组 Seats 的集合，带有默认能力集（Capability）。类型决定了其在大会中的协作方式。
_Avoid_: Role, Team, Group

**SeatGroup 类型**:

| 类型 | 模式 | 说明 |
|---|---|---|
| 内阁/委员会 (Cabinet) | standing ↔ crisis 可切换 | 议事会场 |
| MPC | 固定 | 主新闻中心 |
| 学团 IPC | 固定 | 推演控制中心 |

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
大会侧的推演控制会议。成员能力独立灵活分配（某人处理指令、某人审核新闻、某人发布局势、某人控制会议）。
_Avoid_: Chair, Admin, Director

## Seat（席位）

**Seat (席位)**:
委员会内、席位组中的具体参与位置，也是点名、发言、动议和投票的主体。Seat 独立于使用它的人存在，
可以通过 User ID 分配给 User，并携带独立于 SeatGroup 默认值的 Capability 覆盖。Seat 名称始终描述
会场席位而非使用它的代表姓名。每个 Seat 至多分配给一个 User，分配后不交接。Conference 创建后
禁止删除 Seat，但可以改名。议事数据通过 Seat ID 引用它。
在 crisis 模式下，Seat 绑定具体部门（如"海军部长""情报局局长"）；在 standing 模式下，
Seat 代表一个国家或政治实体（如"德国"）。
_Avoid_: Member, User, Delegate, Delegation

**Procedure（议事状态）**:
Seat 上可选的议事参与状态，包含简称、旗帜、出席状态、投票权与议事排序。参与议事的 Seat 拥有
Procedure；MPC 和学团 IPC 的 Seat 不拥有 Procedure。
_Avoid_: Delegation, Voting Seat

**SeatView（席位视图）**:
供界面、投屏和网络同步使用的安全席位投影，仅包含相应场景需要展示的席位信息，不包含邀请码、
密码摘要或 User 信息。
_Avoid_: PublicSeat, Seat DTO

**AuthenticatedSeatSession（已认证席位会话）**:
代表端成功认证后获得的临时连接上下文，包含 Conference、SeatView、SeatGroup、UserView 和最终解析出的
Capability。它不持久化，也不包含邀请码、密码摘要或完整 Seat。
_Avoid_: DelegateSession, User Session, SeatAccess

## User（用户）

**User (用户)**:
大会内由 Veto 识别的自然人身份，与一个 Seat 严格一对一。User 保存自主设置的登录密码；User 不等同于
其使用的 Seat，当前也不要求跨大会或跨设备延续。User 包含代表姓名，密码为可选；未设置密码时，
邀请码本身就是完整认证凭证。主席可以在误认领或遗忘密码时重置 Seat 的 User，允许重新认领。
User 由 Conference 持有，只能在认领 Seat 时创建；重置 Seat 时直接删除原 User。
_Avoid_: Account, Seat, Delegate

## SeatAccess（席位访问入口）

**SeatAccess (席位访问入口)**:
通过唯一邀请码指向一个 Seat 的本地访问入口。SeatAccess 只持有邀请码，不持有密码；首次使用邀请码时
为该 Seat 创建 User。主席可以轮换邀请码，旧邀请码随即失效，而 Seat、User 与议事记录保持不变。
SeatAccess 由 Conference 持有，邀请码在同一主席端保存的所有 Conference 中全局唯一。
_Avoid_: User, Account, Credential

## inviteCode（邀请码 / Key）

**inviteCode（邀请码 / Key）**:
授予持有者进入指定 Seat 权限的 4-4-4 登录凭证（代码字段 `inviteCode`，UI 中称"Key"）。
创建向导不配置它；Chair 端在 settings/席位管理中查看与批量复制。
邀请码首次使用时确定该 Seat 的 User，由 User 自主设置密码；后续使用"邀请码 + User 密码"连接席位。
密码可以留空；此时后续仅凭邀请码即可连接。邀请码只定位并授予 Seat 访问入口，密码属于 User。
_Avoid_: Password, 席位 key

## RoleTemplate（角色模板）

**RoleTemplate (角色模板)**:
大会级角色定义，包含名称与默认能力集。委员会创建席位时选择角色模板，并可在席位上覆盖具体能力。
常见模板包括常规代表、MPC 记者、观察员、学团控制者。角色模板不是登录身份；席位才是代表身份。
_Avoid_: Role, Permission, Account

## Capability（能力）

**Capability (能力)**:
Seat 可执行的操作权限。SeatGroup 设默认值，Seat 级别可覆盖（开/关）。

| 能力 | 说明 |
|---|---|
| `view_conference` | 查看会议状态 |
| `view_situation` | 查看全局局势 |
| `view_news` | 查看全局新闻 |
| `view_files` | 查看文件 |
| `draft_news` | 起草新闻草稿 |
| `review_news` | 审核新闻 |
| `submit_directive` | 提交指令 |
| `process_directive` | 处理指令 |
| `send_files` | 发送文件 |
| `publish_situation` | 发布局势更新 |
| `control_conference` | 控制会议流程 |
| `draft_resolution` | 起草决议 |

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
属于大会层的全局新闻稿，由 MPC 成员起草、学团审核后发布。生命周期：
draft → submitted → review（学团审核）→ published / rejected。
驳回后可修改重交。已发布新闻可被撤回（从全局新闻列表移除，非软删除）。
包含 source 字段标识通讯社名称，为 MPC 内部细分预留。
_Avoid_: Article, Post, Bulletin

## SituationUpdate（局势更新）

**SituationUpdate (局势更新)**:
属于大会层的全局局势变化公告，由学团 IPC 发布。关联 Timeline，所有委员会中的代表看到相同内容。
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

**Participants（参会席位）**:
一个 Committee 中所有拥有 Procedure 的 Seats；它们共同构成点名、发言、动议和投票的参与者集合。
_Avoid_: Delegations, Members

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
文件由大会统一存储，并带有来源委员会等标签。委员会通过大会请求属于自己的文件视图；
默认不能看到其他委员会来源的文件。按类型分类，与会议议程平行，随时可访问。
_Avoid_: Document, Archive

## Plugin System（插件系统）

（保留，略）
