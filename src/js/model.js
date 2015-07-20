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
	var loadAgenda = function(_agenda) {
		for (var i = 0; i < agenda.length; i++) {
			agenda.pop();
		}
		for (i = 0; i < _agenda.length; i++) {
			agenda.push(_agenda[i]);
		}
		scope.$apply();
	};
	var loadConversation = function(_topics) {
		for (var i = 0; i < topics.length; i++) {
			topics.pop();
		}
		for (i = 0; i < _topics.length; i++) {
			topics.push(_topics[i]);
		}
		scope.$apply();
	};
	
	// app settings
	var settings = {
		syncData: true
	};
	var didSyncData;
	var saveAllData = function() {
		storage.save("settings", settings);
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
		toast("Settings saved.");
	};
	
	/*
	 * ON LOAD
	 */
	var onload = function(_scope) {
		scope = _scope;
		storage.loadLocal("syncData", function(sync) {
			settings.syncData = sync;
			didSyncData = sync;
			storage.load("settings", function(loaded) {
				settings = loaded;
			}, settings); // use settings as default
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
	exports.loadAgenda = loadAgenda;
	exports.loadConversation = loadConversation;
	exports.onload = onload;
	exports.settings = settings;
	exports.saveSettings = saveSettings;
	exports.saveAllData = saveAllData;
	
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
	}
};
