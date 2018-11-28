"use strict";

var request = require('request');

module.exports.init = function(){
	Homey.manager('speech-input').on('speech', onSpeech);
	Homey.manager('speech-input').on('speechMatch', onSpeechMatch);
}
function onSpeech( speech, callback ) {
	return callback( null, true );
}
function onSpeechMatch( speech, word ) {
	const tree = speech.matches.main;

	getFromWikipedia(tree.query.value[0], function(err, result){
		if (err) return speech.say( __("retrieveError"));
		if (result === "") return speech.say( __("noResult", {searchWords: tree.query.value[0]}) );

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
				var sentences = body.query.pages[id].extract.replace(/[\(\(\[\]]/, " ").split(/[.,]/);

				var response = "";
				var i = 0;
				while (sentences[i] && response.length + sentences[i].length < 255) {
					response += sentences[i] + ".";
					i++;
				}
				return callback(null, response);
			}
		}
	})
}