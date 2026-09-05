# Veto

模拟联合国大会统筹平台。用户创建大会（Conference），并在大会下规划多个委员会
（Committee），管理角色、席位、新闻、局势与文件，支持常委模式（standing）和危机联动模式
（crisis）之间的切换。

运行形态包括 **Host Service**（主机服务）、**Host Console**（主机控制台）、**UserClient**（用户端）和 **Display**（投屏端）。

## Conference（大会）

**Conference (大会)**:
一场完整模拟联合国活动的根实体，如“枣庄市第17届模拟联合国大会”。包含一场或多场小会议、
大会级 User、SeatAccess、角色模板、全局新闻和全局局势更新。大会本身不直接承载发言名单、
动议、表决等议事流程。
_Avoid_: Meeting, Session, ConferenceEvent

## Committee（委员会 / 会场）

**Committee (委员会 / 会场)**:
大会下的一场具体会议，如“美国内阁”“英国内阁”“MPC”。每场小会议拥有自己的主席、席位、
由获得授权的 Chair 在本地维护议程和议事状态；共享大会数据通过唯一的 Host Service 提供。发言名单、
动议、表决等议事流程属于 Chair 对 Committee 的本地主持工作，而不是 Host Service 的共享数据。
_Avoid_: Event, Conference, Cabinet, Committee Group

## SeatGroup（席位组）

大会内的席位组织单元。有三种类型：常规、MPC、IPC。

**SeatGroup (席位组)**:
一组 Seats 的集合，带有默认能力集（Capability）。类型决定了其在大会中的协作方式。
_Avoid_: Role, Team, Group

**SeatGroup 类型**:

| 类型 | 模式 | 说明 |
|---|---|---|
| 常规 (Cabinet) | standing ↔ crisis 可切换 | 议事会场 |
| MPC | 固定 | 主新闻中心 |
| IPC | 固定 | 推演控制中心 |

**常规 (Cabinet)**:
既可指危机模式下的国家内阁，也可指常委模式下的多国委员会。两种模式中途可切换。
- **危机模式 (crisis)**：Seat 独立运作，各自绑定部门（海军部、情报局等），直接发送指令。
- **常委模式 (standing)**：内阁统一为国家立场，通过会议机制（发言名单、动议、表决）产出国家文件。
模式切换和会议机制由 Chair 在本地维护，不向普通 UserClient 同步。
_Avoid_: Committee, Council

**MPC (主新闻中心)**:
新闻的生产方。成员起草新闻草稿，提交 IPC 审核后发布。已发布新闻可被 IPC 撤回（从全局列表移除）。
内部可细分多家通讯社（通过 source 字段标识）。
_Avoid_: Press, Media

**IPC (推演控制中心)**:
大会侧的推演控制会议。成员能力独立灵活分配（某人处理指令、某人审核新闻、某人发布局势、某人控制会议）。
_Avoid_: Chair, Admin, Director

## Seat（席位）

**Seat (席位)**:
委员会内、席位组中的具体参与位置，也是 Chair 本地议事状态所引用的主体。Seat 独立于使用它的人存在，
可以通过 User ID 分配给 User，并携带独立于 SeatGroup 默认值的 Capability 覆盖。Seat 名称始终描述
会场席位而非使用它的代表姓名。每个 Seat 至多分配给一个 User，分配后不交接。Conference 创建后
禁止删除 Seat，但可以改名。Chair 的本地议事数据通过 Seat ID 引用它，但不会写回 Host Service。
在 crisis 模式下，Seat 绑定具体部门（如"海军部长""情报局局长"）；在 standing 模式下，
Seat 代表一个国家或政治实体（如"德国"）。
_Avoid_: Member, User, Delegate, Delegation

