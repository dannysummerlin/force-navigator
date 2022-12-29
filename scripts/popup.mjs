document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('save').addEventListener('click', save)
	main()
})

function main() {
	chrome.extension.sendMessage({'action':'Get Settings'}, 
		function(response) {
			console.log(response)
			document.getElementById('shortcut').value = response['shortcut']				
		}
	)
}

function save() {
	const payload = document.getElementById('shortcut').value
	chrome.extension.sendMessage({'action':'Set Settings', 'key':'shortcut', 'payload':payload}
		function(response) {
			chrome.tabs.getSelected(null, function(tab) {
				const code = 'window.location.reload();'
				chrome.tabs.executeScript(tab.id, {code: code})
			})
		}
	)
}