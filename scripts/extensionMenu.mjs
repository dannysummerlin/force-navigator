import { reactive, html } from "@arrow-js/core"
import { languageHelper } from "languageHelper"

export const extensionMenu = reactive({
	"settings": [{
		"key": "theme",
		"type": "text",
		"options": [],
	},{
		"key": "useApiName",
		"type": "checkbox",
	}],
	"create": () => html`
		<p>${languageHelper.translate("menu.explanation")}</p>
		<ul>
		${() => extensionMenu.settings.map(s => html`
			<li>
				<label for="settings_${s.key}">${ languageHelper.translate("settings." + s.key) }</label>
				<input type="${s.type}" name="settings_${s.key}" id="settings_${s.id}"/></li>
		`)}
		</ul>
`(document.getElementById('sfNavMenuHeader')),
	"saveSettings": () => { save() }
})

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('save').addEventListener('click', save)
	main()
})

function main() {
	// todo do I need this?
	chrome.extension.sendMessage({'action':'Get Settings'}, 
		function(response) {
			console.log(response)
			document.getElementById('shortcut').value = response['shortcut']				
		}
	)
}
function save(setting) {
	if(!setting)

	const payload = document.getElementById('shortcut').value
	chrome.extension.sendMessage({'action':'Set Settings', 'key':'shortcut', 'payload':payload}
		function(response) {
			chrome.tabs.getSelected(null, function(tab) {
				const code = 'window.location.reload();'
				chrome.tabs.executeScript(tab.id, {code: code})
			})
		}
	)
}