import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
	...configWithoutCloudSupport,
	{
		rules: {
			'n8n-nodes-base/community-package-json-license-not-default': 'off',
		},
	},
];
