(function() {
	'use strict';
	
	angular.module('DataDashboard')
		.factory('LocalesFactory',LocalesFactory);


	function LocalesFactory($http) {
		return {
				"af-ZA": {
					"code": "af-ZA",
					"original": "Afrikaans",
					"name": "Afrikaans"
				},
				"ar": {
					"code": "ar",
					"original": "العربية",
					"name": "Arabic"
				},
				"bg-BG": {
					"code": "bg-BG",
					"original": "Български",
					"name": "Bulgarian"
				},
				"ca-AD": {
					"code": "ca-AD",
					"original": "Català",
					"name": "Catalan"
				},
				"cs-CZ": {
					"code": "cs-CZ",
					"original": "Čeština",
					"name": "Czech"
				},
				"cy-GB": {
					"code": "cy-GB",
					"original": "Cymraeg",
					"name": "Welsh"
				},
				"da-DK": {
					"code": "da-DK",
					"original": "Dansk",
					"name": "Danish"
				},
				"de-AT": {
					"code": "de-AT",
					"original": "Deutsch (Österreich)",
					"name": "German (Austria)",
				},
				"de-CH": {
					"code": "de-CH",
					"original": "Deutsch (Schweiz)",
					"name": "German (Switzerland)"
				},
				"de-DE": {
					"code": "de-DE",
					"original": "Deutsch (Deutschland)",
					"name": "German (Germany)"
				},
				"el-GR": {
					"code": "el-GR",
					"original": "Ελληνικά",
					"name": "Greek"
				},
				"en-GB": {
					"code": "en-GB",
					"original": "English (UK)",
					"name": "English (UK)",
					"alpha2" : "GB"
				},
				"en-US": {
					"code": "en-US",
					"original": "English (US)",
					"name": "English (US)"
				},
				"es-CL": {
					"code": "es-CL",
					"original": "Español (Chile)",
					"name": "Spanish (Chile)"
				},
				"es-ES": {
					"code": "es-ES",
					"original": "Español (España)",
					"name": "Spanish (Spain)"
				},
				"es-MX": {
					"code": "es-MX",
					"original": "Español (México)",
					"name": "Spanish (Mexico)"
				},
				"et-EE": {
					"code": "et-EE",
					"original": "Eesti",
					"name": "Estonian"
				},
				"eu": {
					"code": "eu",
					"original": "Euskara",
					"name": "Basque"
				},
				"fa-IR": {
					"code": "fa-IR",
					"original": "فارسی",
					"name": "Persian"
				},
				"fi-FI": {
					"code": "fi-FI",
					"original": "Suomi",
					"name": "Finnish"
				},
				"fr-CA": {
					"code": "fr-CA",
					"original": "Français (Canada)",
					"name": "French (Canada)"
				},
				"fr-FR": {
					"code": "fr-FR",
					"original": "Français (France)",
					"name": "French (France)"
				},
				"he-IL": {
					"code": "he-IL",
					"original": "עברית",
					"name": "Hebrew"
				},
				"hr-HR": {
					"code": "hr-HR",
					"original": "Hrvatski",
					"name": "Croatian"
				},
				"hu-HU": {
					"code": "hu-HU",
					"original": "Magyar",
					"name": "Hungarian"
				},
				"id-ID": {
					"code": "id-ID",
					"original": "Bahasa Indonesia",
					"name": "Indonesian"
				},
				"is-IS": {
					"code": "is-IS",
					"original": "Íslenska",
					"name": "Icelandic"
				},
				"it-IT": {
					"code": "it-IT",
					"original": "Italiano",
					"name": "Italian"
				},
				"ja-JP": {
					"code": "ja-JP",
					"original": "日本語",
					"name": "Japanese"
				},
				"km-KH": {
					"code": "km-KH",
					"original": "ភាសាខ្មែរ",
					"name": "Khmer"
				},
				"ko-KR": {
					"code": "ko-KR",
					"original": "한국어",
					"name": "Korean"
				},
				"lt-LT": {
					"code": "lt-LT",
					"original": "Lietuvių",
					"name": "Lithuanian"
				},
				"lv-LV": {
					"code": "lv-LV",
					"original": "Latviešu",
					"name": "Latvian"
				},
				"mn-MN": {
					"code": "mn-MN",
					"original": "Монгол",
					"name": "Mongolian"
				},
				"nb-NO": {
					"code": "nb-NO",
					"original": "Norsk bokmål",
					"name": "Norwegian (Bokmål)"
				},
				"nl-NL": {
					"code": "nl-NL",
					"original": "Nederlands",
					"name": "Dutch"
				},
				"nn-NO": {
					"code": "nn-NO",
					"original": "Norsk nynorsk",
					"name": "Norwegian (Nynorsk)"
				},
				"pl-PL": {
					"code": "pl-PL",
					"original": "Polski",
					"name": "Polish"
				},
				"pt-BR": {
					"code": "pt-BR",
					"original": "Português (Brasil)",
					"name": "Portuguese (Brazil)"
				},
				"pt-PT": {
					"code": "pt-PT",
					"original": "Português (Portugal)",
					"name": "Portuguese (Portugal)"
				},
				"ro-RO": {
					"code": "ro-RO",
					"original": "Română",
					"name": "Romanian"
				},
				"ru-RU": {
					"code": "ru-RU",
					"original": "Русский",
					"name": "Russian"
				},
				"sk-SK": {
					"code": "sk-SK",
					"original": "Slovenčina",
					"name": "Slovak"
				},
				"sl-SI": {
					"code": "sl-SI",
					"original": "Slovenščina",
					"name": "Slovenian"
				},
				"sr-RS": {
					"code": "sr-RS",
					"original": "Српски / Srpski",
					"name": "Serbian"
				},
				"sv-SE": {
					"code": "sv-SE",
					"original": "Svenska",
					"name": "Swedish"
				},
				"th-TH": {
					"code": "th-TH",
					"original": "ไทย",
					"name": "Thai"
				},
				"tr-TR": {
					"code": "tr-TR",
					"original": "Türkçe",
					"name": "Turkish"
				},
				"uk-UA": {
					"code": "uk-UA",
					"original": "Українська",
					"name": "Ukrainian"
				},
				"vi-VN": {
					"code": "vi-VN",
					"original": "Tiếng Việt",
					"name": "Vietnamese"
				},
				"zh-CN": {
					"code": "zh-CN",
					"original": "中文 (中国大陆)",
					"name": "Chinese (PRC)"
				},
				"zh-TW": {
					"code": "zh-TW",
					"original": "中文 (台灣)",
					"name": "Chinese (Taiwan)"
				}
			}
	}
})();