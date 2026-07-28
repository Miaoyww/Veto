# 插件统一走 storage API 持久化，不再自行读写文件

插件持久化配置/状态时，一律使用 `veto` 虚拟模块提供的 `storage` API（`storage.get` / `storage.set` / `storage.delete`），禁止插件自行 `fs.readFileSync` / `fs.writeFileSync` 读写 `config.json` 等文件。

## 为什么

此前 service 插件（如 veto.ws-relay）通过 `@veto/sdk` 的 `VetoClient.getConfig/saveConfig` 读写配置，回退到 `fs` 直读 `config.json`。两条路径异步、无锁，且失败模式不一致。

`storage` API 由 Veto Plugin Host 统一提供：隔离每个插件的键值空间、自动处理序列化、插件间不可互读。将持久化责任收敛到 Host 端，插件只需调一个 API，零 I/O 样板代码。

## 考虑过的替代方案

- **保留 config.json**：允许用户手动编辑配置文件。但插件目录是 Veto 管理的（安装/卸载会清空），手动编辑的配置在插件更新时可能被覆盖。且 `storage` 的数据由 Host 管理，可以在 UI 中暴露配置界面，比 JSON 文件更友好。
