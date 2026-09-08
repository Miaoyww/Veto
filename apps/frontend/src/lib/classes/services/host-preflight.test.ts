import { afterEach, describe, expect, it, vi } from 'vitest'
import { runHostPreflight, type HostStatus } from './host-preflight'

function setup() {
  const controller = new AbortController()
  const status: HostStatus = {
    activeConferenceId: null,
    conferences: [{ id: 'conference-1', name: '大会', active: false }]
  }
  const options = {
    conferenceId: 'conference-1',
    readStatus: vi.fn(async () => status),
    getPort: vi.fn(async () => 3000),
    fetchHealth: vi.fn(async (_url: string, _signal: AbortSignal): Promise<unknown> => ({
      status: 'ok',
      server: 'veto.lan'
    })),
    signal: controller.signal,
    onCheck: vi.fn()
  }
  return { controller, status, options }
}

afterEach(() => vi.useRealTimers())

describe('Host 启动自检', () => {
  it('验证当前大会和真实健康接口后才通过全部检查', async () => {
    const { options, status } = setup()
    await expect(runHostPreflight(options)).resolves.toEqual(status)
    expect(options.fetchHealth).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/__veto/health',
      expect.any(AbortSignal)
    )
    expect(options.onCheck.mock.calls).toEqual([
      ['console', 'checking'],
      ['console', 'passed'],
      ['conference', 'checking'],
      ['conference', 'passed'],
      ['network', 'checking'],
      ['network', 'passed']
    ])
  })

  it('控制台不可访问时不继续检查', async () => {
    const { options } = setup()
    options.readStatus.mockRejectedValue(new Error('无访问权限'))
    await expect(runHostPreflight(options)).rejects.toThrow('无访问权限')
    expect(options.getPort).not.toHaveBeenCalled()
    expect(options.onCheck).toHaveBeenLastCalledWith('console', 'failed')
  })

  it('当前大会未载入时不检查网络', async () => {
    const { options, status } = setup()
    status.conferences = []
    await expect(runHostPreflight(options)).rejects.toThrow('尚未载入当前大会')
    expect(options.getPort).not.toHaveBeenCalled()
    expect(options.onCheck).toHaveBeenLastCalledWith('conference', 'failed')
  })

  it.each([0, -1, 65536, 1.5, NaN])('拒绝无效监听端口 %s', async (port) => {
    const { options } = setup()
    options.getPort.mockResolvedValue(port)
    await expect(runHostPreflight(options)).rejects.toThrow('尚未监听端口')
    expect(options.fetchHealth).not.toHaveBeenCalled()
  })

  it.each([null, {}, { status: 'ok', server: 'another-service' }])(
    '健康接口响应不属于 Veto 时失败：%j',
    async (response) => {
      const { options } = setup()
      options.fetchHealth.mockResolvedValue(response)
      await expect(runHostPreflight(options)).rejects.toThrow('响应异常')
      expect(options.onCheck).toHaveBeenLastCalledWith('network', 'failed')
    }
  )

  it('服务无响应时超时并取消网络请求', async () => {
    vi.useFakeTimers()
    const { options } = setup()
    options.fetchHealth.mockImplementation(() => new Promise(() => {}))
    const result = expect(runHostPreflight(options)).rejects.toThrow('自检超时')
    await vi.advanceTimersByTimeAsync(5000)
    await result
    expect(options.fetchHealth.mock.calls[0][1].aborted).toBe(true)
    expect(options.onCheck).toHaveBeenLastCalledWith('network', 'failed')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('离开页面时中止自检，迟到的 IPC 结果不会继续发起网络请求', async () => {
    const { options, controller } = setup()
    let resolvePort!: (port: number) => void
    options.getPort.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePort = resolve
        })
    )
    const result = expect(runHostPreflight(options)).rejects.toThrow('取消')
    await vi.waitFor(() => expect(options.getPort).toHaveBeenCalled())
    controller.abort(new Error('取消'))
    await result
    resolvePort(3000)
    await Promise.resolve()
    expect(options.fetchHealth).not.toHaveBeenCalled()
    expect(options.onCheck).not.toHaveBeenCalledWith('network', 'passed')
  })
})
