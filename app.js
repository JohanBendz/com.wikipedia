"use strict";

var request = require('request');

module.exports.init = function(){
	Homey.manager('speech-input').on('speech', onSpeech);
}

function onSpeech(speech) {
	var userInput = {};
	//process triggers
	speech.triggers.forEach(function(trigger){
		if (trigger.id === 'wikipedia' || trigger.id === 'wikipedia_alternative') {
			userInput.mainTrigger = trigger;
		}else if (trigger.id === 'support_word') {
			userInput.support = trigger;
		}
	})

	if (!userInput.mainTrigger) return;

	//get search
	var searchWords = "";
	if (userInput.support) {
		if (userInput.support.position + userInput.support.text.length + 1 === userInput.mainTrigger.position) {
			//zoek op wikipedia naar
			searchWords = speech.transcript.slice(userInput.mainTrigger.position + userInput.mainTrigger.text.length).trim();
		}else{
			//search for X on wikipedia
			searchWords = speech.transcript.substring(userInput.support.position + userInput.support.text.length, userInput.mainTrigger.position).trim();
		}
	}else{
		//wikipedia X
		searchWords = speech.transcript.slice(userInput.mainTrigger.position + userInput.mainTrigger.text.length).trim();
	}

	if (searchWords === "")  {
		speech.say( __("noSearchQuery") );
		return;
	}

	getFromWikipedia(searchWords, function(err, result){
		if (err) return speech.say( __("retrieveError"));
		if (result === "") return speech.say( __("noResult", {searchWords: searchWords}) );

		return speech.say(result);
	})
}

function getFromWikipedia(searchWords, callback) {
	request({
		url: __("apiUrl") + '?action=query&list=search&format=json&srsearch=' + searchWords, 
		json:true
	}, function (error, response, body) {
		if (error) return callback(error);

		if (response.statusCode == 200 && body.query) {
			if (body.query.searchinfo.totalhits == 0) return callback(null, "");

			//Use the title of the first result to request that page
			requestWikiPage(body.query.search[0].title, function(err, result){
				if (err) return callback(err);

				callback(null, result);
			}); 
		}else{
			callback(new Error("Something went wrong while searching"));
		}
	})
}

function requestWikiPage(pageTitle, callback) {
	request({
		url:__("apiUrl") + '?format=json&action=query&prop=extracts&exintro=&explaintext=&redirects=&titles=' + pageTitle, 
		json:true
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {

			for (const id in body.query.pages) {
				if (id === -1) return callback(null, ""); //if there were no pages

				//remove annoying characters from extract and plit into sentences
				var sentences = body.query.pages[id].extract.replace(/[\(\(\[\]]/, " ").split(".");
				var response = "";
				var i = 0;
				while (sentences[i] && response.length + sentences[i].length < 255) {
					response += sentences[i];
					i++;
				}
				return callback(null, response);
			}
		}
	})
}