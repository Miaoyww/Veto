<script lang="ts">
  import { Play, Pause, SkipForward, Copy, Check } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { TimelineEngine, RATIO_PRESETS } from '$lib/classes/engine/timeline-engine.svelte'

  interface Props {
    engine: TimelineEngine
  }

  let { engine }: Props = $props()

  // ── 本地 UI 状态 ────────────────────────────────────────────────────

  /** 自定义倍率输入（字符串，方便编辑） */
  let customRatioInput = $state('')
  /** 跳转目标时间（datetime-local 格式字符串） */
  let jumpTarget = $state('')

  // ── 格式化函数 ──────────────────────────────────────────────────────

  function formatSimTime(ts: number): string {
    const d = new Date(ts)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
  }

  function formatRealTime(ts: number): string {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${min}:${ss}`
  }

  /** 将 JS 时间戳转为 datetime-local 输入格式 */
  function toDatetimeLocal(ts: number): string {
    const d = new Date(ts)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  /** 将 datetime-local 字符串转为 JS 时间戳 */
  function fromDatetimeLocal(val: string): number {
    return new Date(val).getTime()
  }

  // ── 操作函数 ────────────────────────────────────────────────────────

  function applyCustomRatio(): void {
    const n = Number(customRatioInput)
    if (!isNaN(n) && Number.isInteger(n) && n >= 1) {
      engine.setRatio(n)
      customRatioInput = ''
    }
  }

  function applyJump(): void {
    if (jumpTarget) {
      engine.jumpTo(fromDatetimeLocal(jumpTarget))
    }
  }

  let copied = $state(false)

  async function copySimTime(): Promise<void> {
    await navigator.clipboard.writeText(formatSimTime(engine.currentSimTime))
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  /** 初始化跳转目标输入 */
  function updateJumpTarget(): void {
    jumpTarget = toDatetimeLocal(engine.currentSimTime)
  }
</script>

<div class="veto-card flex flex-col gap-6 p-6 max-w-2xl mx-auto">
  <!-- 标题 -->
  <h2 class="text-lg font-semibold text-foreground">会议时间轴模拟器</h2>

  <!-- 时间显示区 -->
  <div class="rounded-lg border border-border/50 bg-card/60 p-6 backdrop-blur-md">
    <div class="text-center">
      <div class="flex items-center justify-center gap-2 mb-1">
        <p class="text-sm text-muted-foreground">当前模拟时间</p>
        <Button
          variant="ghost"
          size="icon-xs"
          class="size-5 text-muted-foreground hover:text-foreground"
          title="复制模拟时间"
          onclick={copySimTime}
        >
          {#if copied}
            <Check size={11} class="text-green-500" />
          {:else}
            <Copy size={11} />
          {/if}
        </Button>
      </div>
      <p class="text-4xl font-mono font-bold tabular-nums tracking-tight text-foreground">
        {formatSimTime(engine.currentSimTime)}
      </p>
      <p class="mt-2 text-sm text-muted-foreground font-mono">
        实时 · {formatRealTime(engine.currentRealTime)}
      </p>
    </div>
  </div>

  <!-- 暂停 / 继续 -->
  <div class="flex items-center justify-center gap-3">
    <Button
      variant={engine.paused ? 'default' : 'secondary'}
      size="lg"
      class="gap-2 min-w-32"
      onclick={() => engine.togglePause()}
    >
      {#if engine.paused}
        <Play size={18} />
        开始
      {:else}
        <Pause size={18} />
        暂停
      {/if}
    </Button>
  </div>

  <!-- 时间倍率 -->
  <div class="flex flex-col gap-2">
    <Label class="text-sm font-medium">时间倍率</Label>
    <div class="flex flex-wrap gap-1.5">
      {#each RATIO_PRESETS as preset}
        <Button
          size="sm"
          variant={engine.ratio === preset.value ? 'default' : 'outline'}
          onclick={() => engine.setRatio(preset.value)}
        >
          {preset.label}
        </Button>
      {/each}
    </div>
  </div>

  <!-- 自定义倍率 -->
  <div class="flex items-end gap-2">
    <div class="flex flex-1 flex-col gap-1.5">
      <Label for="custom-ratio" class="text-sm font-medium">自定义倍率</Label>
      <Input
        id="custom-ratio"
        type="number"
        min="1"
        step="1"
        placeholder="输入倍率..."
        bind:value={customRatioInput}
        oninput={(e) => {
          const input = e.currentTarget as HTMLInputElement
          input.value = input.value.replace(/[^\d]/g, '')
        }}
        onkeydown={(e) => e.key === 'Enter' && applyCustomRatio()}
      />
    </div>
    <Button size="sm" variant="outline" onclick={applyCustomRatio}>应用</Button>
  </div>

  <!-- 分隔 -->
  <hr class="border-border/50" />

  <!-- 手动跳转 -->
  <div class="flex flex-col gap-2">
    <Label class="text-sm font-medium">跳转到指定时间</Label>
    <div class="flex items-end gap-2">
      <div class="flex flex-1 flex-col gap-1.5">
        <Input type="datetime-local" bind:value={jumpTarget} onfocus={updateJumpTarget} />
      </div>
      <Button size="sm" variant="outline" onclick={applyJump}>
        <SkipForward size={16} class="mr-1" />
        跳转
      </Button>
    </div>
    <p class="text-xs text-muted-foreground">
      当前：{formatSimTime(engine.currentSimTime)}
    </p>
  </div>

  <!-- 重置 -->
  <div class="flex justify-end">
    <Button variant="ghost" size="sm" onclick={() => engine.reset()}>重置到默认值</Button>
  </div>
</div>
