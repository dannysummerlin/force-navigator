import { ui, forceNavigator, forceNavigatorSettings, _d } from "./shared"
import { t } from "lisan"

forceNavigator.pasteFromClipboard = (newtab)=>{
	let cb = document.createElement("textarea")
	let body = document.getElementsByTagName('body')[0]
	body.appendChild(cb)
	cb.select()
	document.execCommand('paste')
	const clipboardValue = cb.value.trim()
	cb.remove()
	return clipboardValue
}
forceNavigator.getIdFromUrl = ()=>{
	const url = document.location.href
	const ID_RE = [
		/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{18})[^\w]*/, // tries to find the first 18 digit
		/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{15})[^\w]*/ // falls back to 15 digit
	]
	for(let i in ID_RE) {
		const match = url.match(ID_RE[i])
		if (match != null) { return match[1] }
	}
	return false
}
forceNavigator.launchMerger = (otherId, object)=>{
	if(!otherId)
		otherId = forceNavigator.pasteFromClipboard()
	if(![15,18].includes(otherId.length)) {
		ui.clearOutput()
		ui.addSearchResult("commands.errorAccountMerge")
		return
	}
	const thisId = forceNavigator.getIdFromUrl()
	if(!thisId)
		return
	switch(object) {
		case "Account":
			document.location.href = `${forceNavigator.serverInstance}/merge/accmergewizard.jsp?goNext=+Next+&cid=${otherId}&cid=${thisId}`
			break
/* capturing for later, but looks very page context dependent so probably won't work the same way
		case "Case":
			// maybe with .lightning.force.com
			fetch(`${forceNavigator.serverInstance}/aura?r=34&ui-force-components-controllers-recordLayoutBroker.RecordLayoutBroker.getLayout=1&ui-merge-components-controller.Merge.loadMergeComparisonData=1`, {
				"referrerPolicy": "origin-when-cross-origin",
				"body": "message=" + encodeURIComponent(JSON.stringify({ "actions": [{
					    "id": "4324;a",
					    "descriptor": "serviceComponent://ui.merge.components.controller.MergeController/ACTION$loadMergeComparisonData",
					    "callingDescriptor": "UNKNOWN",
					    "params": { "recordIds": caseIds }
					},
					{
						"id": "4330;a",
						"descriptor": "serviceComponent://ui.force.components.controllers.recordLayoutBroker.RecordLayoutBrokerController/ACTION$getLayout",
					    "callingDescriptor": "UNKNOWN",
					    "params": {
					        "entityName": "Case",
					        "recordTypeId": "SOBJECT",
					        "mode": "VIEW",
					        "type": "MERGE",
					        "inContextOfComponent": "runtime_sales_merge:mergePanel",
					        "pageSize": -1,
					        "offset": 0
					    }
					}]}))
					"&aura.context=%7B%22mode%22%3A%22PROD%22%2C%22fwuid%22%3A%22ZDROWDdLOGtXcTZqSWZiU19ZaDJFdzk4bkk0bVJhZGJCWE9mUC1IZXZRbmcyNDguMTAuNS01LjAuMTA%22%2C%22app%22%3A%22one%3Aone%22%2C%22loaded%22%3A%7B%22APPLICATION%40markup%3A%2F%2Fone%3Aone%22%3A%22vMup-hm3IezvCran53wleQ%22%7D%2C%22dn%22%3A%5B%5D%2C%22globals%22%3A%7B%22appContextId%22%3A%2206m1K000001MXitQAG%22%7D%2C%22uad%22%3Atrue%7D&aura.pageURI=%2Flightning%2Fo%2FCase%2Flist%3FfilterName%3D00BRg000003f3OQMAY%260.forceReload&aura.token=eyJub25jZSI6Il9qVy1Xa25CYkd3SU90Y2RhazZoNEo4ektVak9ENFhnZkgybmpxeG1EZXdcdTAwM2QiLCJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6IntcInRcIjpcIjAwRFJnMDAwMDAwMDAwMVwiLFwidlwiOlwiMDJHUmcwMDAwMDAwMDNGXCIsXCJhXCI6XCJjYWltYW5zaWduZXJcIn0iLCJjcml0IjpbImlhdCJdLCJpYXQiOjE3MTcyNTAwNzE5MDQsImV4cCI6MH0%3D..XOs4BhwNr8Gy-UKc1IzuoFmqazjW4pYUhnLgPyzOuV0%3D",
				"method": "POST",
				"mode": "cors",
				"credentials": "include"
			})
*/
		default:
			break
	}
}
forceNavigator.launchMergerAccounts = (otherId)=>forceNavigator.launchMerger(otherId, "Account")
forceNavigator.launchMergerCases = (otherId)=>forceNavigator.launchMerger(otherId, "Case")
forceNavigator.createTask = (subject)=>{
	ui.showLoadingIndicator()
	if(["",null,undefined].includes(subject) && !forceNavigator.userId) { console.error("Empty Task subject"); hideLoadingIndicator(); return }
	chrome.runtime.sendMessage({
			"action":'createTask', "apiUrl": forceNavigator.apiUrl,
			"sessionId": forceNavigator.sessionId,
			"domain": forceNavigator.serverInstance,
			"subject": subject, "userId": forceNavigator.userId
		}, response=>{
			if(response.errors.length != 0) { console.error("Error creating task", response.errors); return }
			ui.clearOutput()
			forceNavigator.commands["commands.goToTask"] = {
				"key": "commands.goToTask",
				"url": forceNavigator.serverInstance + "/"+ response.id
			}
			ui.quickSearch.value = ""
			ui.addSearchResult("commands.goToTask")
			ui.addSearchResult("commands.escapeCommand")
			let firstEl = document.querySelector('#sfnavOutputs :first-child')
			if(forceNavigator.listPosition == -1 && firstEl != null)
				firstEl.className = "sfnav_child sfnav_selected"
			ui.hideLoadingIndicator()
	})
}

forceNavigator.init()