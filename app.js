"use strict";

var self = module.exports;
var request = require('request');

module.exports.init = function(){
    Homey.log ("Wikipedia app started");

    //Listen for speech triggers
    Homey.manager('speech-input').on('speech', self.onSpeech)
}

module.exports.requestWikiSearch = function ( spoken_text ) {
    request({url:__("api_link") + '?action=query&list=search&format=json&srsearch=' + spoken_text, json:true}, function (error, response, body) {
      if (!error && response.statusCode == 200 && body.query) {
        if (body.query.searchinfo.totalhits == 0) {
          self.askOutput(__("no_info") + spoken_text + __("try_again")); //No information about your search query
        } else {
          self.requestWikiPage(body.query.search[0].title); //Use the title of the first result to request that page
        }
      }
    })
}

module.exports.requestWikiPage = function ( wiki_title ) {;
    request({url:__("api_link") + '?format=json&action=query&prop=extracts&exintro=&explaintext=&redirects=&titles=' + wiki_title, json:true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        for(var id in body.query.pages){ //Read the page id number 
            Homey.log("id: " + id); //What is the id?
            if (id == -1) { //No result found
              self.askOutput(__("no_info") + wiki_title + __("try_again")); //No information about your search query
            } else {
              var extract = body.query.pages[id].extract; //What is the extract within that id?
              var extract = extract.replace(/ *\([^)]*\) */g, " "); //Remove () for a space
              var extract = extract.replace(/ *\[[^)]*\] */g, " "); //Remove [] for a space

              var split = extract.split('.');
              var output = split[0] + '.' + split[1] + '.' + split[2]; //First three sentences

              if (split[4] != null) {
                var more = __("more", { "wiki_title": wiki_title })
                //self.readMore(extract, wiki_title); //Speak result... but there is more
                self.speakOutput(output); //Speak result
              } else {
                self.speakOutput(output); //Speak result
              }
            }
          }
      }
    })
}

//Listen for speech
module.exports.onSpeech = function(speech) {
    Homey.log("Speech is triggered");

    var speechInput;

    // loop all triggers
    speech.triggers.forEach(function(trigger){

        Homey.log ("speech.transcript: " + speech.transcript);

        //Replace Wikipedia (trigger) with nothing
        speechInput = speech.transcript;
        speechInput = speechInput.replace("wikipedia", "");
        speechInput = speechInput.replace("wiki", "");
        speechInput = speechInput.replace("every thing yeah", "");
        speechInput = speechInput.replace("when will the media", "");
        speechInput = speechInput.replace("bring it up here", "");
        speechInput = speechInput.replace("what yeah", "");
        
        speechInput = toTitleCase(speechInput);

        function toTitleCase(str){
            return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        } //Make of every word the first letter uppercase

        speechInput = speechInput.replace(/" "/g, "_"); //Replace spaces with _    /" "/g used to replace all the spaces

        Homey.log(speechInput);        
    });

    Homey.log ("speechInput: " + speechInput);
    self.requestWikiSearch(speechInput);
}

module.exports.speakOutput = function( output ){
    Homey.log("speakOutput");
    Homey.log(output);

    Homey.manager('speech-output').say( (output) );
}

module.exports.askOutput = function( output ){
    Homey.log("askOutput");
    Homey.log(output);

    Homey.manager('speech-input').ask( (output), function( err, result) {
      if( err ) {
        Homey.error( err );
        return;
      }
      self.requestWikiSearch(result);
    });
}

module.exports.readMore = function( output, question, more ){
    Homey.log("readMore");
    Homey.log(output);

    var fullOutput = output;
    var split = output.split('.');
    var output = split[0] + '.' + split[1] + '.' + split[2]; //First three sentences

    if (more == true) {
      var splitOutput = "";
      for (var i = 3; i < split.length; i++) { //Create output with the rest of the text without first 3 sentences
        splitOutput = splitOutput + "." + split[i];
      }
      self.speakOutput(splitOutput);
      return;
    }

    Homey.manager('speech-input').ask( (output + __("more", {"wiki_title": question})), function( err, speech) {
      if( err ) {
        Homey.error( err );
        return;
      }

      if (speech.indexOf(__("yes")) > -1) {
        Homey.log ()
        self.readMore( fullOutput, question, true);
      } else if (speech.indexOf(__("no")) > -1) {
        self.speakOutput( __("ok") );
        return;
      } else {
        self.askOutput( __("yes_no") );
      } 

    });
}