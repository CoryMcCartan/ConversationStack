listener = (function() {
	var recognition = new webkitSpeechRecognition();
	recognition.continuous = true;
	
	window.TRANSCRIPT = "";
	
	recognition.onresult = function(e) {
		for (var i = e.resultIndex; i < e.results.length; i++) {
			TRANSCRIPT += e.results[i][0].transcript;
		}
		console.log(TRANSCRIPT);
	};
	
	var start = function() { recognition.start(); };
	
	exports = {};
	exports.start = start;
	exports.recognition = recognition;
	
	return exports;
})();