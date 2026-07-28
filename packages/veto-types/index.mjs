/**
 * @vetoexpress/types — Runtime Sentry
 *
 * 此文件替代之前的空壳 stub。
 *
 * 如果插件在运行时 import 了 @vetoexpress/types，
 * 意味着它用错了包 —— 应该 import from 'veto'。
 *
 * @vetoexpress/types 仅用于 TypeScript 类型检查，
 * 不应出现在插件的运行时依赖中。
 *
 * @see https://veto.miaoyww.top
 */

throw new Error(
  '@vetoexpress/types 是纯类型声明包，不应在运行时导入。\n\n' +
    '请将代码中的:\n' +
    '  import { ... } from "@vetoexpress/types"\n' +
    '改为:\n' +
    '  import { ... } from "veto"\n\n' +
    '@vetoexpress/types 只作为 devDependency 安装，用于 TypeScript 类型检查。\n' +
    '运行时由 Veto Plugin Host 注入 "veto" 模块。\n\n' +
    'See: https://veto.miaoyww.top'
)
