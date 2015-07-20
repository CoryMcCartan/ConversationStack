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
	var agendaPtr = -1;
	
	var pushTopic = function(topic) {
		topics.unshift(create.Topic(topic));
		scope.$apply();
	};
	var popTopic = function() {
		var r = topics.shift().name;
		scope.$apply();
		return r;
	};
	var pushAgendaItem = function(item){
		agenda.push(create.AgendaItem(item));
		scope.$apply();
	};
	var popAgendaItem = function() {
		var item = agenda[++agendaPtr];
		item.done = true;
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
			agenda.push(_agenda[i]);
		} 
		agendaPtr = -1;
	};
	var removeAgenda = function(_agenda) {
		var oldplanned = planned.slice();
		for (var i = 0; i < oldplanned.length; i++) {
			planned.pop();
		}
		for (var i = 0; i < oldplanned.length; i++) {
			var item = oldplanned[i];
			if (item.date != _agenda.date) {
				planned.push(item)
			}
		}
	}
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
			if (item.date != _c.date) {
				history.push(item)
			}
		}
	};

	
	// app settings
	var settings = {
		syncData: true
	};
	var didSyncData;
	var saveAllData = function() {
		storage.save("settings", settings);
		storage.save("planned", planned);
		storage.save("history", history);
		storage.saveLocal("syncData", settings.syncData);
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
	var onClose = function() {
		if (topics.length) {
			var item = create.HistoryItem(topics); // save conversation if it exists
			history.push(item);
		}
		saveAllData();
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
	exports.pushTopic = pushTopic;
	exports.popTopic = popTopic;
	exports.pushAgendaItem = pushAgendaItem;
	exports.popAgendaItem = popAgendaItem;
	exports.addAgenda = addAgenda;
	exports.updateAgenda = updateAgenda;
	exports.removeAgenda = removeAgenda;
	exports.loadAgenda = loadAgenda;
	exports.loadConversation = loadConversation;
	exports.removeConversation = removeConversation;
	exports.addConversation = addConversation;
	exports.onload = onload;
	exports.settings = settings;
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
