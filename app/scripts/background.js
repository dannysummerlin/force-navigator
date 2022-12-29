var setupTree = {}
var metaData = {}
var customObjects = {}

var showElement = (element)=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		switch(element) {
			case "appMenu":
				chrome.tabs.executeScript(tabs[0].id, {code: 'document.getElementsByClassName("appLauncher")[0].getElementsByTagName("button")[0].click()'})
				break
			case "searchBox":
				chrome.tabs.executeScript(tabs[0].id, {code: `
					if(document.getElementById("sfNavSearchBox")) {
						document.getElementById("sfNavSearchBox").style.zIndex = 9999
						document.getElementById("sfNavSearchBox").style.opacity = 0.98
						document.getElementById("sfNavQuickSearch").focus()
					}
				`})
				break
		}
	})
}
var getOtherExtensionCommands = (otherExtension, requestDetails, settings = {}, sendResponse)=>{
	const url = requestDetails.domain.replace(/https*:\/\//, '')
	const apiUrl = requestDetails.apiUrl
	let commands = {}
	if(chrome.management) {
		chrome.management.get(otherExtension.id, response => {
			if(response) {
				otherExtension.commands.forEach(c=>{
					commands[otherExtension.name + ' > ' + c.label] = {
						"url": otherExtension.platform + "://" + otherExtension.urlId + c.url.replace("$URL",url).replace("$APIURL",apiUrl),
						"key": otherExtension.name + ' > ' + c.label
					}
				})
			} else {
				if(chrome.runtime.lastError) {
					console.debug("Extension not found", chrome.runtime.lastError)
				}
			}
			sendResponse(commands)
		})
	}
}
var parseSetupTree = (response, url, settings = {})=>{
	let commands = {}
	let strNameMain, strName
	// const lightningMode = settings.lightningMode // || url.includes("lightning.force")
	;[].map.call(response.querySelectorAll('.setupLeaf > a[id*="_font"]'), function(item) {
		let hasTopParent = false, hasParent = false
		let parent, topParent, parentEl, topParentEl
		if (![item.parentElement, item.parentElement.parentElement, item.parentElement.parentElement.parentElement].includes(null) && item.parentElement.parentElement.parentElement.className.indexOf('parent') !== -1) {
			hasParent = true
			parentEl = item.parentElement.parentElement.parentElement
			parent = parentEl.querySelector('.setupFolder').innerText
		}
		if(hasParent && ![parentEl.parentElement, parentEl.parentElement.parentElement].includes(null) && parentEl.parentElement.parentElement.className.indexOf('parent') !== -1) {
			hasTopParent = true
			topParentEl = parentEl.parentElement.parentElement
			topParent = topParentEl.querySelector('.setupFolder').innerText
		}
		strNameMain = 'Setup > ' + (hasTopParent ? (topParent + ' > ') : '')
		strNameMain += (hasParent ? (parent + ' > ') : '')
		strName = strNameMain + item.innerText
		let targetUrl = item.href
		if(Object.keys(setupLabelsMap).includes(item.innerText)) {
			targetUrl = url + setupLabelsMap[item.innerText][settings.lightningMode ? 'lightning' : 'classic']
			delete setupLabelsToLightningMap[item.innerText] // may delete
		}
		// Manual fixes -- should look for way to generalize this
		if(settings.lightningMode) {
			if(strName.match(/(Members|Fields)/g)?.length > 1)
				targetUrl = url + '/lightning/setup/ObjectManager/CampaignMember/FieldsAndRelationships/view'
			if(strName.match(/(Opportunity|Product|Fields)/g)?.length > 2)
				targetUrl = url + '/lightning/setup/ObjectManager/OpportunityLineItem/FieldsAndRelationships/view'
			if(strNameMain.includes("Customize") && Object.keys(classicToLightningMap).includes(item.innerText)) {
				let objectLabel = pluralize(parent, 1) // need to add developerName handling for standard objects
				let objectName = objectLabel.replace(/\s/g, "")
					if(objectName.includes('Product')) { objectName += '2' }
				if(commands['List ' + parent ] == null) { commands['List ' + parent ] = {url: url + "/lightning/o/" + objectName + "/list", key: "List " + parent} }
				if(commands['New ' + objectLabel ] == null) { commands['New ' + objectLabel ] = {url: url + "/lightning/o/" + objectName + "/new", key: "New " + objectLabel} }
				if(commands['Setup > Customize > ' + objectLabel + ' > Lightning Record Pages'] == null) {
					commands['Setup > Customize > ' + objectLabel + ' > Lightning Record Pages'] = {
						url: url + "/lightning/setup/ObjectManager/" + objectName + "/LightningPages/view",
						key: "New " + objectLabel
					}
				}
				targetUrl = url + "/lightning/setup/ObjectManager/" + objectName
				targetUrl += classicToLightningMap[item.innerText]
			}
		}
		if(targetUrl.includes('-extension')) {
			targetUrl = targetUrl.replace(item.origin,'')
		}
		if(commands[strName] == null) commands[strName] = {url: targetUrl, key: strName}
	})
	// add Lightning direct links
	if(settings.lightningMode) {
		Object.keys(setupLabelsToLightningMap).forEach(k => {
			if(commands[k] == null) { commands[k] = {
				url: url + setupLabelsToLightningMap[k],
				key: k
			}}
		})
	}
	return commands
}
var parseMetadata = (data, url, settings = {})=>{
	const skipObjects = ["0DM"]
	const lightningMode = settings.lightningMode || url.includes("lightning.force")
	if (data.length == 0 || typeof data.sobjects == "undefined") return false
	return data.sobjects.reduce((commands, { labelPlural, label, name, keyPrefix }) => {
		if (!keyPrefix || skipObjects.includes(keyPrefix)) { return commands }
		let baseUrl = "/";
		if (lightningMode && name.endsWith("__mdt")) {
			baseUrl += "lightning/setup/CustomMetadata/page?address=";
		}
		commands["List " + labelPlural] = { key: name, keyPrefix, url: `${baseUrl}/${keyPrefix}` }
		commands["New " + label] = { key: name, keyPrefix, url: `${baseUrl}/${keyPrefix}/e` }
		return commands
	}, {})
}
var parseCustomObjects = (response, url, settings = {})=>{
	let commands = {}
	let mapKeys = Object.keys(classicToLightningMap)
	const lightningMode = settings.lightningMode || url.includes("lightning.force")
// will likely have to change this to a REST call to get the API names
	;[].map.call(response.querySelectorAll('th a'), function(el) {
		if(lightningMode) {
			let objectId = el.href.match(/\/(\w+)\?/)[1]
			let targetUrl = url + "/lightning/setup/ObjectManager/" + objectId
			commands['Setup > Custom Object > ' + el.text + ' > Details'] = {url: targetUrl + "/Details/view", key: el.text + " > Fields"};
			for (var i = 0; i < mapKeys.length; i++) {
				let key = mapKeys[i]
				let urlElement = classicToLightningMap[ key ]
				commands['Setup > Custom Object > ' + el.text + ' > ' + key] = {url: targetUrl + urlElement, key: el.text + " > " + key}
			}
		} else {
			commands['Setup > Custom Object > ' + el.text] = {url: el.href, key: el.text}
		}
	})
	return commands
}
var goToUrl = (targetUrl, newTab, settings = {})=>{
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
			chrome.tabs.create({ active: false, url: newUrl })
		else
			chrome.tabs.update(tabs[0].id, { url: newUrl })
	})
}

