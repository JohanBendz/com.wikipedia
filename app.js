"use strict";

function App() 
{
    this.cache = {};
    this.woeid = undefined;
}

module.exports = App;
var app = new App();

App.prototype.init = function(){
    Homey.log ("Wikipedia app started");

    //Listen for speech triggers
    Homey.manager('speech-input').on('speech', onSpeech)
};

App.prototype.requestWiki = function ( spoken_text ) {
  var request = require('request');
  var extract;

    request({url:'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&redirects=&titles=' + spoken_text, json:true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        for(var id in body.query.pages){ //Read the page id number 
            Homey.log("id: " + id); //What is the id?
            if (id == -1) {
              //No result found
              app.speakOutput("Homey coudn't find any information about " + spoken_text);
            } else {
              extract = body.query.pages[id].extract; //What is the extract within that id?

              app.speakOutput(extract); //Speak result
            }
          }
      }
    })
}

//Listen for speech
function onSpeech(speech) {
    Homey.log("Speech is triggered");

    var spoken_text;

    // loop all triggers
    speech.triggers.forEach(function(trigger){

        Homey.log ("speech.transcript: " + speech.transcript);

        var replace1 = speech.transcript.replace("wikipedia", ""); //Replace Wolfram (trigger) with nothing
        var replace2 = replace1.replace("wiki", ""); //Replace wiki (trigger) with nothing
        var replace3 = replace2.replace("question", ""); //Replace question (trigger) with nothing
        var replace4 = toTitleCase(replace3);

        function toTitleCase(str){
            return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        } //Make of every word the first letter uppercase

        spoken_text = replace4.replace(/" "/g, "_"); //Replace spaces with _    /" "/g used to replace all the spaces
                
    });

    Homey.log ("spoken_text: " + spoken_text);
    app.requestWiki(spoken_text);
}

App.prototype.speakOutput = function( output ){
    Homey.log("speakOutput");
    Homey.log(output);

    //Homey.manager('speech-output').say( __(output );
}

App.prototype.askOutput = function( output ){
    Homey.log("askOutput");
    Homey.log(output);

    //Homey.manager('speech-output').ask( __(output );
}