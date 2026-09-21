<script>
  import { VETO_NAME } from '$lib/classes/const'
  import { ModeWatcher } from 'mode-watcher'
  import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte'
  import SettingsDialog from '$lib/components/settings/settings-dialog.svelte'

  import logo from '$lib/assets/logo.svg'
  import '../app.css'
  import '../css/components.css'

  let { children } = $props()
</script>

<svelte:head>
  <title>{VETO_NAME}</title>
  <meta name="title" content={VETO_NAME} />
  <link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

<ModeWatcher />
<MyAlertDialog />
<SettingsDialog />
{@render children()}