chrome.commands.onCommand.addListener((command)=>{
	switch(command) {
		case 'showSearchBox': showElement("searchBox"); break
		case 'showAppMenu': showElement("appMenu"); break
		case 'goToTasks': goToUrl(".com/00T"); break
		case 'goToReports': goToUrl(".com/00O"); break
	}
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	var orgKey = request.key != null ? request.key.split('!')[0] : request.key
	if (request.action == "getApiSessionId") {
		if (request.key != null) {
			request.sid = request.uid = request.domain = ""
			chrome.cookies.getAll({}, (all)=>{
				all.forEach((c)=>{
					if(c.domain.includes("salesforce.com") && c.value.includes(request.key) && c.name == "sid") {
						request.sid = c.value
						request.domain = c.domain
					}
				})
				if(request.sid != "") {
					getHTTP("https://" + request.domain + '/services/data/' + SFAPI_VERSION, "json",
						{"Authorization": "Bearer " + request.sid, "Accept": "application/json"}
					).then(response => {
						if(response?.identity) {
							request.uid = response.identity.match(/005.*/)[0]
							sendResponse({sessionId: request.sid, userId: request.uid, apiUrl: request.domain})
						}
						else sendResponse({error: "No user data found for " + request.key})
					})
				}
				else sendResponse({error: "No session data found for " + request.key})
			})
		} else sendResponse({error: "Must include orgId"})
	}
	switch(request.action) {
		case 'goToUrl': goToUrl(request.url, request.newTab, request.settings); break
		case 'getOtherExtensionCommands':
			getOtherExtensionCommands(request.otherExtension, request, request.settings, sendResponse)
			break
		case 'getSetupTree':
			if(setupTree[request.sessionHash] == null || request.force)
				getHTTP("https://" + request.apiUrl + "/ui/setup/Setup", "document").then(response => {
					setupTree[request.sessionHash] = parseSetupTree(response, request.domain, request.settings)
					sendResponse(setupTree[request.sessionHash])
				})
			else
				sendResponse(setupTree[request.sessionHash])
			break
		case 'getMetadata':
			if(metaData[request.sessionHash] == null || request.force)
				getHTTP("https://" + request.apiUrl + '/services/data/' + SFAPI_VERSION + '/sobjects/', "json",
					{"Authorization": "Bearer " + request.sessionId, "Accept": "application/json"})
					.then(response => {
						metaData[request.sessionHash] = parseMetadata(response, request.domain, request.settings)
						sendResponse(metaData[request.sessionHash])
					})
			else
				sendResponse(metaData[request.sessionHash])
			break
		case 'getCustomObjects':
			if(customObjects[request.sessionHash] == null || request.force)
				getHTTP('https://' + request.apiUrl + "/p/setup/custent/CustomObjectsPage", "document").then(response => {
					customObjects[request.sessionHash] = parseCustomObjects(response, request.domain, request.settings)
					sendResponse(customObjects[request.sessionHash])
				})
			else
				sendResponse(customObjects[request.sessionHash])
			break
		case 'createTask':
			getHTTP("https://" + request.apiUrl + "/services/data/" + SFAPI_VERSION + "/sobjects/Task",
				"json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" },
				{"Subject": request.subject, "OwnerId": request.userId}, "POST")
			.then(function (response) { sendResponse(response) })
			break
		case 'searchLogins':
			getHTTP("https://" + request.apiUrl + "/services/data/" + SFAPI_VERSION + "/tooling/query/?q=SELECT+Id,+Name,+Username+FROM+User+WHERE+Name+LIKE+'%25" + request.searchValue + "%25'+OR+Username+LIKE+'%25" + request.searchValue + "%25'", "json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" })
			.then(function(success) { sendResponse(success) }).catch(function(error) {
				console.log(error)
			})
	}
	return true
})