**ProcedureSeatState（议事席位状态）**:
Chair 为一个受管 Committee 在本地维护的 Seat 覆盖层，包含出席状态、投票权和议事排序等流程状态。
它基于 Host Service 投影出的 Seat 身份和 ProceduralSeatProfile 工作，不改变 Seat 的身份、角色、
Capability、User 绑定或委员会归属，也不向 Host Service 或普通 UserClient 同步。
Chair 重新连接时，以当前 ChairCommitteeProjection 确定可用 Seat：仍有效 Seat 的本地流程状态保留，
新增 Seat 从默认状态开始，已不属于该 Committee 的 Seat 状态移除。
_Avoid_: Delegation, Voting Seat

**ProceduralSeatProfile（议事席位配置）**:
Host Service 持有的静态 Seat 配置，包含简称、旗帜和是否具备议事资格等信息。它只在
ChairCommitteeProjection 中提供给获授权 Chair；出席、投票权、排序和发言队列等运行中状态不属于它。
_Avoid_: Procedure State, Attendance

**UserClientSessionProjection（用户端会话投影）**:
普通 UserClient 认证后得到的最小共享大会数据投影：大会名称、自己的 Committee、自己的 Seat 身份与角色、
最终 Capability，以及被授权的内容。它不包含其他 Seat、ProcedureSeatState、议程、Battle、Participants、
User 或邀请码；内容中为展示所需的作者与 Committee 标签不构成其他 Seat 的原始资料。
_Avoid_: Full Conference Sync, Seat DTO

**AuthenticatedSeatSession（已认证席位会话）**:
UserClient 成功认证后获得的临时连接上下文，包含 UserClientSessionProjection 所需的身份与授权信息。
它不持久化，也不包含邀请码、密码摘要、其他 Seat 或完整的 Host Conference 数据。
Host Console 变更其 Capability、ChairAssignment、User、邀请码或 Committee 归属时，Host Service 会立即撤销该会话。
一个 Seat 同时至多拥有一个已认证会话；该 Seat 在另一台 UserClient 上重新登录时，原会话立即撤销并返回首页。
_Avoid_: DelegateSession, User Session, SeatAccess

## User（用户）

**User (用户)**:
大会内由 Veto 识别的自然人身份，与一个 Seat 严格一对一。User 保存自主设置的登录密码；User 不等同于
其使用的 Seat，当前也不要求跨大会或跨设备延续。User 包含代表姓名，密码为可选；未设置密码时，
邀请码本身就是完整认证凭证。Host Console 可以在误认领或遗忘密码时重置 Seat 的 User，允许重新认领。
User 由 Conference 持有，只能在认领 Seat 时创建；重置 Seat 时直接删除原 User。
_Avoid_: Account, Seat, Delegate

## SeatAccess（席位访问入口）

**SeatAccess (席位访问入口)**:
通过唯一邀请码指向一个 Seat 的本地访问入口。SeatAccess 只持有邀请码，不持有密码；首次使用邀请码时
为该 Seat 创建 User。Host Console 可以轮换邀请码，旧邀请码随即失效，而 Seat、User 与 Chair 本地议事记录保持不变。
SeatAccess 由 Conference 持有，邀请码在同一主席端保存的所有 Conference 中全局唯一。
_Avoid_: User, Account, Credential

## inviteCode（邀请码 / Key）

**inviteCode（邀请码 / Key）**:
授予持有者进入指定 Seat 权限的 4-4-4 登录凭证（代码字段 `inviteCode`，UI 中称"Key"）。
创建向导不配置它；Host Console 在席位管理中查看与批量复制。
邀请码首次使用时确定该 Seat 的 User，由 User 自主设置密码；后续使用"邀请码 + User 密码"连接席位。
密码可以留空；此时后续仅凭邀请码即可连接。邀请码只定位并授予 Seat 访问入口，密码属于 User。
_Avoid_: Password, 席位 key

## RoleTemplate（角色模板）

