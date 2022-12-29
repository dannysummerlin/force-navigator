const commands = {}
const metadata = {}

chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {
		if(request.action == 'Store Commands') {
			commands[request.key] = request.payload
			sendResponse({})
		}
		if(request.action == 'Get Commands') {
			if(commands != null)
				sendResponse(commands[request.key])
			else
				sendResponse(null)
		}
		if(request.action == 'Get Settings') {
			var settings = localStorage.getItem('sfnav_settings')
			console.log('settings: ' + settings)
			if(settings != null) {
				sendResponse(JSON.parse(settings))
			}
			else {
				var sett = {}
				sett['shortcut'] = 'shift+space'
				localStorage.setItem('sfnav_settings', JSON.stringify(sett))
				sendResponse(sett)
			}
		}
		if(request.action == 'Set Settings') {
			var settings = localStorage.getItem('sfnav_settings')
			if(settings != null) {
				var sett = JSON.parse(settings)
				sett[request.key] = request.payload
				localStorage.setItem('sfnav_settings', JSON.stringify(sett))
			}
			sendResponse({})
		}
		if(request.action == 'Store Metadata') {
			metadata[request.key] = request.payload
			sendResponse({})
		}
		if(request.action == 'Get Metadata') {
			if(metadata != null)
				sendResponse(metadata[request.key])
			else
				sendResponse(null)
		}   
	})