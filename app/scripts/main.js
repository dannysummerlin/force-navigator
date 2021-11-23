// @copyright 2012+ Daniel Nakov / Silverline CRM
// http://silverlinecrm.com
// @copyright 2019+ Danny Summerlin
var orgId = null
var userId = null
var sessionId = null
var sessionHash = null
var serverInstance = ''
var apiUrl = ''
var ctrlKey = false
var commands = {}
var searchBox
var listPosition = -1
var mouseClickLoginAsUserId
var loaded = false


var sfnav = (()=>{
	function loadCommands(force) {
		if(serverInstance == null || orgId == null || sessionId == null) { init(); return false }
		commands['Refresh Metadata'] = {}
		commands['Merge Accounts'] = {}
		commands['Toggle Lightning'] = {}
		commands['Setup'] = {}
		commands['?'] = {}
		commands['Home'] = {}
		let options = {
			sessionHash: sessionHash,
			domain: serverInstance,
			apiUrl: apiUrl,
			key: sessionHash,
			sessionId: sessionId
		}
		chrome.runtime.sendMessage(Object.assign(options, {
			action:'getSetupTree'
		}), response=>{ Object.assign(commands, response) })
		chrome.runtime.sendMessage(Object.assign(options, {
			action:'getMetadata'
		}), response=>{ Object.assign(commands, response) })
		chrome.runtime.sendMessage(Object.assign(options, {
			action:'getCustomObjects'
		}), response=>{ Object.assign(commands, response) })
		hideLoadingIndicator()
	}
	function invokeCommand(cmd, newTab, event) {
		if(cmd == "") { return false }
		let checkCmd = cmd.toLowerCase()
		let targetUrl = ""
		switch(checkCmd) {
			case "refresh metadata":
				showLoadingIndicator()
				loadCommands(true)
				document.getElementById("sfnav_quickSearch").value = ""
				return true
				break
			case "toggle lightning":
				let mode
				if(window.location.href.includes("lightning.force")) mode = "classic"
				else mode = "lex-campaign"
				targetUrl = serverInstance + "/ltng/switcher?destination=" + mode
				break
			case "setup":
				if(serverInstance.includes("lightning.force"))
					targetUrl = serverInstance + "/lightning/setup/SetupOneHome/home"
				else
					targetUrl = serverInstance + "/ui/setup/Setup"
				break
			case "home":
				targetUrl = serverInstance + "/"
				break
		}
		if(checkCmd.substring(0,9) == 'login as ') { loginAs(cmd, newTab); return true }
		else if(checkCmd.substring(0,14) == "merge accounts") { launchMergerAccounts(cmd.substring(14).trim()) }
		else if(checkCmd.substring(0,14) == "merge contacts") { launchMergerContacts(cmd.substring(14).trim()) }
		// else if(checkCmd.substring(0,11) == "merge cases") { launchMergerCases(cmd.substring(11).trim()) } //TODO more complicated merge call, will make later
		else if(checkCmd.substring(0,1) == "!") { createTask(cmd.substring(1).trim()) }
		else if(checkCmd.substring(0,1) == "?") { targetUrl = searchTerms(cmd.substring(1).trim()) }
		else if(typeof commands[cmd] != 'undefined' && commands[cmd].url) { targetUrl = commands[cmd].url }
		else if(debug && !checkCmd.includes("create a task: !") && !checkCmd.includes("global search usage")) {
			console.log(cmd + " not found in command list or incompatible")
			return false
		}
		if(targetUrl != "") {
			hideSearchBox()
			if(newTab)
				goToUrl(targetUrl, newTab)
			else
				goToUrl(targetUrl)
			return true
		} else { return false }
	}
	const goToUrl = (url, newTab) => { chrome.runtime.sendMessage({
		action: 'goToUrl', url: url, newTab: newTab
	} , response=>{}) }
	const searchTerms = terms => {
		let targetUrl = 
		if(serverInstance.includes('.force.com'))
			return serverInstance + "/one/one.app#" + btoa(JSON.stringify({"componentDef":"forceSearch:search","attributes":{"term": terms,"scopeMap":{"type":"TOP_RESULTS"},"context":{"disableSpellCorrection":false,"SEARCH_ACTIVITY":{"term": terms}}}}))
		else
			return serverInstance + "/_ui/search/ui/UnifiedSearchResults?sen=ka&sen=500&str=" + encodeURI(terms) + "#!/str=" + encodeURI(terms) + "&searchAll=true&initialViewMode=summary"
	}
	const pasteFromClipboard = newtab =>{
		let cb = document.createElement("textarea")
		let body = document.getElementsByTagName('body')[0]
		body.appendChild(cb)
		cb.select()
		document.execCommand('paste')
		const clipboardValue = cb.value.trim()
		cb.remove()
		return clipboardValue
	}
	const getIdFromUrl = ()=>{
		const url = document.location.href
		const ID_RE = [
			/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{18})[^\w]*/, // tries to find the first 18 digit
			/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{15})[^\w]*/ // falls back to 15 digit
		]
		for(let i in ID_RE) {
			let match = url.match(ID_RE[i])
			if (match != null) { return match[1] }
		}
		return false
	}
	const launchMerger = (otherId, object)=>{
		if(!otherId)
			otherId = pasteFromClipboard()
		if(![15,18].includes(otherId.length)) {
			clearOutput()
			addWord('[ERROR: you must have an Account ID in your clipboard or type one after the merge command]')
			return
		}
		const thisId = getIdFromUrl()
		if(thisId)
			switch(object) {
				case 'Account':
					document.location.href = `${serverInstance}/merge/accmergewizard.jsp?goNext=+Next+&cid=${otherId}&cid=${thisId}`
					break
				case 'Contact':
					document.location.href = `${serverInstance}/merge/conmergewizard.jsp?goNext=+Next+&cid=${otherId}&cid=${thisId}`
					break
				case 'Case':
					//TODO - needs to be a post request, so fetch or background will have to happen here
					/*
					const options = {
						method: 'POST',
						body: `{"message": {
							"actions": [{
								"id":"2319;a",
								"descriptor":"serviceComponent://ui.merge.components.controller.MergeController/ACTION$loadMergeComparisonData",
								"callingDescriptor":"UNKNOWN",
								"params":{"recordIds":[otherId,thisId]}
							}]
						}}`
					}
						fetch(serverInstance+"/aura?r=23&ui-merge-components-controller.Merge.loadMergeComparisonData=1",options)
					*/
					break
			}
	}
	const launchMergerAccounts = otherId => launchMerger(otherId, 'Account')
	const launchMergerContacts = otherId => launchMerger(otherId, 'Contact')
	const launchMergerCases = otherId => launchMerger(otherId, 'Case')
	const createTask = subject => {
		showLoadingIndicator()
		if(subject != "" && userId) {
			chrome.runtime.sendMessage({
					action:'createTask', apiUrl: apiUrl,
					key: sessionHash, sessionId: sessionId,
					domain: serverInstance, sessionHash: sessionHash,
					subject: subject, userId: userId
				}, response=>{
					if(response.errors.length == 0) {
						clearOutput()
						commands["Go To Created Task"] = {url: serverInstance + "/"+ response.id }
						document.getElementById("sfnav_quickSearch").value = ""
						addWord('Go To Created Task')
						addWord('(press escape to exit or enter a new command)')
						let firstEl = document.querySelector('#sfnav_output :first-child')
						if(listPosition == -1 && firstEl != null)
							firstEl.className = "sfnav_child sfnav_selected"
						hideLoadingIndicator()
					}
			})
		}
	}
	const loginAs = (cmd, newTab) => {
		let cmdSplit = cmd.split(' ')
		let searchValue = cmdSplit[2]
		if(cmdSplit[3] !== undefined)
			searchValue += '+' + cmdSplit[3]
		showLoadingIndicator()
		chrome.runtime.sendMessage({
			action:'searchLogins', apiUrl: apiUrl,
			key: sessionHash, sessionId: sessionId,
			domain: serverInstance, sessionHash: sessionHash,
			searchValue: searchValue, userId: userId
		}, success=>{
			const numberOfUserRecords = success.records.length
			hideLoadingIndicator()
			if(numberOfUserRecords < 1)
				addError([{"message":"No user for your search exists."}])
			else if(numberOfUserRecords > 1) 
				loginAsShowOptions(success.records)
			else
				loginAsPerform( success.records[0].Id, newTab)
		})
	}
	function loginAsShowOptions(records) {
		for(let i = records.length; i >= 1; --i) {
			let cmd = 'Login As ' + records[i].Name
			commands[cmd] = {key: cmd, id: records[i].Id}
			addWord(cmd)
		}
		let firstEl = document.querySelector('#sfnav_output :first-child')
		if(listPosition == -1 && firstEl != null) firstEl.className = "sfnav_child sfnav_selected"
	}
	function loginAsPerform(userId, newTab) {
		hideSearchBox()
		goToUrl("https://" + apiUrl + "/servlet/servlet.su?oid=" + orgId
			+ "&suorgadminid=" + userId
			+ "&retURL=" + encodeURIComponent(window.location.pathname)
			+ "&targetURL=" + encodeURIComponent(window.location.pathname) + "&"
		, newTab)
		return true
	}

