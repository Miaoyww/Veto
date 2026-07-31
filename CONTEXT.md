# Veto

模拟联合国会议与军事推演系统。用户作为会议主席，管理代表团、主持辩论、
处理动议、组织投票，并可切换到地图界面进行兵棋推演。

## Conference（模拟大会）

Model UN 风格的会议模拟。一场会议包含多个代表团，按议事规则进行辩论、
磋商和投票。

**Conference (大会)**:
一场模拟联合国会议。包含代表团列表、议题、发言名单、动议、决议草案和投票记录。
会议有生命周期阶段（phase），从点名开始，到闭幕结束。
_Avoid_: Meeting, Session

**Delegation (代表团)**:
代表一个国家或组织的参会实体。有全名、简称、出席状态和投票权。
投票权为 false 的代表团视为观察员，不计入表决基数。
_Avoid_: Faction, Country, Nation, Team

**AgendaItem (议题)**:
会议讨论的议题。每个议题有标题和描述，关联决议草案。
_Avoid_: Topic, Subject

**SpeakerList (主发言名单)**:
有序的发言队列。代表团依次加入，按顺序发言。每个发言人分配固定时间。
_Avoid_: Speaking Queue, Roster

**SpeakerEntry (发言条目)**:
发言名单中的一条记录。状态机：waiting → ready → speaking → finished。
可被 paused/interrupted。取消 ready 状态时移出队列（而非退回 waiting）。
_Avoid_: Speaker, Turn

**Yield (让渡)**:
发言人提前结束发言时，将剩余时间让渡给主席、另一个代表团、
或开放提问/评论。让渡获得时间的代表不能再让渡。
_Avoid_: Delegate, Transfer

**Motion (动议)**:
代表团提出的程序性提议。共 12 种类型：开启主发言名单、有主持核心磋商、
自由磋商、修改发言时间、延置决议草案、恢复决议草案、结束辩论、
暂时休会、闭幕、调整投票顺序、实质性投票、更改出席状态。
其中 `change_attendance` 为特殊动议，无需表决直接生效。
状态机：pending → approved | rejected | expired。
_Avoid_: Proposal, Request

**Caucus (磋商)**:
非正式讨论阶段。分为有主持磋商（moderated，按发言名单轮流发言）
和自由磋商（unmoderated，自由讨论，主席只控制总时长）。
_Avoid_: Discussion, Break

**ModeratedCaucus (有主持磋商)**:
结构化磋商。有主题、总时长和每人发言时间。发言顺序由主席控制，
动议提出方可选择标首或标尾位置。
_Avoid_: Structured Debate

**UnmoderatedCaucus (自由磋商)**:
非结构化磋商。只有一个总倒计时，代表自由交流。
_Avoid_: Free Discussion, Lobbying

**IndividualSpeech (个人演讲)**:
一种无需表决的动议。提出方获得独占发言时间（单人独白），
时长在动议中指定，主席可随时提前结束。复用 caucus 阶段，
结束后回到 general_debate。
_Avoid_: Personal Statement, Solo Speech, Address

**Point (问题)**:
代表在会议中提出的程序性问题。三种类型：
point_of_order（程序性）、point_of_inquiry（咨询性）、
point_of_personal_privilege（个人特权）。
_Avoid_: Question, Interruption

**DraftResolution (决议草案)**:
由起草国（sponsors）提出、附议国（signatories）支持的正式文件。
关联到某个议题，需要经过实质性投票通过。
_Avoid_: Document, Proposal

**VotingSession (表决)**:
一次投票过程。针对动议（motion）或决议（resolution）。
支持两种多数规则：simple_majority（简单多数，>50%）和
two_thirds（三分之二多数，≥2/3）。采用唱名表决（roll-call vote），
每个出席且有投票权的代表团依次投票。
_Avoid_: Ballot, Poll

**VoteBallot (投票票)**:
单个代表团在表决中的投票。四种选项：yes / no / abstain / skip。
skip 不计入总票数。
_Avoid_: Vote, Ballot

**RollCall (点名)**:
会议开始时的出席确认环节。主席逐一点名，每个代表团回应 present 或 absent。
完成后锁定出席名单，用于后续表决的计票基数。
_Avoid_: Attendance Check