**RoleTemplate (角色模板)**:
大会级角色定义，包含名称与默认能力集。委员会创建席位时选择角色模板，并可在席位上覆盖具体能力。
常见模板包括常规代表、MPC 记者、IPC、观察员和 Staff。角色模板不是登录身份；席位才是代表身份。
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
| `withdraw_news` | 撤回已发布新闻 |
| `withdraw_situation` | 撤回已发布局势更新 |
| `withdraw_files` | 撤回已发布文件（功能随文件系统延期，Capability 保留） |
| `control_conference` | 进入 Chair 模式；仍须有 ChairAssignment 才能管理具体 Committee |
| `draft_resolution` | 起草决议（功能随文件系统延期，Capability 保留） |

_Avoid_: Permission, Right, Role

**ChairAssignment（主席委员会授权）**:
Host Console 授予一个拥有 `control_conference` 的 Seat 对一个 Committee 的本地主持资格。一个 Seat 至多拥有一项
ChairAssignment。只有 Capability 与 ChairAssignment 同时存在时，该 UserClient 才能取得对应 Committee 的
ChairCommitteeProjection；其目标 Committee 必须就是该 Seat 所属的 Committee。这项授权不扩大该 Seat 对
其他 Committee 的数据访问范围。
_Avoid_: Chair Role, Global Admin

## ContentAudience（内容受众）

**ContentAudience（内容受众）**:
Host Service 从内容类型和工作流状态推导出的可见主体集合，不是创作者填写的收件人字段，也不支持定向给单一 Seat。第一版已发布 News 与 SituationUpdate 固定广播至整个 Conference；Directive 只使用唯一的 DirectiveTarget；File 的路由规则随文件子系统延期。主体仍须拥有对应查看或工作流 Capability 才能取得其被授权内容；系统不再使用公开、保密或其他密级标签推断可见性。
_Avoid_: Content Scope, Classification, Security Level

**WorkflowAudience（工作流受众）**:
拥有相应审核或处理 Capability 的 Seat 对待办队列的受限访问权。它只允许查看和处理等待自己职能处理的已提交内容，
不授予普通内容列表的浏览权限，也不改变 ContentAudience。
_Avoid_: General Reader, Global Visibility

**LocalDraft（本地草稿）**:
UserClient 在明确提交前仅保存在本机的内容草稿，不属于 Host Service 的共享大会数据，也不会传输或排队重放。
明确提交成功后，Host Service 创建权威内容；被驳回内容及其后续修订由 Host Service 保存。
LocalDraft 跨同一 UserClient 的应用重启保留，并绑定原 Host、Conference 与 Seat；重新认证后的身份不匹配时，
草稿只可查看或复制，不能自动提交。
_Avoid_: Shared Draft, Offline Command

**ContentOrigin（内容来源）**:
每条指令、新闻、局势更新或文件都保留其来源 Seat 与来源 Committee。认证 Seat 创建的内容自动绑定其所属 Committee，不能伪造其他 Committee；Chair 通过 UserClient 创建内容时仍署名其认证 Seat；Host Console 不创建或发布业务内容。普通内容署名展示 Committee、Seat 展示名或角色，新闻另展示 source，且不展示 User 真实姓名。
_Avoid_: Author, Impersonation

**AuditLog（审计记录）**:
Host Service 保留共享内容与管理操作的权威历史，包括撤回原因、已取消指令和异常释放指令认领。全局审计只对 Host Console 可见；UserClient 只能查看与自身内容相关的历史。
_Avoid_: Activity Feed, User Log

**Withdrawal（撤回）**:
拥有对应 `withdraw_*` Capability 的 Seat 对已发布内容执行的、必须带原因的操作。它从普通列表移除内容但不删除权威审计记录；原作者不因创作自动获得撤回权，Host Console 也不能撤回业务内容。
_Avoid_: Delete, Edit, Unpublish

## Directive（指令）

**DirectiveTarget（指令目标）**:
一条 Directive 的唯一接收 Committee。IPC 以其 Committee ID 作为普通目标，不使用自由文本或 `ipc` 特例；
第一版不支持以单一 Seat 或 SeatGroup 为目标。目标 Committee 中拥有 `process_directive` Capability 的 Seat
按该 Committee 的指令处理规则组成 WorkflowAudience。
_Avoid_: Target Text, Seat Target, IPC String