// interaction
	Mousetrap = (function(Mousetrap) {
		var _global_callbacks = {},
			_original_stop_callback = Mousetrap.stopCallback
		Mousetrap.stopCallback = function(e, element, combo) {
			if (_global_callbacks[combo]) { return false }
			return _original_stop_callback(e, element, combo)
		}
		Mousetrap.bindGlobal = function(keys, callback, action) {
			Mousetrap.bind(keys, callback, action)
			if (keys instanceof Array) {
				for (var i = 0; i < keys.length; i++) { _global_callbacks[keys[i]] = true }
				return
			}
			_global_callbacks[keys] = true
		}
		return Mousetrap
	})(Mousetrap)
	const mouseHandler = function () {
		this.classList.add('sfnav_selected')
		mouseClickLoginAsUserId = this.getAttribute("id")
		return true
	}
	const mouseClick = function() {
		document.getElementById("sfnav_quickSearch").value = this.firstChild.nodeValue
		listPosition = -1
		setVisibleSearch("hidden")
		if(!window.ctrlKey)
			invokeCommand(this.firstChild.nodeValue, false,'click')
		else
			hideSearchBox()
		return true
	}
	const mouseHandlerOut = function() { this.classList.remove('sfnav_selected'); return true }
	const mouseClickLoginAs = function() { loginAsPerform(mouseClickLoginAsUserId); return true }
	const bindShortcuts = function() {
		let searchBar = document.getElementById('sfnav_quickSearch')
		Mousetrap.bindGlobal('esc', function(e) { hideSearchBox() })
		Mousetrap.wrap(searchBar).bind('enter', kbdCommand)
		for(let i = newTabKeys.length; i >= 1; --i) // TODO verify this is using the right lower limit
			Mousetrap.wrap(searchBar).bind(newTabKeys[i], kbdCommand)
		Mousetrap.wrap(searchBar).bind('down', selectMove.bind(this, 'down'))
		Mousetrap.wrap(searchBar).bind('up', selectMove.bind(this, 'up'))
		Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('backspace', function(e) { listPosition = -1 })
		document.getElementById('sfnav_quickSearch').oninput = function(e) {
			lookAt()
			return true
		}
	}

