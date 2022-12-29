import { watch, reactive, template } from '@arrow-js/core'

const sfnav = (function() {
	let outp
	let oldins
	let posi = -1
	let input
	let key
	let metaData = {}
	let serverInstance = getServerInstance()
	let cmds = {}
	let isCtrl = false
	let clientId
	let loaded=false
	let shortcut
	let sid
	let SFAPI_VERSION = 'v28.0'
	let ftClient
	let customObjects = {}
	var META_DATATYPES = {
		"AUTONUMBER": {name:"AutoNumber",code:"auto", params:0},
		"CHECKBOX": {name:"Checkbox",code:"cb", params:0},
		"CURRENCY": {name:"Currency",code:"curr", params:2},
		"DATE": {name:"Date",code:"d", params:0},
		"DATETIME": {name:"DateTime",code:"dt", params:0},
		"EMAIL": {name:"Email",code:"e", params:0},
		"FORMULA": {name:"FORMULA",code:"form"},
		"GEOLOCATION": {name:"Location",code:"geo"},
		"HIERARCHICALRELATIONSHIP": {name:"Hierarchy",code:"hr" },
		"LOOKUP": {name:"Lookup",code:"look"},
		"MASTERDETAIL": {name:"MasterDetail",code:"md"},
		"NUMBER": {name:"Number",code:"n"},
		"PERCENT": {name:"Percent",code:"per"},
		"PHONE": {name:"Phone",code:"ph"},
		"PICKLIST": {name:"Picklist",code:"pl"},
		"PICKLISTMS": {name:"MultiselectPicklist",code:"plms"},
		"ROLLUPSUMMARY": {name:"Summary",code:"rup"},
		"TEXT": {name:"Text",code:"t"},
		"TEXTENCRYPTED": {name:"EcryptedText",code:"te"},
		"TEXTAREA": {name:"TextArea",code:"ta"},
		"TEXTAREALONG": {name:"LongTextArea",code:"tal"},
		"TEXTAREARICH": {name:"Html",code:"tar"},
		"URL": {name:"Url",code:"url"}
	}

	function httpGet(url, callback) {
	 var req = new XMLHttpRequest()
	 req.open("GET", url, true)
	 req.setRequestHeader("Authorization", sid)
	 req.onload = function(response) {
		 callback(response)
	 }
	 req.send()
	}
	function updateField(cmd) {
		var arrSplit = cmd.split(' ')
		var dataType = ''
		var fieldMetadata
		if(arrSplit.length >= 3) {
			for(var key in META_DATATYPES) {
				if(META_DATATYPES[key].name.toLowerCase() === arrSplit[3].toLowerCase()) {
					dataType = META_DATATYPES[key].name
					break
				}
			}
			var sObjectName = arrSplit[1]
			var fieldName = arrSplit[2]
			var helpText = null
			var typeLength = arrSplit[4]
			var rightDecimals, leftDecimals
			if(parseInt(arrSplit[5]) != NaN ) {
				rightDecimals = parseInt(arrSplit[5])
				leftDecimals = typeLength
			}
			else {
				leftDecimals = 0
				rightDecimals = 0
			}
			ftClient.queryByName('CustomField', fieldName, sObjectName, function(success) {
				addSuccess(success)
				fieldMeta = new forceTooling.CustomFields.CustomField(arrSplit[1], arrSplit[2], dataType, null, arrSplit[4], parseInt(leftDecimals),parseInt(rightDecimals),null)
				ftClient.update('CustomField', fieldMeta,
					function(success) {
						console.log(success)
						addSuccess(success)
					},
					function(error) {
						console.log(error)
						addError(error.responseJSON)
					})
			},
			function(error) {
				addError(error.responseJSON)
			})
		}
	}
	function createField(cmd) {
		var arrSplit = cmd.split(' ')
		var dataType = ''
		var fieldMetadata
		if(arrSplit.length >= 3) {
			dataType = META_DATATYPES[arrSplit[3].toUpperCase()].name
			var sObjectName = arrSplit[1]
			var sObjectId = null
			if(typeof customObjects[sObjectName.toLowerCase()] !== 'undefined') {
				sObjectId = customObjects[sObjectName.toLowerCase()].Id
				sObjectName += '__c'
			}
			var fieldName = arrSplit[2]
			var helpText = null
			var typeLength = arrSplit[4]
			var rightDecimals, leftDecimals
			if(parseInt(arrSplit[5]) != NaN ) {
				rightDecimals = parseInt(arrSplit[5])
				leftDecimals = parseInt(typeLength)
			}
			else {
				leftDecimals = 0
				rightDecimals = 0
			}
			var fieldMeta
			switch(arrSplit[3].toUpperCase()) {
				case 'AUTONUMBER':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'CHECKBOX':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'CURRENCY':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, leftDecimals, rightDecimals,null,null,0)
				break
				case 'DATE':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'DATETIME':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'EMAIL':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'FORMULA':
				break
				case 'GEOLOCATION':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null, arrSplit[4],null,null,0)
				break
				case 'HIERARCHICALRELATIONSHIP':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,arrSplit[4],0)
				break
				case 'LOOKUP':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,arrSplit[4],0)
				break
				case 'MASTERDETAIL':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,arrSplit[4],0)
				break
				case 'NUMBER':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, leftDecimals, rightDecimals,null,null,0)
				break
				case 'PERCENT':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, leftDecimals, rightDecimals,null,null,0)
				break
				case 'PHONE':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'PICKLIST':
				var plVal = []
				plVal.push(new forceTooling.CustomFields.PicklistValue('CHANGEME'))
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,plVal,null,0)
				break
				case 'PICKLISTMS':
				var plVal = []
				plVal.push(new forceTooling.CustomFields.PicklistValue('CHANGEME'))
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,plVal,null,0)
				break
				case 'ROLLUPSUMMARY':
				break
				case 'TEXT':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, typeLength, null,null,null,null,0)
				break
				case 'TEXTENCRYPTED':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
				case 'TEXTAREA':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, typeLength, null,null,null,null,0)
				break
				case 'TEXTAREALONG':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, typeLength, null,null,null,null,arrSplit[4])
				break
				case 'TEXTAREARICH':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, typeLength, null,null,null,null,arrSplit[4])
				break
				case 'URL':
				fieldMeta = new forceTooling.CustomFields.CustomField(sObjectName, sObjectId, fieldName, dataType, null, null, null,null,null,null,0)
				break
			}
			ftClient.setSessionToken(getCookie('sid'), SFAPI_VERSION, serverInstance + '.salesforce.com')
			showLoadingIndicator()
			ftClient.create('CustomField', fieldMeta,
				function(success) {
					console.log(success)
					hideLoadingIndicator()
					addSuccess(success)
				},
				function(error) {
					console.log(error)
				 hideLoadingIndicator()
					addError(error.responseJSON)
				})
		}
	}
	function getMetadata(_data) {
		if(_data.length == 0) return
		var metadata = JSON.parse(_data)
		var mRecord = {}
		var act = {}
		metaData = {}
		for(var i=0;i<metadata.sobjects.length;i++) {
			if(metadata.sobjects[i].keyPrefix != null) {
				mRecord = {}
				mRecord.label = metadata.sobjects[i].label
				mRecord.labelPlural = metadata.sobjects[i].labelPlural
				mRecord.keyPrefix = metadata.sobjects[i].keyPrefix
				mRecord.urls = metadata.sobjects[i].urls
				metaData[metadata.sobjects[i].keyPrefix] = mRecord
				act = {}
				act.key = metadata.sobjects[i].name
				act.keyPrefix = metadata.sobjects[i].keyPrefix
				act.url = serverInstance + '.salesforce.com/' + metadata.sobjects[i].keyPrefix
				cmds['List ' + mRecord.labelPlural] = act
				act = {}
				act.key = metadata.sobjects[i].name
				act.keyPrefix = metadata.sobjects[i].keyPrefix
				act.url = serverInstance + '.salesforce.com/' + metadata.sobjects[i].keyPrefix
				act.url += '/e'
				cmds['New ' + mRecord.label] = act
			}
		}
		store('Store Commands', cmds)
		store('Store Metadata', metaData)
	}
	function store(action, payload) {
		var req = {}
		req.action = action
		req.key = clientId
		req.payload = payload
		chrome.extension.sendMessage(req, function(response) {
		})
		// var storagePayload = {}
		// storagePayload[action] = payload
		// chrome.storage.local.set(storagePayload, function() {
		// console.log('stored')
		// })
	}
	function getAllObjectMetadata() {
		sid = "Bearer " + getCookie('sid')
		var theurl = getServerInstance() + '.salesforce.com/services/data/' + SFAPI_VERSION + '/sobjects/'
		cmds['Refresh Metadata'] = {}
		cmds['Setup'] = {}
		var req = new XMLHttpRequest()
		req.open("GET", theurl, true)
		req.setRequestHeader("Authorization", sid)
		req.onload = function(response) {
		 getMetadata(response.target.responseText)
	 }
	 req.send()
	 getSetupTree()
	 getCustomObjects()
	 getCustomObjectsDef()
	}
	function parseSetupTree(html) {
		var allLinks = html.getElementById('setupNavTree').getElementsByClassName("parent")
		var strName
		var as
		var strNameMain
		var strName
		for(var i = 0; i<allLinks.length;i++) {
			var as = allLinks[i].getElementsByTagName("a")
			for(var j = 0;j<as.length;j++) {
				if(as[j].id.indexOf("_font") != -1) {
					strNameMain = 'Setup > ' + as[j].text + ' > '
					break
				}
			}
			var children = allLinks[i].getElementsByClassName("childContainer")[0].getElementsByTagName("a")
			for(var j = 0;j<children.length;j++) {
				if(children[j].text.length > 2) {
					strName = strNameMain + children[j].text
					cmds[strName] = {url: children[j].href, key: strName}
				}
			}
		}
		store('Store Commands', cmds)
	}
	function getSetupTree() {
		var theurl = serverInstance + '.salesforce.com/setup/forcecomHomepage.apexp?setupid=ForceCom'
		var req = new XMLHttpRequest()
		req.onload = function() {
		 parseSetupTree(this.response)
	 }
	 req.open("GET", theurl)
	 req.responseType = 'document'
	 req.send()
	}
	function getCustomObjects() {
		var theurl = serverInstance + '.salesforce.com/p/setup/custent/CustomObjectsPage'
		var req = new XMLHttpRequest()
		req.onload = function() {
			parseCustomObjectTree(this.response)
		}
	 req.open("GET", theurl)
	 req.responseType = 'document'
	 req.send()
	}
	function parseCustomObjectTree(html) {
		$(html).find('th a').each(function(el) {
			cmds['Setup > Custom Object > ' + this.text] = {url: this.href, key: this.text}
		})
		store('Store Commands', cmds)
	}
	function getCookie(c_name) {
		var i,x,y,ARRcookies=document.cookie.split(";")
		for (i=0;i<ARRcookies.length;i++) {
			x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="))
			y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1)
			x=x.replace(/^\s+|\s+$/g,"")
			if (x==c_name) {
				return unescape(y)
			}
		}
	}
	function getServerInstance() {
		var url = document.URL + ""
		var urlParseArray = url.split(".")
		var i
		var returnUrl
		if(url.indexOf("salesforce") != -1) {
			returnUrl = url.substring(0, url.indexOf("salesforce")-1)
			return returnUrl
		}
		if(url.indexOf("visual.force") != -1) {
			returnUrl = 'https:// ' + urlParseArray[1]
			return returnUrl
		}
		return returnUrl
	}
	function initShortcuts() {
	 chrome.extension.sendMessage({'action':'Get Settings'},
		 function(response) {
			shortcut = response['shortcut']
			bindShortcut(shortcut)
		}
		)
		// chrome.storage.local.get('settings', function(results) {
		// if(typeof results.settings.shortcut === 'undefined')
		// {
		// shortcut = 'shift+space'
		// bindShortcut(shortcut)
		// }
		// else
		// {
		// bindShortcut(results.settings.shortcut)
		// }
		// })
	}
	function bindShortcut(shortcut) {
		Mousetrap.bindGlobal(shortcut, function(e) {
			setVisibleSearch("visible")
			return false
		})
		Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('esc', function(e) {
			document.getElementById("sfnav_quickSearch").blur()
			clearOutput()
			document.getElementById("sfnav_quickSearch").value = ''
			setVisible("hidden")
			setVisibleSearch("hidden")
		})
		Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('enter', function(e) {
			var position = posi
			var origText = '', newText = ''
			if(position <0) position = 0
			origText = document.getElementById("sfnav_quickSearch").value
			if(typeof outp.childNodes[position] != 'undefined') {
				newText = outp.childNodes[position].firstChild.nodeValue
			}
			setVisible("hidden")
			if(!invokeCommand(newText))
				invokeCommand(origText)
		})
		Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('down', function(e) {
			var firstChild
			lookAt()
			if(outp.childNodes[posi] != null)
				firstChild = outp.childNodes[posi].firstChild.nodeValue
			else
				firstChild = null
			var textfield = document.getElementById("sfnav_quickSearch")
			if (words.length > 0 && posi < words.length-1) {
				posi++
				if(outp.childNodes[posi] != null)
					firstChild = outp.childNodes[posi].firstChild.nodeValue
				else
					firstChild = null
				if (posi >=1) outp.childNodes[posi-1].classList.remove('sfnav_selected')
				else input = textfield.value
				outp.childNodes[posi].classList.add('sfnav_selected')
				textfield.value = firstChild
				if(textfield.value.indexOf('<') != -1 && textfield.value.indexOf('>') != -1) {
					textfield.setSelectionRange(textfield.value.indexOf('<'), textfield.value.length)
					textfield.focus()
					return false
				}
			}
		})
	Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('up', function(e) {
		var firstChild
		if(outp.childNodes[posi] != null)
			firstChild = outp.childNodes[posi].firstChild.nodeValue
		else
			firstChild = null
		var textfield = document.getElementById("sfnav_quickSearch")
		if (words.length > 0 && posi >= 0){
			posi--
			if(outp.childNodes[posi] != null)
				firstChild = outp.childNodes[posi].firstChild.nodeValue
			else
				firstChild = null
			if (posi >=0){
				outp.childNodes[posi+1].classList.remove('sfnav_selected')
				outp.childNodes[posi].classList.add('sfnav_selected')
				textfield.value = firstChild
			}
			else{
				outp.childNodes[posi+1].classList.remove('sfnav_selected')
				textfield.value = input
			}
			if(textfield.value.indexOf('<') != -1 && textfield.value.indexOf('>') != -1) {
				textfield.setSelectionRange(textfield.value.indexOf('<'), textfield.value.length)
				textfield.focus()
				return false
			}
		}
	})
	Mousetrap.wrap(document.getElementById('sfnav_quickSearch')).bind('backspace', function(e) {
		posi = -1
		oldins=-1
	})
	document.getElementById('sfnav_quickSearch').onkeyup = function() {
		lookAt()
		return true
	}
	}
	function showLoadingIndicator() {
		document.getElementById('sfnav_loader').style.visibility = 'visible'
	}
	function hideLoadingIndicator() {
		document.getElementById('sfnav_loader').style.visibility = 'hidden'
	}
	function getCustomObjectsDef() {
		ftClient.query('Select+Id,+DeveloperName+FROM+CustomObject',
			function(success) {
				for(var i=0;i<success.records.length;i++) {
					customObjects[success.records[i].DeveloperName.toLowerCase()] = {Id: success.records[i].Id}
				}
			},
			function(error) {
				console.log(error)
			})
	}
	function init() {
		ftClient = new forceTooling.Client()
		ftClient.setSessionToken(getCookie('sid'), SFAPI_VERSION, serverInstance + '.salesforce.com')
		var div = document.createElement('div')
		div.setAttribute('id', 'sfnav_search_box')
		var loaderURL = chrome.extension.getURL("images/ajax-loader.gif")
		div.innerHTML = '<div class="sfnav_wrapper"><input type="text" id="sfnav_quickSearch" autocomplete="off"/><img id="sfnav_loader" src= "'+ loaderURL +'"/></div><div class="sfnav_shadow" id="sfnav_shadow"/><div class="sfnav_output" id="sfnav_output"/>'
		document.body.appendChild(div)
		outp = document.getElementById("sfnav_output")
		hideLoadingIndicator()
		initShortcuts()
		clientId = getCookie('sid').split('!')[0]
		chrome.extension.sendMessage({action:'Get Commands', 'key': clientId},
		 function(response) {
			cmds = response
			if(cmds == null || cmds.length == 0) {
				cmds = {}
				metaData = {}
				getAllObjectMetadata()
			}
			else {
			}
		})
		chrome.extension.sendMessage({action:'Get Metadata', 'key': clientId},
		 function(response) {
			metaData = response
		})
	}
	init()
})()