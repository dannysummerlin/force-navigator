const commands = {}
const metadata = {}

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
	let response = null
	switch(request.action) {
		case "storeCommands":
			commands[request.key] = request.payload
			break
		case "getCommands":
			response = commands ? commands[request.key] : null
			break
		case "getSettings":
			const settings = localStorage.getItem('sfNavSettings')
			response = settings ? settings : localStorage.setItem('sfNavSettings', JSON.stringify({ "theme": "default" }))
			break
		case "setSettings":
			const settings = JSON.parse(localStorage.getItem('sfNavSettings') || "{}")
			settings[request.key] = request.payload
			localStorage.setItem('sfNavSettings', JSON.stringify(settings))
			break
		case "storeMetadata":
			metadata[request.key] = request.payload
			break
		case "getMetadata":
			response = metadata ? metadata[request.key] ? null
	}
	sendResponse(response)
})