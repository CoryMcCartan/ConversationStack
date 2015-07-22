chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create("index.html", {
		"outerBounds": {
			width: 640,
			height: 480
		},
		"frame": "none"
	});
});
