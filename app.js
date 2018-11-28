'use strict';

const fetch = require('node-fetch');
const Homey = require('homey');

module.exports = class WikipediaApp extends Homey.App {
	
	onInit() {
		this._language = Homey.ManagerI18n.getLanguage();
		this._apiUrl = `https://${this._language}.wikipedia.org//w/api.php`;
				
		Homey.ManagerSpeechInput.on('speechEval', this._onSpeechEval.bind(this))
		Homey.ManagerSpeechInput.on('speechMatch', this._onSpeechMatch.bind(this))
	}
	
	_onSpeechEval( speech, callback ) {
		callback( null, true );
	}
	
	_onSpeechMatch( speech ) {
		const { matches } = speech;
		const { main } = matches;
		const { query } = main;
		const { value } = query;
		
		this.getFromWikipedia({ query: value })
			.catch(err => {
				const message = err.message || err.toString();
				
				if( message === 'no_result' )
					return Homey.__('noResult', {
						query: value,
					});
				
				return Homey.__('error', { message });
			})
			.then(text => speech.say(text))
			.catch(this.error);
	}
	
	async getFromWikipedia({ query, sentences = 1 }) {
		const url = `${this._apiUrl}?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(query)}`;
		const res = await fetch(url);
		const body = await res.json();
		const { pages } = body.query;
		if(Object.keys(pages) < 1)
			throw new Error('no_result');
		
		const page = Object.values(pages)[0];
		const { extract } = page;
		
		// split in sentences and limit by number of sentences
		let text = extract.split('. ', sentences).join('. ') + '.';
			text = removeParenthesis(text);
		return text;
	}
	
}

function removeParenthesis(str) {
	let re = /\([^\(\)]+\)/gi;
	while( str.match(re) ) {
		str = str.replace(re, '');
	}	
	return str;
	
}