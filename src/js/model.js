/* global storage */

model = (function() {
	var scope = {};
	/*
	 * DATA
	 */
	// topics and agenda
	var topics = [];
	var agenda = [];
	var history = [];
	var planned = [];
	var agendaPtr = 0;
	
	var newTopic = function(topic) {
		topic = topic.trim().toLowerCase()
		if (agenda.length && topic === agenda[agendaPtr].name.toLowerCase()) { // talking about next item on agenda
			finishAgendaItem();
		}
		for (var i = 0; i < topics.length; i++) {
			if (topic === topics[i].name) {
				// pop off all below
				for (var j = 0; j <= i; j++) {
					topics.shift();
				}
				break;
			}
		}
		topics.unshift(create.Topic(topic));
		scope.$apply();
	};
	var pushAgendaItem = function(item){
		agenda.push(create.AgendaItem(item));
		scope.$apply();
	};
	var finishAgendaItem = function() {
		var item = agenda[agendaPtr++];
		item.done = true;
		listener.updateAnalyzer(); // update the analyzer
		scope.$apply();
		return item;
	};
	var addAgenda = function(_agenda) {
		_agenda.items = [];
		var items = _agenda.text.split("\n");
		for (var i = 0; i < items.length; i++) {
			_agenda.items.push(create.AgendaItem(items[i]));
		}
		planned.push(_agenda);
	};
	var updateAgenda = function(_new) {
		for (var i = 0; i < planned.length; i++) {
			var p = planned[i]; 
			if (p.date === _new.date) {
				p.title = _new.title;
				p.text = _new.text;
				p.items = [];
				var items = _new.text.split("\n");
				for (var i = 0; i < items.length; i++) {
					p.items.push(create.AgendaItem(items[i]));
				}
			}
		}
	};
	var loadAgenda = function(_agenda) {
		var l = agenda.length;
		for (var i = 0; i < l; i++) {
			agenda.pop();
		}
		l = _agenda.length;
		for (i = 0; i < l; i++) {
			_agenda[i].done = false;
			agenda.push(_agenda[i]);
		} 
		agendaPtr = 0;
		listener.updateAnalyzer(); // update the bg analyzer with the agenda for better voice recognition
	};
	var removeAgenda = function(_agenda) {
		var oldplanned = planned.slice();
		for (var i = 0; i < oldplanned.length; i++) {
			planned.pop();
		}
		for (var i = 0; i < oldplanned.length; i++) {
			var item = oldplanned[i];
			if (item.date !== _agenda.date) {
				planned.push(item);
			}
		}
	};
	var loadConversation = function(_topics) {
		var l = topics.length;
		for (var i = 0; i < l; i++) {
			topics.pop();
		}
		l = _topics.length;
		for (i = 0; i < l; i++) {
			topics.push(_topics[i]);
		}
		scope.$apply();
	};
	var addConversation = function(item) {
		history.push(item);
	};
	var removeConversation = function(_c) {
		var oldhistory = history.slice();
		for (var i = 0; i < oldhistory.length; i++) {
			history.pop();
		}
		for (var i = 0; i < oldhistory.length; i++) {
			var item = oldhistory[i];
			if (item.date !== _c.date) {
				history.push(item);
			}
		}
	};

	
	// app settings
	var settings = {
		syncData: true
	};
	var didSyncData;
	var saveAllData = function(callback) {
		var saveStack = [
			function() { 
				storage.save("settings", settings); 
				saveStack.shift()();
			},
			function() { 
				storage.save("planned", planned); 
				saveStack.shift()();
			},
			function() { 
				storage.save("history", history);
				saveStack.shift()();
			},
			function() { 
				storage.saveLocal("syncData", settings.syncData);
				saveStack.shift()();
			},
			callback
		];
		saveStack.shift()();
	};
	var saveSettings = function() {
		if (didSyncData !== settings.syncData) {
			if (!settings.syncData) {
				storage.clearAll("sync");
			}
		} else {
			storage.save("settings", settings);
		}
		didSyncData = settings.syncData;
	};
	var clearAllData = function() {
		storage.clearAll(settings.syncData ? "sync" : "local");
	};
	var onClose = function(callback) {
		if (topics.length) {
			var item = create.HistoryItem(topics); // save conversation if it exists
			history.push(item);
		}
		saveAllData(callback);
	};
	
	/*
	 * ON LOAD
	 */
	var onload = function(_scope) {
		scope = _scope;
		storage.loadLocal("syncData", function(sync) {
			settings.syncData = sync;
			didSyncData = sync;
			storage.load("settings", function(loaded) { settings = loaded; }, settings); // use settings as default
			storage.load("planned", function(loaded) { copyOver(planned, loaded); }, planned);
			storage.load("history", function(loaded) { copyOver(history, loaded); }, history);
		}, true); // default true
	};
	
	var exports = {};
	exports.topics = topics;
	exports.agenda = agenda;
	exports.history = history;
	exports.planned = planned;
	exports.newTopic = newTopic;
	exports.pushAgendaItem = pushAgendaItem;
	exports.finishAgendaItem = finishAgendaItem;
	exports.addAgenda = addAgenda;
	exports.updateAgenda = updateAgenda;
	exports.removeAgenda = removeAgenda;
	exports.loadAgenda = loadAgenda;
	exports.loadConversation = loadConversation;
	exports.removeConversation = removeConversation;
	exports.addConversation = addConversation;
	exports.onload = onload;
	exports.settings = settings;
	exports.clearAllData = clearAllData;
	exports.saveSettings = saveSettings;
	exports.onClose = onClose;
	
	return exports;
})();

create = {
	AgendaItem: function(_name) {
		return {
			name: _name,
			done: false,
	 		added: Date.now()
	 	};
	}, 
	Topic: function(_name) {
		return {
			name: _name,
			added: Date.now()
		};
	},
	HistoryItem: function(_items) {
		return {
			date: Date.now(),
			items: _items.slice().reverse(),
			title: false
		};
	}
};
