listener = (function() {
	var recognition = new webkitSpeechRecognition();
	recognition.continuous = true;
	
	window.TRANSCRIPT = "";
	
	recognition.onresult = function(e) {
		var result;
		for (var i = e.resultIndex; i < e.results.length; i++) {
			result = e.results[i][0].transcript;
		}
		TRANSCRIPT += result;
		console.log(TRANSCRIPT);
		model.pushTopic(result);
	};
	recognition.onerror = LOGF;
	recognition.onend = LOGF;
	
	var start = function() { recognition.start(); };
	
	exports = {};
	exports.start = start;
	exports.recognition = recognition;
	
	return exports;
})();
