/*
 * WEB WORKER FOR ANALYSIS OF SPEECH RECOGNITION RESULTS
 */

/* global nlp, NLP, Metaphone */

importScripts("nlp.min.js", "natural.js", "pos.js");

var queue = [];
var running = false;
var agenda = []; 

var transcript = "";

var tagger = new POSTagger();
var lexer = new Lexer();
var nounInflector = new NLP.NounInflector();
var tfIdf = new NLP.TfIdf();
var tfidf_ptr = 0;

function extractTopic(results) {
	var possibilities = [];
    var keywords = [];
	
	var offAgendaRate = 0.25; // what portion of the topic changes will not go to an agenda item
	var returnToDone = 0.05; // what portion of the topic changes will go back to a previously covered item
	var jumpAhead = 0.05; // what portion of the time we skip an item

	var pL = agenda.length;
	var kL = results.length;

	/*
	 * GENERATE TOPIC GUESSES FROM AGENDA
	 */
	var l = agenda.length;
	if (l === 0) { // if no agenda, every new topic will be off agenda
		offAgendaRate = 1;
	} else {
		var pBaseline = (1 - offAgendaRate) / pL; // baseline guess on chance of moving to any given agenda item
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
            var text = nounInflector.singularize(item.name.toLowerCase());
			possibilities.push(create.Possibility(text, prob));
		}	
	}

	/*
	 * GENERATE TOPIC GUESSES FROM RESULTS ALTERNATIVES
	 */
	var l = results.length;
	var pBaseline = offAgendaRate; // baseline guess on chance of moving to given speech alternative
	for (var i = 0; i < l; i++) {
		var item = results[i];
        var text = item.transcript.toLowerCase();
		keywords.push(create.Possibility(text, item.confidence * pBaseline / l)); 
	}

	/*
	 * EVALUATE POSSIBLIITES
	 */
	var bestP = 0.0;
	var bestGuess = keywords[0].text;
	// find best match
    for (var k = 0; k < kL; k++) { // for each keyword
        var mlrr = NLP.Metaphone(keywords[i].text);
        var mlrc = keywords[i].probability;
        for (var i = 0; i < pL; i++) { // for each possibility
            var p = possibilities[i];
            var distance = NLP.LevenshteinDistance(mlrr, NLP.Metaphone.process(p.text));
            var maxD = Math.max(mlrr.length, p.text.length);
            var prob = mlrc * p.probability * (1 - (distance / maxD));
            if (prob > bestP) {
                bestP = prob;
                bestGuess = p.text;
            }
        }
    }

	return bestGuess;
}

function process(results) {
    transcript += " " + results[0].transcript;
    var resolved = resolveCoreferences(transcript).trim();
    var keywords = getNouns(resolved);
    var possibilities = getFrequencies(keywords);
    var topic = extractTopic(possibilities);
    postMessage({
		type: "newTopic",
		data: topic
	});
}

function getFrequencies(keywords) {
    tfIdf.addDocument(keywords);
    var terms = tfIdf.listTerms(tfidf_ptr++);
    var freq = [];
    var l = terms.length;
    var sum = 0.0;
    for (var i = 0; i < l; i++) {
        sum += terms[i].tfidf;
    }
    for (var i = 0; i < l; i++) {
        freq.push({
            transcript: terms[i].term,
            confidence: terms[i].tfidf / sum
        });
    }
    return freq;
}

function getNouns(text) {
    var words = lexer.lex(text);
    var nwords = words.length;
    var nouns = "";
    
    for (var i = 0; i < nwords; i++) {
        var word = words[i];
        var pos = getPOS(word);
        if (pos.slice(0,2) === "NN") { // is a noun
            nouns += nounInflector.singularize(word) + " ";
        }
    }
    
    return nouns;
}

function resolveCoreferences(text) {
    var words = lexer.lex(text);
    var nwords = words.length;
    // for each word
    for (var i = 0; i < nwords; i++) {
        word = words[i];
        
        var singular = false;
        
        switch (word.toLowerCase()) {
            case "it":
                singular = true;
                break;
            case "he":
                singular = true;
                break;
            case "she":
                singular = true;
                break;
            case "they":
            case "them":
                singular = false;
            default:
                continue; // get another word
        }
        // RESOLVE COREFERENCE
        bestD = nwords; // closest distance to coreference 
        best = "";
        for (var j = 0; j < nwords; j++) {
            if (i === j) continue;
            var pos = getPOS(words[j]);
            var d = Math.abs(i - j);
            if (pos === (singular ? "NN" : "NNS")
                    || pos === (singular ? "NNP" : "NNPS")
                    && d < bestD) {
                best = words[j];
                bestD = d;
            }
            if (j > i && d > bestD) { //we're moving away after getting our best guess
                break; // no point looping
            }
        }
        if (bestD < nwords) { // something was found
            words[i] = best; // replace coreference
        }
    }
    
    return deLex(words);
}

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

function getPOS(word) {
    return tagger.tag([word])[0][1];
}
function deLex(words) {
    var dl = "";
    var l = words.length;
    for (var i = 0; i < l; i++) {
        word = words[i];
        if (word !== ".") {
            dl += " "
        }
        dl += word;
    }
    return dl;
}

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
