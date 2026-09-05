<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Loader2, LogIn } from '@lucide/svelte'

  interface Props {
    onAuthenticate: (inviteCode: string, password?: string) => void
    error?: string
    connecting: boolean
  }

  let { onAuthenticate, error, connecting }: Props = $props()

  let inviteCode = $state('')
  let password = $state('')

  function handleSubmit(e: Event): void {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (!code) return
    onAuthenticate(code, password || undefined)
  }
</script>

<div class="login-screen">
  <div class="login-card">
    <div class="login-header">
      <h2 class="text-xl font-bold">加入会议</h2>
      <p class="text-sm text-muted-foreground">
        使用席位邀请码和密码连接 Host Service。
      </p>
    </div>

    <form onsubmit={handleSubmit} class="login-form">
      {#if error}
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      {/if}

      <div class="form-field">
        <Label for="invite-code">邀请码</Label>
        <Input
          id="invite-code"
          bind:value={inviteCode}
          placeholder="XXXX-XXXX-XXXX"
          maxlength={14}
          disabled={connecting}
        />
      </div>

      <div class="form-field">
        <Label for="password">密码（如已设置）</Label>
        <Input
          id="password"
          type="password"
          bind:value={password}
          placeholder="席位密码"
          disabled={connecting}
        />
      </div>

      <Button
        type="submit"
        class="w-full"
        disabled={connecting || !inviteCode.trim()}
      >
        {#if connecting}
          <Loader2 class="size-4 mr-2 animate-spin" />
          连接中...
        {:else}
          <LogIn class="size-4 mr-2" />
          加入会议
        {/if}
      </Button>
    </form>
  </div>
</div>

<style>
  .login-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--background);
  }
  .login-card {
    width: 380px;
    max-width: 90vw;
    padding: 2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
  }
  .login-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
</style>
