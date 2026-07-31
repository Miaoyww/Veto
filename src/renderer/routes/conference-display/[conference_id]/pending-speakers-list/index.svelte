<script lang="ts">
  import { Users } from '@lucide/svelte'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'
</script>

<DisplayPage>
  <div class="flex flex-col items-center gap-6 text-white/15">
    <Users size={56} />
    <div class="text-9xl font-light tracking-[0.06em]">等待开启</div>
    <div class="text-9xl font-light tracking-[0.06em]">主发言名单</div>
    <div class="text-lg tracking-wider text-white/10">AWAITING SPEAKERS LIST</div>
  </div>
</DisplayPage>
