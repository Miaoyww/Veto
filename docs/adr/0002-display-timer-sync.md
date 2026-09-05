# Display 计时器同步使用双通道消息

Chair 端通过其与 Display 的直接 WebSocket 通道同步计时器状态时，采用双通道设计：
结构变化时发送完整的 `ConferenceDisplayData`，计时 tick 时仅发送轻量的 `timer_tick` 增量消息。
Display 端**永远不维护自己的计时器**——所有时间数值由 Chair 的本地议程控制器计算后推送。

## Considered Options

- **每 tick 全量发送 `buildDisplayData`**：简单但浪费——一般性辩论每 100ms 做完整遍历（delegations、entries、votings、minutes）并 JSON 序列化几 KB 数据，CPU 和带宽开销不必要。
- **Display 端自建计时器**：Chair 只发 start/pause/resume 事件，Display 自己数秒。存在时钟漂移风险——两个进程的 `setInterval` 不可能精确同步，积累误差后 Chair 和 Display 显示不同数字。违反 Chair 是本地议程唯一真相来源的约束。
- **双通道**（采用）：tick 消息体积极小（~50 bytes），可高频发送；完整数据仅在操作事件时发送。Display 被动渲染，零累积误差。
