import { forceNavigator, forceNavigatorSettings, _d, sfObjectsGetData } from "./shared"
import { t } from "lisan"
const metaData = {}
let commandsHistory={}

const showElement = (element)=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		switch(element) {
			case "appMenu":
				chrome.tabs.executeScript(tabs[0].id, {code: 'document.getElementsByClassName("appLauncher")[0].getElementsByTagName("button")[0].click()'})
				break
			case "searchBox":
				chrome.tabs.executeScript(tabs[0].id, {code: `
					if(document.getElementById("sfnavSearchBox")) {
						document.getElementById("sfnavSearchBox").style.zIndex = 9999
						document.getElementById("sfnavSearchBox").style.opacity = 0.98
						document.getElementById("sfnavQuickSearch").focus()
					}
				`})
				break
		}
	})
}

/*
 Load the compact layout for an object.  Later in search, these fields will be displayed in the resutls.
 Loading the layout:   "/services/data/v56.0/compactLayouts?q=Case"
	Case.fieldItems[1].label - label
	Case.fieldItems[1].layoutComponents[0].details.name - field name
*/
const loadCompactLayoutForSobject = (sobject,options,compactLayoutFieldsForSobject,sendResponse=null) => {
	//console.log("loadCompactLayoutForSobject " + sobject  + ".  options:",options)
	let url ="https://" + options.apiUrl + '/services/data/' + forceNavigator.apiVersion + '/compactLayouts?q=' + encodeURI(sobject)
	forceNavigator.getHTTP(url,"json", {"Authorization": "Bearer " + options.sessionId, "Accept": "application/json"})
	.then(response => {
		console.log("Request " +  url + " respnse : " , response)
		if(response && response.error) { console.error("response", response, chrome.runtime.lastError); return }
		let mainFields=""
		//response has one element called by the sobject name. identify it
		for (const responseKey in response) {
			if (response.hasOwnProperty(responseKey)) {
				response[responseKey].fieldItems.forEach(f=>{
					mainFields += f.layoutComponents[0].details.name + ","
				})
			}
		}
		mainFields = mainFields.slice(0,-1)
		compactLayoutFieldsForSobject[sobject]=mainFields
		console.log("m,="+mainFields)
		if (sendResponse)
			sendResponse({"mainFields": mainFields})
		else
			return mainFields
	}).catch(e=>_d(e))
}

