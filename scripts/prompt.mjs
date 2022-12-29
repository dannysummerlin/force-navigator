// setup of box
	function addElements(ins) {
		clearOutput()
	// Command: Create Fields
		if(ins.substring(0,3) == 'cf ' && ins.split(' ').length < 4) {
			addWord('Usage: cf <Object API Name> <Field Name> <Data Type>')
		}
		else if(ins.substring(0,3) == 'cf ' && ins.split(' ').length == 4) {
			const wordArray = ins.split(' ')
			words = getWord(wordArray[3], META_DATATYPES)
			const visibleWords = []
			for(let i = 0; i<words.length; i++)
				[fieldTypeData(words[i], wordArray)].filter(f=>f).forEach(w=>visibleWords.push(w))
			if (visibleWords.length > 0) {
				clearOutput()
				for(let i=0;i < visibleWords.length; ++i)
					addWord(visibleWords[i])
				setVisible("visible")
				input = document.getElementById("sfnav_quickSearch").value
			} else{
				setVisible("hidden")
				posi = -1
			}
		}
		else {
			words = getWord(ins, cmds)
			if (words.length > 0){
				clearOutput()
				for (var i=0;i<words.length; ++i)
					addWord(words[i])
				setVisible("visible")
				input = document.getElementById("sfnav_quickSearch").value
			}
			else{
				setVisible("hidden")
				posi = -1
			}
		}
		setVisible('visible')
	}

	function setVisible(visi){
		var x = document.getElementById("sfnav_shadow")
		var t = document.getElementById("sfnav_quickSearch")
		x.style.position = 'relative'
		x.style.visibility = visi
	}
	function setVisibleSearch(visi) {
		var t = document.getElementById("sfnav_search_box")
		t.style.visibility = visi
		if(visi=='visible') document.getElementById("sfnav_quickSearch").focus()
	}
	function lookAt(){
		var ins = document.getElementById("sfnav_quickSearch").value
		if (oldins == ins && ins.length > 0) return
		else if (posi > -1)
		else if (ins.length > 0){
			addElements(ins)
		}
		else{
			setVisible("hidden")
			posi = -1
		}
		oldins = ins
	}
	function addWord(word){
		var sp = document.createElement("div")
		sp.className= "sfnav_child"
		sp.appendChild(document.createTextNode(word))
		sp.onmouseover = mouseHandler
		sp.onmouseout = mouseHandlerOut
		sp.onclick = mouseClick
		outp.appendChild(sp)
	}
	function addSuccess(text) {
		clearOutput()
		var err = document.createElement("div")
		err.className = 'sfnav_child sfnav-success-wrapper'
		var errorText = ''
		err.appendChild(document.createTextNode('Success! '))
		err.appendChild(document.createElement('br'))
		err.appendChild(document.createTextNode('Field ' + text.id + ' created!'))
		outp.appendChild(err)
		setVisible("visible")
	}
	function addError(text) {
		clearOutput()
		var err = document.createElement("div")
		err.className = 'sfnav_child sfnav-error-wrapper'
		var errorText = ''
		err.appendChild(document.createTextNode('Error! '))
		err.appendChild(document.createElement('br'))
		for(var i = 0;i<text.length;i++) {
			err.appendChild(document.createTextNode(text[i].message))
			err.appendChild(document.createElement('br'))
		}
		/*
		var ta = document.createElement('textarea')
		ta.className = 'sfnav-error-textarea'
		ta.value = JSON.stringify(text, null, 4)
		err.appendChild(ta)
		*/
		outp.appendChild(err)
		setVisible("visible")
	}
	function clearOutput(){
		if(typeof outp != 'undefined') {
			while (outp.hasChildNodes()){
				noten=outp.firstChild
				outp.removeChild(noten)
			}
		}
		posi = -1
	}
	function getWord(beginning, dict){
		var words = []
		if(typeof beginning === 'undefined') return []
		var tmpSplit = beginning.split(' ')
		var match = false
		if(beginning.length == 0) {
			for (var key in dict)
				words.push(key)
			return words
		}
		var arrFound = []
		for (var key in dict) {
		match = false
		if(key.toLowerCase().indexOf(beginning) != -1) {
			arrFound.push({num : 10,key : key})
		}
		else {
			for(var i = 0;i<tmpSplit.length;i++) {
				if(key.toLowerCase().indexOf(tmpSplit[i].toLowerCase()) != -1) {
					match = true
				}
				else {
					match = false
					break
				}
			}
			if(match) arrFound.push({num : 1, key : key})
		}
	}
	arrFound.sort(function(a,b) {
		return b.num - a.num
	})
	for(var i = 0;i<arrFound.length;i++)
		words[words.length] = arrFound[i].key
	return words
	}
	function setColor (_posi, _color, _forg){
		outp.childNodes[_posi].style.background = _color
		outp.childNodes[_posi].style.color = _forg
	}
	function invokeCommand(cmd) {
		if(typeof cmds[cmd] != 'undefined' && (cmds[cmd].url != null || cmds[cmd].url == '')) {
			window.location.href = cmds[cmd].url
			return true
		}
		if(cmd.toLowerCase() == 'refresh metadata') {
			getAllObjectMetadata()
			return true
		}
		if(cmd.toLowerCase() == 'setup') {
			window.location.href = serverInstance + '.salesforce.com/setup/forcecomHomepage.apexp?setupid=ForceCom'
			return true
		}
		if(cmd.toLowerCase().substring(0,3) == 'cf ') {
			createField(cmd)
			return true
		}
		return false
	}
