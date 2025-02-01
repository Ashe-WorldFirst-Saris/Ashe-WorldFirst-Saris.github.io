// Music player
var audio = document.createElement('audio');
var playerContext = false;

//var screenW = window.innerWidth;
//var screenH = window.innerWidth;
var screenW = 1920;
var screenH = 1080;

// Player data
var spectrumData = [];

audio.setAttribute('src', '');
audio.volume = (grVol); // Set initial volume
audio.crossOrigin = 'anonymous'; // Fixes CORS access restriction for player

//var context = new (window.AudioContext || window.webkitAudioContext)();
function playerContextSet() {
	// Check if vis is disabled (only run if returns true)
	// If disabled, no canvas operations occur, but the player still needs to be set for playback
	if(getCookie("grVis") !== "false") {
		var context = new (window.AudioContext || window.webkitAudioContext)();

		context.crossOrigin = 'anonymous'; // Fixes CORS access restriction for analysis

		// Get context for canvas
		var ctx = $("#eq_canvas").get()[0].getContext("2d");


		var source = context.createMediaElementSource(audio);

		// Setup a javascript node
		var javascriptNode = context.createScriptProcessor(256,1,1);
		// Connect to destination, else it isn't called
		javascriptNode.connect(context.destination);

		// Set up an analyzer
		var analyser = context.createAnalyser();
		source.connect(analyser); // For player
		analyser.connect(context.destination); // For player
		analyser.smoothingTimeConstant = 0.9; // 0.85
		analyser.fftSize = 2048;

		// Create a buffer source node
		var sourceNode = context.createBufferSource();
		sourceNode.connect(analyser);
		analyser.connect(javascriptNode);

		var gradient = ctx.createLinearGradient(0,0,0,1080);
		gradient.addColorStop(0,'#ab032a');
		gradient.addColorStop(0.25,'#960023');
		gradient.addColorStop(0.5,'#75001b');
		gradient.addColorStop(0.75, '#5c0217');
		gradient.addColorStop(1,'#450111');

		javascriptNode.onaudioprocess = function() {
			
			// Get the average for the first channel
			spectrumData = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(spectrumData);
		}

		window.requestAnimationFrame(drawSpectrum);

		function drawSpectrum() {
			// Check if vis is disabled (only run if returns true)
			if(getCookie("grVis") !== "false") {
				var array = spectrumData;

				// Clear the current state
				ctx.clearRect(0,0,2560,1440);
				// Set the fill style
				ctx.fillStyle=gradient;
				
				//document.getElementById("barvalue").innerHTML = (array[0] * 2) + "";
				for(var i=0;i<(array.length);i++) {
					var value = (array[i] * 3); // * 3 to make the bars peak higher
					ctx.fillRect(i*4,((1080-value)/2),2,value);
				}
				window.requestAnimationFrame(drawSpectrum);
			}
		}
		playerContext = true;
	}
}

function toggleStream(src) {
	if(audio.currentTime > 0 && !audio.ended) {
		stopStream(false, src);
	 } else {
		playStream(src);
	 }
}


function playStream(src) {
	if(playerContext == false) {
		playerContextSet();
	}
	if(audio.currentTime == 0) {
		audio.setAttribute('src', src);
		audio.play(); // Play stream
	}
	else {
		stopStream(true, src);
	}
}

function stopStream(restart, src) {
	audio.pause();
	audio.setAttribute('src', '');
	audio.load(); // Disconnect from server
	audio.currentTime = 0;
	if(restart) {
		playStream(src);
	}
}

function adjustVolume(vol) {
	//console.log("Adjusting to: "+vol)
	audio.volume = vol;
	setCookie("grvolume", vol, 90);
}

function toggleVis() {
	// Cookie not set OR Cookie set to on / "" off
	// Toggle state
	if(getCookie("grVis") !== "false") {
		setCookie("grVis", "false", 90);
	} else {
		setCookie("grVis", "true", 90);
	}
	// Reload window
	location.reload();
	
}
// End music player
