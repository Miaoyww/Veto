/**
 * veto-loader.mjs — Node.js Custom Loader
 *
 * 拦截插件中的 `import ... from "veto"`，注入 Host 提供的 API。
 *
 * 用法：
 *   node --loader ./veto-loader.mjs plugin-entry.mjs
 *
 * 原理与 VS Code 的 loader 一致：
 * - resolve("veto") → "veto:runtime"（虚拟模块）
 * - load("veto:runtime") → 返回注入 logger / events 的 ESM 源码
 *
 * 两种模式：
 * 1. In-process:  Host 在 import() 前设置 globalThis.__veto
 * 2. Out-of-process: 通过 process.env.VETO_PLUGIN_ID 识别，logger 走 console
 *
 * 参考：https://nodejs.org/api/esm.html#loaders
 */

const PLUGIN_ID = process.env.VETO_PLUGIN_ID || 'unknown'
const VETO_SPECIFIER = 'veto'
const VETO_URL = 'veto:runtime'

/**
 * resolve(specifier, context, nextResolve)
 *
 * 将 "veto" 重定向到虚拟模块 "veto:runtime"。
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === VETO_SPECIFIER) {
    return {
      url: VETO_URL,
      shortCircuit: true,
    }
  }

  return nextResolve(specifier, context)
}

/**
 * load(url, context, nextLoad)
 *
 * 为 "veto:runtime" 生成携带运行时 API 的 ESM 源码。
 * 如果 globalThis.__veto 存在（in-process），优先使用；
 * 否则构建 console-based logger（out-of-process，stdout 由 Host 捕获）。
 */
export async function load(url, context, nextLoad) {
  if (url === VETO_URL) {
    const source = buildVetoModuleSource()
    return {
      format: 'module',
      source,
      shortCircuit: true,
    }
  }

  return nextLoad(url, context)
}

/**
 * 构建 veto 虚拟模块的源码。
 *
 * 导出：
 * - logger  { info, warn, error, debug }
 * - (未来)  storage, events, commands, Disposable
 */
function buildVetoModuleSource() {
  return `
// ── veto 虚拟模块（由 veto-loader.mjs 注入）──────────────────────────────

const __pid = ${JSON.stringify(PLUGIN_ID)}

// 优先使用 Host 预置的 __veto（in-process），否则构建 console logger
const __veto = globalThis.__veto || {}

/** 格式化插件日志前缀 */
const fmt = (level) => __veto.__noPrefix
  ? ''
  : \`[VetoExpress][\${__pid}][\${level}] \`

export const logger = __veto.logger || {
  info(msg)  { console.log(fmt('INFO') + msg) },
  warn(msg)  { console.warn(fmt('WARN') + msg) },
  error(e)   {
    const msg = typeof e === 'string' ? e : (e?.message ?? String(e))
    console.error(fmt('ERROR') + msg)
    if (e?.stack) console.error(e.stack)
  },
  debug(msg) { console.debug(fmt('DEBUG') + msg) },
}

// 未来扩展：storage / events / commands 等
`
}
