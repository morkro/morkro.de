module.exports = {
	languageOptions: {
		sourceType: 'module',
	},
	rules: {
		indent: [
			2,
			'tab',
			{
				SwitchCase: 1,
			},
		],
		quotes: [2, 'single'],
		semi: [2, 'never'],
		'no-mixed-spaces-and-tabs': [2, 'smart-tabs'],
		'prefer-const': 2,
	},
}