/*
 Do a search for objects on SF.
 searchQuery would be an array of strings to perform the SOSL search

 parameters:
	 searchQuery - text query entered by user
		options - hash passed from caller with context information
		sendResponse - a callback from the main page
*/
const doSearch = (searchQuery,options,sendResponse,labelToNameFieldMapping,labelToSobjectApiNameMapping,compactLayoutFieldsForSobject) => {
	//clean and identift what is searched:  What is the Sobject and what is the query
	searchQuery = searchQuery.replace(/^\?\s*/,'')
	let searchQueryArray = searchQuery.split(/([^\s"]+|"[^"]*")+/g).filter(value => (value != ' ' && value != ''))
	let searchSobject=searchQueryArray[0]?.replaceAll('"','')
	let lc_searchSobject = searchSobject.toLowerCase()
	searchQueryArray.shift() //remove the sobject
	let searchText=searchQueryArray.join(" ").trim()
	if (searchText.startsWith('"') && searchText.endsWith('"'))
		searchText = searchText.slice(1, -1)
	//encode special characters:
	const specialChars = ['?', '&', '|', '!', '{', '}', '[', ']', '(', ')', '^', '~', '*', ':', '\\', '"', '\'', '+', '-']
	for (const char of specialChars) {
		const regex = new RegExp('\\' + char, 'g')
		searchText = searchText.replace(regex, '\\' + char)
	}
	//Which API field is the "Name" field of the record (account name, case number, product name, etc)
	const nameField = labelToNameFieldMapping[lc_searchSobject]
	if (!nameField) {
		console.table(labelToNameFieldMapping)
		sendResponse({ "error": "can't find field " + lc_searchSobject})
		return
	}
	const objectApiName = labelToSobjectApiNameMapping[lc_searchSobject]
	const lc_objectApiName = objectApiName.toLowerCase()
	let fieldsToReturn=""
	if (compactLayoutFieldsForSobject[lc_objectApiName]!=undefined) {
		fieldsToReturn=`(Id,${compactLayoutFieldsForSobject[lc_objectApiName]})`
	} else {
		console.log("compactLayoutFieldsForSobject is missing for "+lc_objectApiName+":",compactLayoutFieldsForSobject)
		fieldsToReturn=`(Id,${nameField})`
	}
	let SOQLQuery = `FIND {${searchText}} IN NAME FIELDS RETURNING ${objectApiName} ${fieldsToReturn} LIMIT 7`
	let url ="https://" + options.apiUrl + '/services/data/' + forceNavigator.apiVersion + '/search/?q=' + encodeURI(SOQLQuery)
	forceNavigator.getHTTP(url,"json", {"Authorization": "Bearer " + options.sessionId, "Accept": "application/json"})
	.then(response => {
		console.info("doSearch Resposne:`n", response)
		if(response && response.error) { console.error("response", response, chrome.runtime.lastError); return }
		sendResponse({
			"searchRecords": response.searchRecords,
			"searchObject" : lc_searchSobject,
			"objectApiName" : objectApiName,
			"mainFields": compactLayoutFieldsForSobject[objectApiName]})
		return
	}).catch(e=>_d(e))
}

/*
 get details of an object (fields, page layouts, etc)
 sourceCommand == forceNavigator.commands[command] object
 options - hash passed from caller with context information
 sendResponse - a callback from the main page
*/
const getMoreData = (sourceCommand,options,sendResponse)=>{
	let apiname = sourceCommand.apiname
	let label = sourceCommand.label
	let key = sourceCommand.key
	//last element in the key indicates what to load
	let commandArray = key.split('.')
	let infoToGet = commandArray[commandArray.length-1]
	if (sourceCommand.detailsAlreadyLoaded) {
		sendResponse({ "info": "already loaded data for " + infoToGet })
		return
	}
	//Find the relevant query for this object, based on sfObjectsGetData
	let baseurl="https://" + options.apiUrl + '/services/data/' + forceNavigator.apiVersion
	let url = ""
	try {
		if (typeof sfObjectsGetData[infoToGet] != "undefined") {
			url = baseurl + sfObjectsGetData[infoToGet].getDataRequest(apiname)
		} else {
			sendResponse({ "info": "can't expand field " + infoToGet})
			return
		}
	} catch (e){
		_d(e)
	}
	forceNavigator.getHTTP(url,"json", {"Authorization": "Bearer " + options.sessionId, "Accept": "application/json"})
	.then(response => {
		if(response && response.error) { console.error("response", response, chrome.runtime.lastError); return }
		//use the "processResponse" for this object type, to generate the list of commands
		let objCommands= sfObjectsGetData[infoToGet].processResponse(apiname,label,response)
		Object.assign(metaData[options.sessionHash], objCommands)
		sendResponse(objCommands)
	}).catch(e=>_d(e))
}

const getOtherExtensionCommands = (otherExtension, requestDetails, settings = {}, sendResponse)=>{
	const url = requestDetails.domain.replace(/https*:\/\//, '')
	const apiUrl = requestDetails.apiUrl
	let commands = {}
	if(chrome.management) {
		chrome.management.get(otherExtension.id, response => {
			if(chrome.runtime.lastError) { _d("Extension not found", chrome.runtime.lastError); return }
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

const parseMetadata = (data, url, settings = {}, serverUrl)=>{
	if (data.length == 0 || typeof data.sobjects == "undefined")
		return false
	const mapKeys = Object.keys(forceNavigator.objectSetupLabelsMap)
	return data.sobjects.reduce((commands, sObjectData) => forceNavigator.createSObjectCommands(commands, sObjectData, serverUrl), {})
}

const goToUrl = (targetUrl, newTab, settings = {})=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		const re = new RegExp("\\w+-extension:\/\/"+chrome.runtime.id,"g")
		targetUrl = targetUrl.replace(re,'')
		let newUrl = targetUrl.match(/.*?\.com(.*)/)
		newUrl = newUrl ? newUrl[1] : targetUrl
		if(!targetUrl.includes('-extension:'))
			newUrl = tabs[0].url.match(/.*?\.com/)[0] + newUrl
		else
			newUrl = targetUrl
		if(newTab)
			chrome.tabs.create({ "active": false, "url": newUrl, "index" : (tabs[0].index+1) })
		else
			chrome.tabs.update(tabs[0].id, { "url": newUrl })
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
	var apiUrl = request.serverUrl?.replace('lightning.force.com','my.salesforce.com')
	switch(request.action) {
		case "goToUrl":
			goToUrl(request.url, request.newTab, request.settings)
			break
		case "getOtherExtensionCommands":
			getOtherExtensionCommands(request.otherExtension, request, request.settings, sendResponse)
			break
		case "getApiSessionId":
			request.sid = request.uid = request.domain = request.oid = ""
			chrome.cookies.getAll({}, (all)=>{
				all.forEach((c)=>{
					if(c.domain == request.serverUrl && c.name === "sid") {
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
				)}
			})
			break
		case 'getActiveFlows':
			let flowCommands = {}
			forceNavigator.getHTTP("https://" + request.apiUrl + '/services/data/' + forceNavigator.apiVersion + '/query/?q=select+ActiveVersionId,Label+from+FlowDefinitionView+where+IsActive=true', "json",
				{"Authorization": "Bearer " + request.sessionId, "Accept": "application/json"})
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
		case 'getSobjectNameFields':
			let labelToSobjectApiNameMapping = {}
			let labelToNameFieldMapping = {}
			const q = encodeURI("select QualifiedApiName, EntityDefinition.QualifiedApiName,EntityDefinition.MasterLabel from FieldDefinition where (EntityDefinition.QualifiedApiName like '%') and IsNameField = true")
/*
output format:
	EntityDefinition.QualifiedApiName	EntityDefinition.MasterLabel		QualifiedApiName
	----------------				------------------				--------
	API Name of the object			Object Label					Name field for this object
	----------------				------------------				--------
	Product2						Product						Name
	Problem						Problem						ProblemNumber
	ActivityHistory				Activity History				Subject
*/
			forceNavigator.getHTTP("https://" + request.apiUrl + '/services/data/' + forceNavigator.apiVersion + '/query/?q=' + q , "json",
				{"Authorization": "Bearer " + request.sessionId, "Accept": "application/json"})
				.then(response => {
					response.records.forEach(f=>{
						const nameField = f.QualifiedApiName
						const apiName = f.EntityDefinition.QualifiedApiName
						let objectLabel = f.EntityDefinition.MasterLabel.toLowerCase()
						if (labelToSobjectApiNameMapping[objectLabel]) {
							//Duplicate label. add the API Name to distibguish the two (for example, Calendar and CalendarView have the same label)
							objectLabel = objectLabel + "(" + apiName +")"
						}
						objectLabel = objectLabel.replace(/['\"]/g, "")
						labelToSobjectApiNameMapping[objectLabel]=apiName
						labelToNameFieldMapping[objectLabel]=nameField
					})
					sendResponse({"labelToNameFieldMapping":labelToNameFieldMapping,"labelToSobjectApiNameMapping":labelToSobjectApiNameMapping})
				}).catch(e=>_d(e))
			break
		case 'getMetadata':
			if(metaData[request.sessionHash] == null || request.force)
				forceNavigator.getHTTP("https://" + request.apiUrl + '/services/data/' + forceNavigator.apiVersion + '/sobjects/', "json",
					{"Authorization": "Bearer " + request.sessionId, "Accept": "application/json"})
					.then(response => {
						// TODO good place to filter out unwanted objects
						metaData[request.sessionHash] = parseMetadata(response, request.domain, request.settings, request.serverUrl)
						sendResponse(metaData[request.sessionHash])
					}).catch(e=>_d(e))
			else
				sendResponse(metaData[request.sessionHash])
			break
		case 'getMoreData':
			getMoreData(request.sourceCommand,request,sendResponse)
			break
		case 'doSearch':
			doSearch(request.searchQuery, request, sendResponse,request.labelToNameFieldMapping,request.labelToSobjectApiNameMapping,request.compactLayoutFieldsForSobject)
			break
		case 'loadCompactLayoutForSobject':
			loadCompactLayoutForSobject(request.sobject, request, request.compactLayoutFieldsForSobject, sendResponse)
			break
		case 'createTask':
			forceNavigator.getHTTP("https://" + request.apiUrl + "/services/data/" + forceNavigator.apiVersion + "/sobjects/Task",
				"json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" },
				{"Subject": request.subject, "OwnerId": request.userId}, "POST")
			.then(function (response) { sendResponse(response) })
			break
		case 'searchLogins':
			forceNavigator.getHTTP("https://" + request.apiUrl + "/services/data/" + forceNavigator.apiVersion + "/query/?q=SELECT Id, Name, Username FROM User WHERE Name LIKE '%25" + request.searchValue.trim() + "%25' OR Username LIKE '%25" + request.searchValue.trim() + "%25'", "json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" })
			.then(function(success) { sendResponse(success) }).catch(function(error) {
				console.error(error)
			})
			break
		case 'help':
			chrome.tabs.create({url: chrome.extension.getURL('popup.html')})
			break
		case 'updateLastCommand':
			if (request.key == undefined || request.url == undefined)
				break
			if (commandsHistory[ request.orgId ] == undefined)
				commandsHistory[ request.orgId ] = []
			var command=[ request.key, request.url ]
			//if already exists in history, move it to top
			for (var i=commandsHistory[ request.orgId ].length - 1; i>=0; i--) {
				if (commandsHistory[ request.orgId ][i][0] == request.key) {
					commandsHistory[ request.orgId ].splice( i, 1)
					break
				}
			}
			commandsHistory[ request.orgId ].push(command)
			if (commandsHistory[ request.orgId ].length > 8) {
				commandsHistory[ request.orgId ].shift()
			}
			break
		case 'getCommandsHistory':
			sendResponse({ "commandsHistory": commandsHistory[ request.orgId ] })
			break
	}
	return true
})