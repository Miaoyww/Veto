# 0010. Display 使用独立 Chair-to-Display WebSocket

## 状态

已接受

## 背景

Display 只需要消费 Chair 的会议投影，与 Host Service 没有业务依赖。把
Display 数据继续挂在 Host Service 上，会迫使单例模式也启动 Host 服务，也会
让 Display 的链路跟随 Host 生命周期变化。Electron IPC 仍适合窗口控制，但不
适合作为 Chair 与 Display 之间的持续数据通道。

## 决策

- Electron 主进程新增 `display-ws`，作为独立 Chair-to-Display WebSocket 服务。
  其默认端口为 `19528`，占用时自动重试，监听 `0.0.0.0`。
- 连接按 `role=chair|display` 区分，并可通过 `committeeId` 绑定会议。Chair 发送
  `display_data` 与 `timer_tick`，Display 只接收这两类业务消息。
- 该服务缓存每个委员会的最新 `display_data`，Display 重连后可立即获得当前投影。
- 独立服务不读取 HostRuntime，也不承载 Host 命令；Host Service 的
  `ws-display` 协议和内部行为保持不变。
- 打开、关闭和全屏等 Display 窗口控制继续走既有 Electron IPC。

## 后果

Display 数据和计时器链路不再依赖 Host Service，单例模式与大会模式都能复用同
一条 Display 投影链路。代价是应用内存在两条 WebSocket 职责边界，必须防止 Chair
把 Display 数据通道重新引入 Host Runtime。