**ConferencePhase (会议阶段)**:
会议生命周期的阶段。状态机：
preamble → roll_call → pending_speakers_list → general_debate ↔ caucus ↔ voting
↔ suspended → closed。
_Avoid_: Stage, Status

**Minutes / ConferenceEntry (会议记录)**:
会议操作的审计日志。每条记录包含操作类型、时间戳和描述。
Action types 由 `ConferenceActionType`（25 种）统一定义。
_Avoid_: Log, History

**ProposerPosition (动议国位置)**:
有主持磋商中动议提出方的发言位置：first（标首，第一个发言）或 last（标尾，
最后一个发言）。

## Timeline（时间线）

会议时间轴模拟器。维护现实时间与模拟会议时间之间的映射关系。

**Timeline (时间线)**:
一个独立的时间模拟实例。通过倍率（ratio）控制模拟时间流逝速度。
可暂停、恢复。支持倍率预设（1x、10x、1分/秒、1时/秒、1日/秒）。
_Avoid_: Clock, Timer, Speed

**SimulationAnchor (模拟锚点)**:
时间线公式的基准点：`simTime = simulationAnchor + (now - realAnchor) × ratio`。
暂停时冻结 simulationAnchor，恢复时重新计算 realAnchor。
_Avoid_: Baseline, Reference Point

**Ratio (倍率)**:
每现实秒对应的模拟秒数。ratio=1 即实时，ratio=3600 即 1 小时/秒。
_Avoid_: Speed, Scale, Multiplier

## Battle（兵棋推演）

HOI4 风格的地图推演。在战役地图上部署单位，模拟军事行动。

**Battle (战局)**:
一场推演战局。包含派系、部署单位和事件脚本。
存储在 `battles.json`，通过 simulation-engine 按帧驱动。
_Avoid_: War, Scenario, Game

**Faction (派系)**:
推演中的一方势力。在 Conference 语境中应使用 Delegation 而非 Faction。
_Avoid_: Side, Team, Player

**PlacedUnit (部署单位)**:
地图上的一个军事单位。有坐标、速度、攻击力、组织度等属性。
通过 simulation-engine 每帧计算移动和战斗。
_Avoid_: Token, Piece, Entity

**EventSetting (事件脚本)**:
战役中的条件触发事件。包含触发器（trigger）、条件（condition）和动作（action）。
_Avoid_: Script, Trigger

## Plugin System（插件系统）

Veto 的可扩展性框架。插件通过 `veto` 虚拟模块（类似 VS Code 的 `vscode` 模块）
访问平台能力。Plugin Host 通过 `Module._load` 拦截实现虚拟模块注入，
插件内 `import { ... } from 'veto'` 在运行时自动解析为 PluginContext 的字段。

插件入口导出 `activate(context: PluginContext)` 和可选的 `deactivate()`。

**Plugin (插件)**:
扩展 Veto 功能的独立模块。五种类型：faction（派系数据）、campaign（战役场景）、
utility（服务工具）、dependency（纯依赖）、preset（预置配置）。
通过 manifest.json 声明，由 Plugin Host 在运行时加载。
所有插件运行在 Electron main process 内（不再是独立子进程）。
_Avoid_: Extension, Addon, Mod

**PluginContext (插件上下文)**:
插件激活时注入的运行时环境。包含六个 API：
- `logger` — 分级日志（info/warn/error/debug），输出到平台统一日志系统
- `events` — 全局 pub/sub 事件总线，支持通配符匹配（`conference:*`）
- `storage` — 插件隔离的键值持久化，JSON 序列化。插件必须使用 storage
  而非自行读写文件（见 ADR-0001）
- `conference` — 只读会议数据查询（list/get/update）
- `timeline` — 只读时间线数据查询（list/get/update）
- `notifications` — Toast 级用户通知（info/success/warn/error）
_Avoid_: API, Runtime

**veto 虚拟模块**:
由 Plugin Host 注入的运行时模块。插件源码中 `import { events, storage } from 'veto'`
在编译期通过 `@vetoexpress/types`（npm 包 `veto-dts`）获得类型检查，
运行时由 `Module._load` 拦截返回 PluginContext 的对应字段。
_Avoid_: @veto/sdk（已删除）
