listener = (function() {
	var recognition = new webkitSpeechRecognition();
	var analyzer = new Worker("js/analysis.js");

	recognition.continuous = true;
	
	window.TRANSCRIPT = "";

	var start = function() { 
		recognition.start(); 
	};
	var stop = function() {
		recognition.stop();
		analyzer.terminate();
	};
	
	recognition.onresult = function(e) {
		var result;
		for (var i = e.resultIndex; i < e.results.length; i++) {
			result = e.results[i][0].transcript;
			analyzer.postMessage({
				type: "result",
				data: e.results[i]
			});
		}
		TRANSCRIPT += result;
		console.log(TRANSCRIPT);
	};
	recognition.onerror = function(e) {
		if (e.error !== "no-speech") {
			console.log(e);
		}
	};
	recognition.onend = start;

	analyzer.onmessage = function(msg) {
		msg = msg.data;
		switch (msg.type) {
			case "newTopic":
				model.newTopic(msg.data);
				break;
			case "log":
				console.log(msg.data);
				break;
		}
	};

	var updateAnalyzer = function() {
		analyzer.postMessage({
			type: "agenda",
			data: model.agenda
		});
	};
	
	exports = {};
	exports.start = start;
	exports.recognition = recognition;
	exports.analyzer = analyzer;
	exports.stop = stop; 
	exports.updateAnalyzer = updateAnalyzer;
	
	return exports;
})();