// interface
	function showLoadingIndicator() { document.getElementById('sfnav_loader').style.visibility = 'visible' }
	function hideLoadingIndicator() { document.getElementById('sfnav_loader').style.visibility = 'hidden' }
	const hideSearchBox = ()=>{
		let searchBar = document.getElementById('sfnav_quickSearch')
		searchBar.blur()
		clearOutput()
		searchBar.value = ''
		setVisibleSearch("hidden")
	}
	const setVisibleSearch = visibility => {
		let searchBox = document.getElementById("sfnav_searchBox")
		if(visibility == "hidden") {
			searchBox.style.opacity = 0
			searchBox.style.zIndex = -1
		} else {
			searchBox.style.opacity = 0.98
			searchBox.style.zIndex = 9999
			document.getElementById("sfnav_quickSearch").focus()
		}
	}
	const lookAt = ()=>{
		const newSearchVal = document.getElementById('sfnav_quickSearch').value
		if(newSearchVal !== '')
			addElements(newSearchVal)
		else {
			document.querySelector('#sfnav_output').innerHTML = ''
			listPosition = -1
		}
	}
	const addElements = input => {
		clearOutput()
		if(input[0] === "?") addWord('Global Search Usage: ? <Search term(s)>')
		else if(input[0] === "!") addWord('Create a Task: ! <Subject line>')
		else {
			let words = getWord(input, commands)
			if(words.length > 0)
				for (let i = words.length;i >= 1; --i)
					addWord(words[i])
			else
				listPosition = -1
		}
		if('login as'.includes(input.toLowerCase()))
			addWord('Usage: login as <FirstName> <LastName> OR <Username>')
		let firstEl = document.querySelector('#sfnav_output :first-child')
		if(listPosition == -1 && firstEl != null)
			firstEl.className = "sfnav_child sfnav_selected"
	}
	const getWord = (input, wordList)=>{
		if(typeof input === 'undefined' || input === '') return []
		let foundCommands = [],
			listItems = [],
			terms = input.toLowerCase().split(" ")
		for(let key in wordList) {
			if(listItems.length > 10) break // stop at 10 since we can't see longer than that anyways - should make this a setting
			if(key.toLowerCase().indexOf(input) != -1) {
				listItems.push({num: 10, key: key})
			} else {
				let match = false
		// TODO the logic here seems flawed, like it should increment the sortValue so that the higher number of matches the great the value
				let sortValue = 0
				for(let i = terms.length;i >= 0; --i) {
					if(key.toLowerCase().indexOf(terms[i]) != -1) {
						// match++
						match = true
						// sortValue = 1
						sortValue++
					}
				}
		// and this part should use a match > 0 and then the adjusted sortValue
				// if (match == terms.length)
				if (match)
					listItems.push({num : sortValue, key : key})
			}
		}
		listItems.sort((a,b)=>{ return b.num > a.num ? -1 : 1 }) // need to verify this sorting method
		for(var i = listItems.length;i >= 0; --i)
			foundCommands.push(listItems[i].key)
		return foundCommands
	} 
	const addWord = word => {
		let d = document.createElement("div")
		let newCommand
		if(commands[word] != null && commands[word].url != null && commands[word].url != "") {
			newCommand = document.createElement("a")
			if(commands[word].url.startsWith('//'))
				commands[word].url = commands[word].url.replace('//','/')
			newCommand.setAttribute("href", commands[word].url)
		} else { newCommand = d }
		if(commands[word] != null && commands[word].id != null && commands[word].id != "")
			newCommand.id = commands[word].id
		newCommand.classList.add('sfnav_child')
		newCommand.appendChild(document.createTextNode(word))
		newCommand.onmouseover = mouseHandler
		newCommand.onmouseout = mouseHandlerOut
		newCommand.onclick = mouseClick
		if(newCommand.id && newCommand.length > 0) // TODO huh? is there some other check I should do?
			newCommand.onclick = mouseClickLoginAs
		searchBox.appendChild(newCommand)
	}
	const addError = text => {
		clearOutput()
		let err = document.createElement("div")
		err.className = "sfnav_child sfnav-error-wrapper"
		err.appendChild(document.createTextNode('Error! '))
		err.appendChild(document.createElement('br'))
		for(var i = text.length;i >= 0;--i) {
			err.appendChild(document.createTextNode(text[i].message))
			err.appendChild(document.createElement('br'))
		}
		searchBox.appendChild(err)
	}
	function clearOutput() { if(typeof searchBox != 'undefined') searchBox.innerHTML = "" }
	function kbdCommand(e, key) {
		let position = listPosition
		let origText = '', newText = ''
		if(position < 0) position = 0
			origText = document.getElementById("sfnav_quickSearch").value
		if(typeof searchBox.childNodes[position] != 'undefined')
			newText = searchBox.childNodes[position].firstChild.nodeValue
		let newTab = newTabKeys.indexOf(key) >= 0 ? true : false
		if(!newTab)
			clearOutput()
		if(!invokeCommand(newText, newTab))
			invokeCommand(origText, newTab)
	}
	function selectMove(direction) {
		let searchBar = document.getElementById('sfnav_quickSearch')
		let firstChild
		let words = []
		for (var i = 0; i < searchBox.childNodes.length; i++)
			words.push(searchBox.childNodes[i].textContent)
		if(searchBox.childNodes[listPosition] != null)
			firstChild = searchBox.childNodes[listPosition].firstChild.nodeValue
		else
			firstChild = null
		let isLastPos = direction == 'down' ? listPosition < words.length-1 : listPosition >= 0
		if (words.length > 0 && isLastPos) {
			if(listPosition < 0) listPosition = 0
				listPosition = listPosition + (direction == 'down' ? 1 : -1)
			if(searchBox.childNodes[listPosition] != null)
				firstChild = searchBox.childNodes[listPosition].firstChild.nodeValue
			else
				firstChild = null
			if (listPosition >=0) {
				searchBox.childNodes[listPosition + (direction == 'down' ? -1 : 1) ].classList.remove('sfnav_selected')
				searchBox.childNodes[listPosition].classList.add('sfnav_selected')
				searchBox.childNodes[listPosition].scrollIntoViewIfNeeded()
				return false
			}
		}
	}

