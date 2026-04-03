<script>
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';

	import { version } from '$app/environment';
	import { fade } from 'svelte/transition';
	import Combobox from '$lib/components/ui/combox/combobox.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
</script>

<div class="space-y-3 pb-10 lg:max-w-4xl">
	<div class="font-weight-bold text-xl font-bold">会场主题</div>
	<SettingCard let:id title="会场模式" description="浅色 / 深色 / 跟随系统">
		<Combobox
			items={[
				{ value: 'light', label: '浅色' },
				{ value: 'dark', label: '深色' },
				{ value: 'system', label: '跟随系统' }
			]}
		/>
	</SettingCard>

	<div class="font-weight-bold text-xl font-bold">语言设置</div>
	<SettingCard let:id title="会场使用语言" description="支持多种联合国官方语言.">
		<!-- <Combobox items={convertToComboBoxLanguages()} bind:value={$munSettings.language} /> -->
	</SettingCard>

	<div class="font-weight-bold text-xl font-bold">会议议程设置</div>
	<SettingCard let:id title="常用议程类型" description="选择常用的会议议程模板.">
		<Button variant="outline">设置议程</Button>
	</SettingCard>

	<SettingCard let:id title="默认发言时间" description="每位代表的默认发言时间.">
		<Combobox
			items={[
				{ value: '2', label: '2分钟' },
				{ value: '3', label: '3分钟' },
				{ value: '5', label: '5分钟' }
			]}
		/>
	</SettingCard>

	<SettingCard let:id title="自动记录发言" description="是否自动将发言加入会议记录.">
		<Switch {id} />
	</SettingCard>

	<div class="font-weight-bold text-xl font-bold">客户端设置</div>
	<SettingCard let:id title="离线模式" description="开启后会场数据不会上传服务器, 需自行管理数据.">
		<Switch {id} />
	</SettingCard>

	<SettingCard
		let:id
		title="远程服务器地址"
		description="自搭建服务器可在此填写地址, 修改后请重启客户端."
	>
		<Input {id} class="w-2/5" />
	</SettingCard>

	<SettingCard
		let:id
		title="数据同步策略"
		description="自动 / 手动 / 仅 Wi-Fi 下同步. 离线模式启用时禁用."
	>
		<Combobox
			items={[
				{ value: 'auto', label: '自动' },
				{ value: 'manual', label: '手动' },
				{ value: 'wifi', label: '仅 Wi-Fi 同步' }
			]}
		/>
	</SettingCard>

	<SettingCard let:id title="导入/导出会议数据" description="导入或导出整个会场数据.">
		<Button {id} variant="outline">导入</Button>
		<Button {id} variant="outline">导出</Button>
	</SettingCard>

	<div class="font-weight-bold text-xl font-bold">开发选项</div>
	<SettingCard let:id title="测试功能" description="仅开发者使用.">
		<Button {id} variant="outline">测试</Button>
	</SettingCard>
</div>
