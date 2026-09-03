// components.json 声明的 utils 别名指向 $lib/utils，但项目工具函数实际位于
// $lib/classes/utils。本文件作为别名垫片，供 shadcn 组件库按配置导入。
export * from './classes/utils.js'
