import { forceNavigator, _d } from "./shared"
import { t } from "lisan"

const metaData = {}
const showElement = (element)=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		switch(element) {
			case "appMenu":
				chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: ()=>{
					document.getElementsByClassName("appLauncher")[0].getElementsByTagName("button")[0].click()
				}})
				break
			case "searchBox":
				chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: ()=>{
					if(document.getElementById("sfnavSearchBox")) {
						document.getElementById("sfnavSearchBox").style.zIndex = 9999
						document.getElementById("sfnavSearchBox").style.opacity = 0.98
						document.getElementById("sfnavQuickSearch").focus()
					}
				}})
				break
		}
	})
}
const getOtherExtensionCommands = (otherExtension, requestDetails, settings = {}, sendResponse)=>{
	const url = requestDetails.domain.replace(/https*:\/\//, '')
	const apiUrl = requestDetails.apiUrl
	let commands = {}
	if(chrome.management) {
		chrome.management.get(otherExtension.id, response => {
			if(chrome.runtime.lastError) { _d(["Extension not found", chrome.runtime.lastError]); return }
			otherExtension.commands.forEach(c=>{
				commands[c.key] = {
					"url": otherExtension.platform + "://" + otherExtension.urlId + c.url.replace("$URL",url).replace("$APIURL",apiUrl),
					"label": t(c.key),
					"key": c.key
				}
			})
			sendResponse(commands)
		})
	}
}

const parseMetadata = (data, serverUrl, qualifiedApiNameToDurableIdMap)=>{
	if (data.length == 0 || typeof data.sobjects == "undefined") return false
	return data.sobjects.reduce((commands, sObjectData) => forceNavigator.createSObjectCommands(commands,  sObjectData,qualifiedApiNameToDurableIdMap, serverUrl), {})
}

const goToUrl = (targetUrl, newTab, settings = {})=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		const re = new RegExp("\\w+-extension:\/\/"+chrome.runtime.id,"g");
		targetUrl = targetUrl.replace(re,'')
		let newUrl = targetUrl.match(/.*?\.com(.*)/)
		newUrl = newUrl ? newUrl[1] : targetUrl
		if(!targetUrl.includes('-extension:'))
			newUrl = tabs[0].url.match(/.*?\.com/)[0] + newUrl
		else
			newUrl = targetUrl
		if(newTab)
			chrome.tabs.create({ "active": false, "url": newUrl })
		else
			chrome.tabs.update(tabs[0].id, { "url": newUrl })
	})
}

chrome.commands.onCommand.addListener((command)=>{
	switch(command) {
		case 'showSearchBox': showElement("searchBox"); break
		case 'showAppMenu': showElement("appMenu"); break
	}
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	var apiUrl = request.serverUrl?.replace('lightning.force.com','my.salesforce.com')
	console.debug(apiUrl + " : " + request.action)
	switch(request.action) {
		case "goToUrl":
			goToUrl(request.url, request.newTab, request.settings)
			break
		case "getOtherExtensionCommands":
			getOtherExtensionCommands(request.otherExtension, request, request.settings, sendResponse)
			break
		case "getApiSessionId":
			request.sid = request.uid = request.domain = request.oid = ""
			chrome.cookies.getAll({name: 'sid'}, (all)=>{
				all.forEach((c)=>{
					if(c.domain==request.serverUrl) {
						request.sid = c.value
						request.domain = c.domain
						request.oid = request.sid.match(/([\w\d]+)/)[1]
					}
				})
				if(request.sid === "") {
					//Alternative method to get the SID. see https://stackoverflow.com/a/34993849
					chrome.cookies.get({url: apiUrl, name: "sid", storeId: sender.tab.cookieStoreId}, c => {
						if (c) {
							request.sid = c.value
							request.domain = c.domain
							request.oid = request.sid.match(/([\w\d]+)/)[1]
						}
						if(request.sid === "") {
							console.log("No session data found for " + request.serverUrl)
							sendResponse({error: "No session data found for " + request.serverUrl})
							return
						}
						forceNavigator.getHTTP( apiUrl + '/services/data/' + forceNavigator.apiVersion, "json",
							{"Authorization": "Bearer " + request.sid, "Accept": "application/json"}
						).then(response => {
							if(response?.identity) {
								request.uid = response.identity.match(/005.*/)[0]
								sendResponse({sessionId: request.sid, userId: request.uid, orgId: request.oid, apiUrl: request.domain})
							}
							else sendResponse({error: "No user data found for " + request.oid})
						})
					}
				)};

			})
			break
		case 'getActiveFlows':
			let flowCommands = {}
                forceNavigator.getServiceDataHTTP("/query/?q=select+ActiveVersionId,Label+from+FlowDefinitionView+where+IsActive=true", "json", request)
				.then(response => {
					let targetUrl = request.domain + "/builder_platform_interaction/flowBuilder.app?flowId="
					response.records.forEach(f=>{
						flowCommands["flow." + f.ActiveVersionId] = {
							"key": "flow." + f.ActiveVersionId,
							"url": targetUrl + f.ActiveVersionId,
							"label": [t("prefix.flows"), f.Label].join(" > ")
						}
					})
					sendResponse(flowCommands)
				}).catch(e=>_d(e))
			break
		case 'getMetadata':
			if(metaData[request.sessionHash] == null || request.force)
                Promise.all([
                    forceNavigator.getServiceDataHTTP('/query/?q=SELECT QualifiedApiName, DurableId FROM EntityDefinition WHERE EditDefinitionUrl != NULL', 'json', request),
                    forceNavigator.getServiceDataHTTP('/sobjects/', 'json', request),
                ])
                    .then(([queryResponse, sobjectResponse]) => {
                        const qualifiedApiNameToDurableIdMap = queryResponse.records.reduce((map, r) => {
                            map[r.QualifiedApiName] = r.DurableId;
                            return map;
                        }, {});
                        // TODO good place to filter out unwanted objects
                        metaData[request.sessionHash] = parseMetadata(sobjectResponse, request.serverUrl, qualifiedApiNameToDurableIdMap);
                        sendResponse(metaData[request.sessionHash]);
                    })
                    .catch(e => _d(e));
			else
				sendResponse(metaData[request.sessionHash])
			break
		case 'createTask':
            forceNavigator.getServiceDataHTTP("/sobjects/Task", "json", request, {"Subject": request.subject, "OwnerId": request.userId}, "POST")
			.then(function (response) { sendResponse(response) })
			break
		case 'searchLogins':
            forceNavigator.getServiceDataHTTP("/query/?q=SELECT Id, Name, Username FROM User WHERE Name LIKE '%25" + request.searchValue.trim() + "%25' OR Username LIKE '%25" + request.searchValue.trim() + "%25'", "json", request)
			.then(function(success) { sendResponse(success) }).catch(function(error) {
				console.error(error)
			})
	}
	return true
})