// setup
	function init() {
		try {
			document.onkeyup = (ev)=>{ window.ctrlKey = ev.ctrlKey }
			document.onkeydown = (ev)=>{ window.ctrlKey = ev.ctrlKey }
			orgId = document.cookie.match(/sid=([\w\d]+)/)[1]
			serverInstance = getServerInstance()
			sessionHash = getSessionHash()
			if(sessionId == null) {
				chrome.runtime.sendMessage({ action: 'getApiSessionId', key: orgId }, response=>{
					if(response.error) console.log("response", orgId, response, chrome.runtime.lastError)
					else {
						sessionId = unescape(response.sessionId)
						userId = unescape(response.userId)
						apiUrl = unescape(response.apiUrl)
						var div = document.createElement('div')
						div.setAttribute('id', 'sfnav_searchBox')
						var loaderURL = chrome.extension.getURL("images/ajax-loader.gif")
						var logoURL = chrome.extension.getURL("images/sf-navigator128.png")
						div.innerHTML = `
<div class="sfnav_wrapper">
	<input type="text" id="sfnav_quickSearch" autocomplete="off"/>
	<img id="sfnav_loader" src= "${loaderURL}"/>
	<img id="sfnav_logo" src= "${logoURL}"/>
</div>
<div class="sfnav_shadow" id="sfnav_shadow"/>
<div class="sfnav_output" id="sfnav_output"/>
`
						document.body.appendChild(div)
						searchBox = document.getElementById("sfnav_output")
						hideLoadingIndicator()
						bindShortcuts()
						loadCommands()
					}
				})
			}
		} catch(e) { if(debug) console.log(e) }
	}
	init()
})()