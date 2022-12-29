export const getAllObjectMetadata = () => {
	 getSetupTree()
	 getCustomObjects()
	 getCustomObjectsDef()
}
export const parseSetupTree = (html) => {
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
export const getSetupTree = () => {
		var theurl = serverInstance + '.salesforce.com/setup/forcecomHomepage.apexp?setupid=ForceCom'
		var req = new XMLHttpRequest()
		req.onload = function() {
		 parseSetupTree(this.response)
	 }
	 req.open("GET", theurl)
	 req.responseType = 'document'
	 req.send()
	}
export const getCustomObjects = () => {
		var theurl = serverInstance + '.salesforce.com/p/setup/custent/CustomObjectsPage'
		var req = new XMLHttpRequest()
		req.onload = function() {
			parseCustomObjectTree(this.response)
		}
	 req.open("GET", theurl)
	 req.responseType = 'document'
	 req.send()
	}
export const parseCustomObjectTree = (html) => {
		$(html).find('th a').each(function(el) {
			cmds['Setup > Custom Object > ' + this.text] = {url: this.href, key: this.text}
		})
		store('Store Commands', cmds)
	}

export const getMetadata = (data)=>{
	if(data.length == 0) return
	var metadata = JSON.parse(data)
	var mRecord = {}
	var act = {}
	metadata = {}
	for(var i=0;i<metadata.sobjects.length;i++) {
		if(metadata.sobjects[i].keyPrefix != null) {
			mRecord = {}
			mRecord.label = metadata.sobjects[i].label
			mRecord.labelPlural = metadata.sobjects[i].labelPlural
			mRecord.keyPrefix = metadata.sobjects[i].keyPrefix
			mRecord.urls = metadata.sobjects[i].urls
			metadata[metadata.sobjects[i].keyPrefix] = mRecord
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
	store('Store Metadata', metadata)
}