**Directive (指令)**:
危机模式下 Seat 发出的结构化请求，有发送方、单一 DirectiveTarget 及所属 Committee。它依次处于 `submitted`、`processing`、`approved`、`rejected` 或 `cancelled` 状态；发送方只可在尚未被原子认领的 `submitted` 状态取消，取消记录审计。目标 Committee 内拥有 `process_directive` 的 Seat 由 Host Service 原子认领后处理，批准和驳回都必须附处理说明；进入 `processing` 后，只有认领者可批准或驳回，Host Console 仅可在异常时释放认领并记录审计。驳回后可修改重发，本地保留修改记录。
_Avoid_: Order, Command, Request

## News（新闻）

**News (新闻)**:
由 MPC 成员起草、带 `review_news` Capability 的 Seat 审核后发布的新闻稿，同时归属 Conference 与 Committee。未提交草稿为 LocalDraft；提交后进入 WorkflowAudience 的待审核队列，只有审核完成后才能发布或被驳回；驳回必须填写说明，驳回后可修改重交；通过只记录审核 Seat 和时间。已发布新闻固定发送至整个 Conference，不可原地修改；拥有 `withdraw_news` 的 Seat 可附原因撤回，修正以新新闻发布。
每一条已提交新闻对大会内所有拥有 `review_news` Capability 的 Seat 都可见于受限队列；首个有效审核决定结束该次审核，
并从其他审核者的待办中移除。
_Avoid_: Article, Post, Bulletin

## SituationUpdate（局势更新）

**SituationUpdate（局势更新）**:
由拥有 `publish_situation` Capability 的 IPC Seat 发布、关联 Timeline 的局势变化公告，同时归属 Conference 与 Committee；
UserClient 创建后立即发布，不进入审核队列，并固定发送至整个 Conference。已发布局势不可原地修改；拥有 `withdraw_situation` 的 Seat 可附原因撤回，修正以新局势更新发布。当前阶段不做分内阁差异化情报，预留 `relatedBattleId` 和 `relatedLocation` 供未来地图集成。
_Avoid_: Event, Update, Intel

## 角色（Role）

**Host Service（主机服务）**:
运行在一台本地主机上的权威协调服务，持有共享大会数据、认证、权限校验、命令处理与局域网实时路由；第一版同时仅暴露一个活动 Conference，并按 Conference 与 Committee 隔离数据和消息。每次重启后没有活动 Conference，必须由 Host Console 显式启动。它是共享大会数据的唯一权威来源：UserClient 只能拉取其授权范围内的数据并提交内容命令，不能在本地修改这些数据后再同步。Chair 的本地议事状态不属于 Host Service 的共享数据。
_Avoid_: Chair, Client

**Host Console（主机控制台）**:
仅在主机本机访问的管理界面，用于配置大会、管理席位与显式切换活动 Conference；它不主持会议，也不创建、发布、编辑、审核、批准、驳回或撤回业务内容。它只执行安全与故障恢复操作，例如撤销会话、重置访问、切换活动 Conference 和异常释放指令认领。
_Avoid_: UserClient, Server

**Chair (主席)**:
同时具有 `control_conference` Capability 与一项 ChairAssignment 的 UserClient 角色。Chair 以自己的 Seat 认证 Host Service，并主动取得其被授权 Committee 的 ChairCommitteeProjection；它在本地进行会议主持与议程处理，并直接向绑定的 Display 输出投影。Chair 的 Agenda 与 ProcedureSeatState 仅持久化在其本机，第一版不做跨设备迁移或接管。Chair 不等同于 Host Service 或 Host Console。

