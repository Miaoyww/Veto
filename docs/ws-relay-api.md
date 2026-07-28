# veto.ws-relay API 文档

> WebSocket 事件转发服务 — 将 VetoCore 的会议与时间线事件实时推送给外部客户端。

## 连接信息

| 项目 | 值 |
|------|-----|
| 协议 | WebSocket (RFC 6455) |
| 地址 | `ws://127.0.0.1:{port}` |
| 默认端口 | `19529` |
| 心跳间隔 | 15s（可配置） |

---

## 一、服务端 → 客户端（推送）

### 1.1 Welcome（连接建立后首条消息）

客户端 WebSocket 连接成功后，服务端立即发送。

```json
{
  "type": "welcome",
  "server": "veto.ws-relay",
  "version": "0.1.0",
  "timestamp": 1712345678901
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `"welcome"` | 消息类型 |
| `server` | `string` | 服务标识，固定 `"veto.ws-relay"` |
| `version` | `string` | 服务版本号 |
| `timestamp` | `number` | 服务端 Unix 毫秒时间戳 |

### 1.2 Event（核心推送）

VetoCore 事件发生时推送。

```json
{
  "type": "conference:created",
  "timestamp": 1712345678901,
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 事件类型，格式 `{domain}:{action}` |
| `timestamp` | `number` | 事件发生的 Unix 毫秒时间戳 |
| `data` | `object` | 事件负载，结构由事件类型决定 |

#### 默认推送的事件类型

| 模式 | 覆盖事件 | 说明 |
|------|----------|------|
| `conference:*` | `conference:created`, `conference:updated`, `conference:deleted`, … | 会议生命周期事件 |
| `timeline:*` | `timeline:created`, `timeline:updated`, `timeline:deleted`, … | 时间线生命周期事件 |

> 实际事件类型由 VetoCore 定义，以上为常见示例。

### 1.3 ACK（确认）

客户端发送 `subscribe` 或 `subscribe_all` 后，服务端回复确认。

```json
// subscribe 确认
{
  "type": "ack",
  "action": "subscribe",
  "events": ["conference:*"]
}

// subscribe_all 确认
{
  "type": "ack",
  "action": "subscribe_all"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `"ack"` | 消息类型 |
| `action` | `"subscribe"` \| `"subscribe_all"` | 确认的操作 |
| `events` | `string[]` | （仅 subscribe）已订阅的事件模式列表 |

### 1.4 Ping（心跳）

服务端定时发送 WebSocket Ping 帧（opcode `0x9`），客户端应自动回复 Pong。

---

## 二、客户端 → 服务端（发送）

### 2.1 subscribe — 订阅事件

订阅指定的事件类型。客户端只会收到匹配已订阅模式的事件。

```json
{
  "type": "subscribe",
  "events": ["conference:*"]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `"subscribe"` | 消息类型 |
| `events` | `string[]` | 要订阅的事件模式列表 |

### 2.2 unsubscribe — 取消订阅

```json
{
  "type": "unsubscribe",
  "events": ["conference:*"]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `"unsubscribe"` | 消息类型 |
| `events` | `string[]` | 要取消的事件模式列表 |

### 2.3 subscribe_all — 接收所有事件

清空订阅过滤器，接收服务端推送的所有事件。

```json
{
  "type": "subscribe_all"
}
```

### 2.4 pong — 心跳响应

客户端也可以发送 JSON 文本消息 `{"type": "pong"}` 来刷新心跳计时器（非必须，WebSocket 协议层的 Pong 帧已足够）。

```json
{
  "type": "pong"
}
```

---

## 三、订阅匹配规则

- 未设置任何订阅（初始状态）→ 接收**所有**事件
- 设置了订阅 → 只接收匹配的事件
- 匹配支持通配符 `*`：
  - `"*"` — 匹配所有事件
  - `"conference:*"` — 匹配所有 `conference:` 开头的事件
  - `"conference:created"` — 精确匹配

---

## 四、HTTP 端点

### GET /health

```json
{
  "status": "ok",
  "server": "veto.ws-relay",
  "clients": 2,
  "uptime": 123.45
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `"ok"` | 健康状态 |
| `server` | `string` | 服务标识 |
| `clients` | `number` | 当前连接的客户端数 |
| `uptime` | `number` | 进程运行时长（秒） |

### GET /

```json
{
  "server": "veto.ws-relay",
  "version": "0.1.0",
  "clients": 2,
  "events": ["conference:*", "timeline:*"],
  "usage": "Connect to ws://127.0.0.1:19529 to receive real-time events"
}
```

---

## 五、完整交互示例

```
Client                              Server
  │                                    │
  │──── ws://127.0.0.1:19529 ────────▶│  TCP 连接
  │◀── HTTP 101 Switching Protocols ──│  WebSocket 握手
  │                                    │
  │◀── {"type":"welcome",...} ────────│  欢迎消息
  │                                    │
  │──── {"type":"subscribe",          │  订阅会议事件
  │      "events":["conference:*"]} ──▶│
  │◀── {"type":"ack",                 │  确认
  │      "action":"subscribe",         │
  │      "events":["conference:*"]} ──│
  │                                    │
  │◀── {"type":"conference:created",  │  事件推送
  │      "timestamp":...,             │
  │      "data":{...}} ───────────────│
  │                                    │
  │◀── [Ping frame] ─────────────────│  心跳
  │──── [Pong frame] ────────────────▶│
  │                                    │
```

---

## 六、配置

配置文件路径：`{PLUGIN_DIR}/config.json`

```json
{
  "port": 19529,
  "host": "127.0.0.1",
  "relay": {
    "conference": true,
    "timeline": true,
    "events": []
  },
  "heartbeat": 15000
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `port` | `number` | `19529` | WebSocket 监听端口，占用时自动 +1 搜索 |
| `host` | `string` | `"127.0.0.1"` | 监听地址 |
| `relay.conference` | `boolean` | `true` | 是否转发会议事件 |
| `relay.timeline` | `boolean` | `true` | 是否转发时间线事件 |
| `relay.events` | `string[]` | `[]` | 自定义事件白名单（非空时覆盖 `conference`/`timeline` 开关） |
| `heartbeat` | `number` | `15000` | 心跳间隔（毫秒），超时 2 倍未响应则断开客户端 |
