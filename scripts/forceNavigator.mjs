import { watch, reactive, html } from "@arrow-js/core"
import { languageHelper } from "languageHelper"

export const forceNavigator = reactive({
	"position": -1,
	"serverInstance": null,
	"sessionId": null,
	"clientId": null,
	"ctrlPressed": false,
	"apiVersion": "v56.0",
	"commands": {},
	"httpGet": (url, options)=>fetch(`${forceNavigator.servceInstance}/services/data/${forceNavigator.apiVersion}` + url, Object.merge({
			"headers": { "Authorization": forceNavigator.sessionId }
		}, options)),
	"store": (action, payload)=>{
		chrome.extension.sendMessage({
			"action": action,
			"key": clientId,
			"payload": payload,
		}, response=>{})
	},
	"getCookie": (key)=>{
		const Cookies = document.cookie.split(";")
		for (i = Cookies.length; i >= 0; i--) {
			const cookieKey = Cookies[i].substr(0, Cookies[i].indexOf("=") ).replace(/^\s+|\s+$/g,"")
			const cookieValue = Cookies[i].substr( Cookies[i].indexOf("=")+1 )
			if (cookieKey===key)
				return unescape(cookieValue)
		}
	},
	"getServerInstance": ()=>{
		const url = (document.URL + "") // todo is this necessary?
		if(url.indexOf("salesforce") != -1)
			return url.substring(0, url.indexOf("salesforce")-1)
		else if(url.indexOf("visual.force") != -1) {
			return 'https:// ' + url.split(".")[1]
		}
	},
	"initShortcuts": () => chrome.extension.sendMessage({"action":"Get Settings"}, response => bindShortcut(response['shortcut'])),
	"bindShortcut": (shortcut) => document.getElementById('sfNavQuickSearch').onkeyup = k=>{ lookAt(); return true },
	"showLoadingIndicator": () => { document.getElementById('sfNavLoader').style.visibility = 'visible' },
	"hideLoadingIndicator": () => { document.getElementById('sfNavLoader').style.visibility = 'hidden' },
	"getCustomObjectsDef": () => {
		forceNavigator.httpGet("/sobjects/query/?q=Select+Id,+DeveloperName+FROM+CustomObject")
		.then(response=>{
			console.log(response)
			if(response.records)
				for(var i=0;i<response.records.length;i++) {
					customObjects[response.records[i].DeveloperName.toLowerCase()] = {Id: response.records[i].Id}
				}
			else
				console.log(response)
		})
	},
	"init": () => {
		const loaderURL = chrome.extension.getURL("images/ajax-loader.gif")
		forceNavigator.commands['Refresh Metadata'] = {}
		forceNavigator.commands['Setup'] = {}
		document.body.appendChild(html`
			<div id="sfNavCommandPrompt">
				<div class="sfNavWrapper">
					<input type="text" id="sfNavQuickSearch" autocomplete="off"/>
					<img id="sfNavLoader" src= "${ loaderURL }"/>
				</div>
				<div class="sfNavShadow" id="sfNavShadow"/>
				<div class="sfNavOutput" id="sfNavOutput"/>
			</div>
		`)
		forceNavigator.hideLoadingIndicator()
		forceNavigator.initShortcuts()
		forceNavigator.clientId = forceNavigator.getCookie('sid').split('!')[0]
		chrome.extension.sendMessage({ "action": "getCommands", "key": forceNavigator.clientId }, (response)=>{
			forceNavigator.commands = !response ? response : {}
			forceNavigator.commands = response
			httpGet('/sobjects/', {})
			.then(response=>{
				getMetadata(response.target.responseText)
			})
		})
		chrome.extension.sendMessage({ "action": "getMetadata", "key": clientId }, (response)=>{ metadata = response })
	}
})

forceNavigator.init()