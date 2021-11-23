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
					document.getElementById("sfnav_searchBox").style.zIndex = 9999
					document.getElementById("sfnav_searchBox").style.opacity = 0.98
					document.getElementById("sfnav_quickSearch").focus()
				`})
				break
		}
	})
}
var parseSetupTree = (response, url)=>{
	let commands = {}
	let strNameMain, strName
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
		if(url.includes("lightning.force") && Object.keys(setupLabelsToLightningMap).includes(item.innerText))
			targetUrl = url + setupLabelsToLightningMap[item.innerText]
		if(url.includes("lightning.force") && strNameMain.includes("Customize") && Object.keys(classicToLightingMap).includes(item.innerText)) {
			if(commands['List ' + parent ] == null) { commands['List ' + parent ] = {url: url + "/lightning/o/" + pluralize(parent, 1).replace(/\s/g,"") + "/list", key: "List " + parent} }
			if(commands['New ' + pluralize(parent, 1) ] == null) { commands['New ' + pluralize(parent, 1) ] = {url: url + "/lightning/o/" + pluralize(parent, 1).replace(/\s/g,"") + "/new", key: "New " + pluralize(parent, 1)} }
			targetUrl = url + "/lightning/setup/ObjectManager/" + pluralize(parent, 1).replace(/\s/g, "")
			targetUrl += classicToLightingMap[item.innerText]
		}
		if(commands[strName] == null) commands[strName] = {url: targetUrl, key: strName}
	})
	return commands
}
var parseMetadata = (data, url)=>{
	if (data.length == 0 || typeof data.sobjects == "undefined") return false
	return data.sobjects.reduce((commands, { labelPlural, label, name, keyPrefix }) => {
		if (!keyPrefix) {
			return commands
		}
		let baseUrl = "/";
		if (url.includes("lightning.force") && name.endsWith("__mdt")) {
			baseUrl += "lightning/setup/CustomMetadata/page?address=";
		}
		commands["List " + labelPlural] = { key: name, keyPrefix, url: `${baseUrl}/${keyPrefix}` }
		commands["New " + label] = { key: name, keyPrefix, url: `${baseUrl}/${keyPrefix}/e` }
		return commands
	}, {})
}
var parseCustomObjects = (response, url)=>{
	let commands = {}
	let mapKeys = Object.keys(classicToLightingMap)
	;[].map.call(response.querySelectorAll('th a'), function(el) {
		if(url.includes("lightning.force")) {
			let objectId = el.href.match(/\/(\w+)\?/)[1]
			let targetUrl = url + "/lightning/setup/ObjectManager/" + objectId
			commands['Setup > Custom Object > ' + el.text + ' > Details'] = {url: targetUrl + "/Details/view", key: el.text + " > Fields"};
			for (var i = 0; i < mapKeys.length; i++) {
				let key = mapKeys[i]
				let urlElement = classicToLightingMap[ key ]
				commands['Setup > Custom Object > ' + el.text + ' > ' + key] = {url: targetUrl + urlElement, key: el.text + " > " + key}
			}
		} else {
			commands['Setup > Custom Object > ' + el.text] = {url: el.href, key: el.text};
		}
	})
	return commands
}
var goToUrl = (targetUrl, newTab)=>{
	targetUrl = targetUrl.replace(/chrome-extension:\/\/\w+\//,"/")
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		let newUrl = targetUrl.match(/.*?\.com(.*)/)
		newUrl = newUrl ? newUrl[1] : targetUrl
		if(newTab)
			chrome.tabs.create({ active: false, url: tabs[0].url.match(/.*?\.com/)[0] + newUrl})
		else
			chrome.tabs.update(tabs[0].id, { url: tabs[0].url.match(/.*?\.com/)[0] + newUrl})
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
						request.uid = response.identity.match(/005.*/)[0]
						sendResponse({sessionId: request.sid, userId: request.uid, apiUrl: request.domain})
					})
				}
				else sendResponse({error: "No session data found for " + request.key})
			})
		} else sendResponse({error: "Must include orgId"})
	}
	switch(request.action) {
		case 'goToUrl': goToUrl(request.url, request.newTab); break
		case 'getSetupTree':
			if(setupTree[request.sessionHash] == null || request.force)
				getHTTP("https://" + request.apiUrl + "/ui/setup/Setup", "document").then(response => {
					setupTree[request.sessionHash] = parseSetupTree(response, request.domain)
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
						metaData[request.sessionHash] = parseMetadata(response, request.domain)
						sendResponse(metaData[request.sessionHash])
					})
			else
				sendResponse(metaData[request.sessionHash])
			break
		case 'getCustomObjects':
			if(customObjects[request.sessionHash] == null || request.force)
				getHTTP('https://' + request.apiUrl + "/p/setup/custent/CustomObjectsPage", "document").then(response => {
					customObjects[request.sessionHash] = parseCustomObjects(response, request.domain)
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
//				addError(error.responseJSON)
			})
	}
	return true
})