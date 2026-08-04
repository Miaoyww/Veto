/**
 * units/index.ts — 基础游戏数据注册入口。
 *
 * 在应用启动时调用此模块（import '$units'），将基础军种、大类、单位模板和 i18n
 * 注入全局 ModRegistry。之后通过 registry.* API 访问所有数据，无需硬编码。
 */
import { registry } from '$lib/registry/mod-registry.svelte';
import type { ModData, ModMetadata } from '$lib/registry/types';

import branchesJson from './base/branches.json';
import categoriesJson from './base/categories.json';
import i18nJson from './base/i18n.json';
import armyTemplates from './base/army-templates.json';
import navyTemplates from './base/navy-templates.json';
import airForceTemplates from './base/air-force-templates.json';

const baseGameMetaData: ModMetadata = {
	id: 'base',
	name: '基础游戏数据',
	version: '1.0.0',
	source: 'system'
};
const baseGameData: ModData = {
	id: 'base',
	metadata: baseGameMetaData,
	type: 'utility',
	branches: branchesJson,
	categories: categoriesJson as ModData['categories'],
	unitTemplates: [
		...armyTemplates,
		...navyTemplates,
		...airForceTemplates
	] as unknown as ModData['unitTemplates'],
	i18n: i18nJson
};

registry.load(baseGameData);

// 导出 registry 供组件直接使用
export { registry } from '$lib/registry/mod-registry.svelte';
