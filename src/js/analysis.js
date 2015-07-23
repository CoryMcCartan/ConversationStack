/*
 * WEB WORKER FOR ANALYSIS OF SPEECH RECOGNITION RESULTS
 */

/* global nlp */

importScripts("nlp.min.js", "levenshtein.js");

var queue = [];
var running = false;
var agenda = []; 

var transcript = "";

function extractTopic(results) {
	var possibilities = [];
	
	var offAgendaRate = 0.25; // what portion of the topic changes will not go to an agenda item
	var returnToDone = 0.05; // what portion of the topic changes will go back to a previously covered item
	var jumpAhead = 0.05; // what portion of the time we skip an item

	var L = agenda.length + results.length;

	/*
	 * GENERATE TOPIC GUESSES FROM AGENDA
	 */
	var l = agenda.length;
	if (l === 0) { // if no agenda, every new topic will be off agenda
		offAgendaRate = 1;
	} else {
		var pBaseline = (1 - offAgendaRate) / L; // baseline guess on chance of moving to any given agenda item
		var doneCount = 0;
		var lastDone = -1;
		for (var i = 0; i < l; i++) {
			if (agenda[i].done) {
				doneCount++;
				lastDone = i;
			}
		}
		var pDone = returnToDone * pBaseline / (doneCount / l); // Bayes' theorem update for done items
		if (doneCount) pBaseline *= (1 - returnToDone) / ((l - doneCount) / l); // Bayes

		for (var i = 0; i < l; i++) {
			var item = agenda[i];
			var prob;
			if (item.done) {
				prob = pDone;
			} else {
				var offset = i - lastDone;
				if (offset === 1) { // if next
					prob = (1 - jumpAhead) * pBaseline / ((l - lastDone) / l); 
				} else { // if further ahead
					prob = jumpAhead * pBaseline / ((l - lastDone) / l);
				}
			}
			possibilities.push(create.Possibility(item.name.toLowerCase(), prob));
		}	
	}

	/*
	 * GENERATE TOPIC GUESSES FROM RESULTS ALTERNATIVES
	 */
	var l = results.length;
	var pBaseline = offAgendaRate; // baseline guess on chance of moving to given speech alternative
	for (var i = 0; i < l; i++) {
		var item = results[i];
		possibilities.push(create.Possibility(item.transcript, item.confidence * pBaseline / (l + i+1))); // i+1 to favor earlier (more confident) results
	}

	/*
	 * EVALUATE POSSIBLIITES
	 */
	var bestP = 0.0;
	var bestGuess = "";
	var mlrr = results[0].transcript; // Most Likely Recognition Result
	var mlrc = results[0].confidence; // Most Likely Result Confidence
	// try to reduce problems by combining letter combinations like th and ing
	// into single symbols for more accurate comparison
	possibilities.push(create.Possibility(mlrr, 0.0));
	for (var i = 0; i <= L; i++) {
		possibilities[i].text = phoneticize(possibilities[i].text, false);
	}
	mlrr = possibilities.pop().text;
	var mlrrL = mlrr.length;
	// find best match
	for (var i = 0; i < L; i++) { // for each possibility
		var p = possibilities[i];
		var distance = new Levenshtein(mlrr, p.text).distance;
		var maxD = Math.max(mlrrL, p.text.length);
		var prob = mlrc * p.probability * (1 - (distance / maxD));
		if (prob > bestP) {
			bestP = prob;
			bestGuess = p.text;
		}
	}

	postMessage({
		type: "newTopic",
		data: phoneticize(bestGuess, true)
	});
}

function process(results) {
	var toAnalyze = [];
	var confidence = 0; // average confidence
	for (var i = 0; i < results.length; i++) {
		transcript += results[i].transcript + " ";
		confidence += results[i].confidence / results.length;
	}
	
	nouns = nlp.pos(transcript).nouns();
	log(JSON.stringify(nouns));
	var seen = [];
	for (var j = 0; j < nouns.length; j++) {
		var word = nouns[j].normalised;
		var index = seen.indexOf(word);
		if (index > -1) {
			toAnalyze[index].confidence *= 1.5; // increased certainty
		} else {
			seen.push(word);
			toAnalyze.push({
				transcript: word,
				confidence: confidence				
			});
		}
	}
	extractTopic(toAnalyze.sort(function(a,b){return a.confidence < b.confidence;}));
}

function phoneticize(text, toEnglish) {
	if (toEnglish) {
		text = text.replace("@", "th");
		text = text.replace("#", "ch");
		text = text.replace("$", "ing");
		text = text.replace("%", "qu");
		text = text.replace("^", "ough");
		text = text.replace("&", "kn");
		text = text.replace("*", "ck");
	} else {
		text = text.replace("th", "@");
		text = text.replace("ch", "#");
		text = text.replace("ing", "$");
		text = text.replace("qu", "%");
		text = text.replace("ough", "^");
		text = text.replace("kn", "&");
		text = text.replace("ck", "*");
	}
	return text;
};


function manage() {
	running = true;
	while (queue.length) {
		try {
			process(queue.shift());
		} catch(e) { log(JSON.stringify(e)); }
	}
	running = false;
}

onmessage = function(msg) {
	msg = msg.data;
	switch (msg.type) {
		case "result":
			queue.push(JSON.parse(msg.data));
			if (!running) { // no jobs running yet
				manage();
			}
			break;
		case "agenda":
			agenda = msg.data;
			break;
	}
};

var create = {
	Possibility: function(t, p) {
		return {
			text: t,
			probability: p
		};
	}
};

function log(text) {
	var msg = {
		type: "log",
		data: text
	};
	postMessage(msg);
};