**UserClient（用户端）**:
以 Seat 身份使用的 Veto 桌面应用，涵盖代表、MPC 与 IPC 等所有用户。它通过邀请码+密码连接 Host Service 中的会议，查看同步的会议状态，
根据 Seat 的 Capability 执行操作（提交指令、起草新闻等）。普通 UserClient 只向 Host Service 传输指令、新闻和局势；断开连接时可以保留本地草稿，但不排队或稍后重放任何改变共享大会数据的命令。拥有 `control_conference` Capability 的 UserClient 是 Chair，并有额外的本地议程与 Display 职责。
_Avoid_: Delegate, Member

**Agenda（议程）**:
由 Chair 在本地用于线下主持的会议流程信息。它不向普通 UserClient 或 Host Service 同步，也不接受普通 UserClient 的状态变更；Host Service 与 Chair 对这部分只交换完成身份识别、授权和主持所需的 ChairCommitteeProjection。
_Avoid_: UserClient workflow, Remote procedure

**Display (投屏端)**:
与一个 Chair 绑定的只读投影窗口（已有）。它只直接接收 Chair 输出的展示数据，不连接 Host Service，也不维护自身计时器（见 ADR-0002）。Host Service 的权限边界止于 Chair；Chair 对其输出到 Display 的数据负责。活动 Conference 切换或 Chair 与 Host Service 断开时，Chair 必须使绑定 Display 显示断开连接，不能保留旧大会的冻结投影。
_Avoid_: Projector, Screen

**ChairCommitteeProjection（主席委员会投影）**:
Host Service 按已认证 Chair 的 Capability 与 ChairAssignment 返回的受限 Committee 席位数据，用于 Chair 在本地执行议程与会议控制。它包含 Seat 身份、角色和 ProceduralSeatProfile 等静态资料，而不包含运行中的 ProcedureSeatState。它不是普通 UserClient 的同步快照，也不授予 Chair 对其他 Committee 数据的访问权。
为支持线下主持，它还包含该 Committee 各 Seat 已绑定 User 的真实姓名；这是一项仅限获授权 Chair 的 User 数据例外。
_Avoid_: Full Conference Sync, Display Snapshot

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
- **DraftResolution (决议草案)** — 起草国+附议国，需表决；与 File 子系统一同延期，第一版不提供共享 UserClient 工作流
- **VotingSession (表决)** — 唱名表决，simple_majority / two_thirds
- **RollCall (点名)** — 会议出席确认

**Participants（参会席位）**:
一个 Committee 中由 Chair 的本地 ProcedureSeatState 纳入议事的 Seats；它们共同构成点名、发言、动议和投票的参与者集合。它不是 Host Service 向普通 UserClient 公开的集合。
_Avoid_: Delegations, Members

## Timeline（时间线）

（保留，重新定位）

**Timeline (时间线)**:
独立时间模拟实例。Conference 可绑定多个 Timeline（如 JCC 的快轴/慢轴/停轴）。
通过倍率控制模拟时间流速。SituationUpdate 按 Timeline 时间排序展示。
_Avoid_: Clock, Timer, Speed

**TimelineProjection（时间线最小投影）**:
Host Service 向拥有 `publish_situation` 的 IPC Seat 提供的局势发布上下文，只包含 Timeline ID、名称、当前模拟时间和状态；不包含 Battle、地图或议程。
_Avoid_: Battle Projection, Agenda Snapshot

## Battle（兵棋推演 / 军事推演）

**Battle (战局)**:
HOI4 风格地图推演。Conference 的下属实体，一场大会可关联多个军推（如 JCC 多轴推演）。
插件可注入静态数据（兵种、部署、事件），但不能在运行时与 Battle 交互。
预留与 SituationUpdate 的 `relatedBattleId` 关联。
_Avoid_: War, Scenario, Game

## File（文件）

**File (文件)**:
大会中产出的文档，同时归属 Conference 与 Committee，并至少带有来源委员会、文件类型、可选议程项、作者与创建时间。文件子系统当前不在实现范围内，因而不预设其路由规则；相关 Capability（包括 `withdraw_files`）继续可见、可配置，具备这些 Capability 的 UserClient 显示尚未开放的文件区域。
_Avoid_: Document, Archive

## Plugin System（插件系统）

（保留，略）
