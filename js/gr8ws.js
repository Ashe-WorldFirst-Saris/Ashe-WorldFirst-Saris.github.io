var navIsSolid = false;
var screenWidth = $(window).width();
var grVol, t, tt, previousTitle, duration, played, remaining, currentSongId;
var recheck = 0;
var currentSelectedRating = 0;
var currentSongFavorite = 0;

// WSS
var clientId;

function getCookie(cname) {
    var name = cname + "=";
    var dc = decodeURIComponent(document.cookie);
    var ca = dc.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
    }
    return "";
}

function navPositionCheck() {
    var aTop = 100;
    var aCur = $(this).scrollTop();
    if((aTop - aCur) < 0) {
        // Solid BG
        if(!navIsSolid) {
            $("#navTop").animate({backgroundColor: "#111111cc"}, "fast");
            $("#navBot").animate({backgroundColor: "#111111cc"}, "fast");
            navIsSolid = true;
        }
    } else {
        // Transparent BG
        if(navIsSolid) {
            $("#navTop").animate({backgroundColor: "transparent"}, "fast");
            $("#navBot").animate({backgroundColor: "transparent"}, "fast");
            navIsSolid = false;
        }
    }
}

function navInitialPositionCheck() {
    var aTop = 100;
    var aCur = $(this).scrollTop();
    if((aTop - aCur) < 0) {
        // Solid BG
        if(!navIsSolid) {
            $("#navTop").css({backgroundColor: "#111111cc"});
            $("#navBot").css({backgroundColor: "#111111cc"});
            navIsSolid = true;
        }
    }
}

function getNowPlaying() {
    $.getJSON('https://gensokyoradio.net/api/station/playing/', function(data) {
        
    });
}

function secondTick() {
    // Check value of t every 1000ms
    clearTimeout(tt);
    if(played != "" && !isNaN(played) && remaining >= 0 && played < duration) {
        let curS = (played % 60)+'';
        let curM = Math.floor(played / 60)+'';
        let durS = (duration % 60)+'';
        let durM = Math.floor(duration / 60)+'';
        $("#playerCounter").html(curM+":"+curS.padStart(2, '0')+" / "+durM+":"+durS.padStart(2, '0'));
        $("#songBarCounter").html(curM+":"+curS.padStart(2, '0')+" / "+durM+":"+durS.padStart(2, '0'));
    played++;
    } else {
        $("#playerCounter").html("--:-- / --:--");
        $("#songBarCounter").html("--:-- / --:--");
    }
    tt = setTimeout(secondTick, 1000);
}

function isJSON(str) {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

function setupWSS() {
    let socket = new WebSocket("wss://gensokyoradio.net/wss");

    socket.onopen = function(e) {
        console.log("Connection established");
        //socket.send("grInitialConnection"); // Before WS rework 06-2023
        socket.send('{"message":"grInitialConnection"}');
    };

    socket.onmessage = function(event) {
        // Convert JSON
        let jsonData = JSON.parse(event.data);

        if(jsonData.message === "welcome") { clientId = jsonData.id; /*console.log("ID stored: "+clientId)*/}
        else if(jsonData.message === "ping") { pingRecv(socket); }
        else if(jsonData.title) {
            // Station data
            //console.log(event.data);
            // Parse message
            var data = jsonData;

            title = data["title"];
            artist = data["artist"];
            album = data["album"];
            year = data["year"];
            circle = data["circle"];
            duration = parseInt(data["duration"]);
            played = parseInt(data["played"]) + 1;
            remaining = parseInt(data["remaining"]) - 1;
            currentSongId = data["songid"];
            albumArt = data["albumart"]; // Includes full path
            //if(albumArt != "") artImgSrc = "https://gensokyoradio.net/images/albums/500/"+albumArt;
            //else artImgSrc = "https://gensokyoradio.net/images/assets/gr-logo-placeholder.png";
            artImgSrc = albumArt;

            //if(title != "" && title != previousTitle && !isNaN(played) && remaining >= 0) {
            if(title != "" && title != previousTitle) {
                // Set display info
                $("#playerTitle").animate({left: '100px', opacity:0}, 500);
                $("#playerArtist").animate({left: '100px', opacity:0}, 500);
                $("#playerAlbum").animate({left: '100px', opacity:0}, 500);
                $("#playerCircle").animate({left: '100px', opacity:0}, 500);
                $("#playerArt").fadeOut(500, function() {
                    $('<img/>').attr('src', artImgSrc).on('load', function() {
                        $(this).remove();
                        $('#playerArt').attr("src", artImgSrc).fadeIn(500);
                        $("#playerTitle").html(title).delay(100).animate({left: '0px', opacity:1}, 1000);
                        $("#playerArtist").html(artist).delay(200).animate({left: '0px', opacity:1}, 1000);
                        $("#playerAlbum").html(album).delay(300).animate({left: '0px', opacity:1}, 1000);
                        $("#playerCircle").html(circle).delay(400).animate({left: '0px', opacity:1}, 1000);
                        $('#bg1').fadeOut(1500, function() {
                            $(this).css('background-image', 'url('+artImgSrc+')').fadeIn(3000);
                        });
                    });
                });

                // Songbar updates
                $('<img/>').attr('src', artImgSrc).on('load', function() {
                    $(this).remove();
                    $("#songBarTitle").html(title);
                    $("#songBarArtist").html(artist+" - ");
                    $("#songBarAlbum").html(album+" ("+circle+")");
                    $("#songBarImage").attr('src', artImgSrc);
                });

                // Set duration bar
                let curPercent = (played / duration) * 100;
                $("#durationBar").stop().css("width", curPercent+"%").animate({width: "100%"}, (remaining*1000), "linear");
                //$("#songBarDuration").stop().css("width", curPercent+"%").animate({width: "100%"}, (remaining*1000), "linear");

                // Song Timer
                /* Commented for WS
                clearTimeout(t);
                if(remaining < 10) {
                    t = setTimeout(getNowPlaying, 5000);
                } else {
                    t = setTimeout(getNowPlaying, remaining*1000);
                }
                */
                previousTitle = title;
                recheck = 0;

                // Change Rating Info
                $("#ratinginfo").fadeOut(500, function() {
                    if(currentSongId != 0) {
                        $.get("/js/get_rating.php", { songid: currentSongId },
                        function(data) {
                            ratingSelectOutput(data);
                            //$("#data").html(data);
                            //console.log(data);
                        });
                        $(this).fadeIn(600);
                    }
                });

                // Change Favorite Info
                $("#favorite_icon").fadeOut(500, function() {
                    if(currentSongId != 0) {
                        $.get("/js/get_favorite.php", { songid: currentSongId },
                        function(data) {
                            //console.log(data);
                            if(data == "1") {
                                $("#favorite_icon").attr('src', '/images/assets/favorite_1.png');
                                currentSongFavorite = 1;
                            } else {
                                $("#favorite_icon").attr('src', '/images/assets/favorite_0.png');
                                currentSongFavorite = 0;
                            }
                        });
                        $(this).fadeIn(600);
                    }
                });

            } else {
                // WS will send data when it's available
            }
        }
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            // e.g. server process killed or network down (1006)
            console.log(`Connection died, code=${event.code} reason=${event.reason}, restarting...`);
            // Noisy Delay for Recheck
            recheck++;
            var n;
            switch(recheck) {
                case 1:
                    n = Math.floor((Math.random() * 10) + 1);
                    break;
                case 2:
                    n = Math.floor((Math.random() * 10) + 10);
                    break;
                case 3:
                    n = Math.floor((Math.random() * 15) + 15);
                    break;
                case 4:
                    n = Math.floor((Math.random() * 15) + 30);
                    break;
                default:
                    n = Math.floor((Math.random() * 20) + 45);
                    break;
            }
            setTimeout(setupWSS, (n*1000));
        }
    };

    socket.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    };
}

function pingRecv(socket) {
    // socket.send("pong:"+clientId); // Before WS rework 06-2023
    socket.send('{"message":"pong", "id":'+clientId+'}');
}

// Volume
if(getCookie("grvolume") != "") {
    grVol = getCookie("grvolume");
}
else {
    grVol = .42; // Initial value
}

// Cookie Functions
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; path=/; " + expires;
    console.log("Stored "+cname+": "+cvalue);
}

// Country string function
function matchCountry() {
    var val = $("#country").val();

    var obj = $("#countries").find("option[value='" + val + "']");

    if(obj != null && obj.length > 0) {
        // Check if US
        if(val == "United States (Domestic and APO/FPO/DPO Mail)") {
            // US, display Zip Code
            $("#usZipCode").css("display", "block");
            // Check value of zip code
            var zipVal = $("#zipCode").val();
            var validZip = /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zipVal);
            if(validZip) {
                // Show checkout (calculate)
                $("#calculateBtn").prop("disabled", false);
            } else {
                // Hide checkout
                $("#calculateBtn").prop("disabled", true);
                $("#checkout").prop("disabled", true);
            }
        } else {
            // Other country
            $("#usZipCode").css("display", "none"); // Field not used
            $("#calculateBtn").prop("disabled", false);
        }
    } else {
        $("#checkout").prop("disabled", true);
        $("#calculateBtn").prop("disabled", true);
    }
    // Ongoing reset
    $("#shippingTotal").html("(calculate)");
    $("#shippingOptionsResponse").html("");
    $("#shippingOptionsTitle").css("display", "none");
    //console.log(val+" | "+obj.length+" | "+zipVal+" | "+validZip);
}

// Calculate Shipping
function calculateShip() {
    $("#calculateBtn").addClass("is-loading");
    var country = $("#country").val();
    var zipCode = $("#zipCode").val();
    $.post("calculateShipping.php", {"country": country, "zipCode": zipCode})
    .done(function(data) {
        // Output data
        $("#shippingOptionsTitle").css("display", "block");
        $("#shippingOptionsResponse").html(data);
        $("#calculateBtn").removeClass("is-loading");
        $("#calculateBtn").prop("disabled", true);
    })
    .fail(function() {
        // Output error message
    });
}

// Calculate Discount
function calculateDisc() {
    $("#calculateDisc").addClass("is-loading");
    $.post("calculateDiscount.php", function(data) {
        // Output result (data)
    });
}

// Shipping option selected by user
function shippingSelected() {
    // Get value
    var value = $('input[name="selectedShipping"]:checked').val();
    // Edit shipping line
    $("#shippingTotal").html("$"+value);
    // Edit total line
    var subTotal = $("#subTotal").html().substring(1);
    var discountAmt = $("#discountTotal").html().substring(1);
    var gTotal = 0;
    if(isNaN(discountAmt)) {
        gTotal = usdFormat(parseFloat(value) + parseFloat(subTotal));
    } else {
        gTotal = usdFormat(parseFloat(value) + parseFloat(subTotal) - parseFloat(discountAmt));
    }
    $("#grandTotal").html("$"+gTotal);
    // Enable checkout
    $("#checkout").prop("disabled", false);
    // Disable calculate button
    $("#calculateBtn").prop("disabled", true);
    // Store values for recall
    $.post('storeShipping.php', {'shipping':value});
}

function usdFormat(number) {
    console.log(number);
    number = number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    return number;
}


function modalToggleLogin() {
    $("#modalLoginContainer").toggleClass('is-active');
}

function modalToggleDob() {
    $("#modalDobContainer").toggleClass('is-active');
}

function modalToggleTerms() {
    $("#modalTermsContainer").toggleClass('is-active');
}

function modalTogglePrivacy() {
    $("#modalPrivacyContainer").toggleClass('is-active');
}


// Login
/*
function login() {
    $("#modalLogin").addClass("is-loading");
    let user = $("#user").val();
    let pass = $("#pass").val();
    $.post("/login/loginProcess.php", {user:user, pass:pass}, function(data) {
        $("#modalLogin").removeClass("is-loading");
        // if error exists
        if(data.error) {
            if(data.userError != "") {
                $("#userError").html(data.userError);
            }
            if(data.passError != "") {
                $("#passError").html(data.passError);
            }
        } else {
            // Update navbar
            $("#loginInfo").html(data.info);
            // Toggle modal
            modalToggleLogin();
        }
    }, "JSON");
}
*/
// Login
function login() {
    $("#modalLogin").addClass("is-loading");
    let user = $("#user").val();
    let pass = $("#pass").val();
    $.post("/login/loginProcess.php", {user:user, pass:pass}, function(data) {
        $("#modalLogin").removeClass("is-loading");
	console.log(data);
        // if error exists
        if(data.error) {
            if(data.userError != "") {
                $("#userError").html(data.userError);
            }
            if(data.passError != "") {
                $("#passError").html(data.passError);
            }
        } else {
	    // Set cookie
	    setCookie("gr_autologin", data.autologin, 30);
            // Update navbar
            $("#loginInfo").html(data.info);
            // Toggle modal
            modalToggleLogin();
        }
    }, "JSON");
}


// Rating
// Song Rating
function rating_hover(stars) {
	// This function changes the appearance of the stars on hover
	ratingSelectOutput(stars);
    /*
    switch(stars) {
		case 0:
			$("#rating_desc").html('your rating');
			break;
		case 1:
			$("#rating_desc").html('<b>Dislike</b> (Click to Rate)');
			break;
		case 2:
			$("#rating_desc").html('<b>Poor</b> (Click to Rate)');
			break;
		case 3:
			$("#rating_desc").html('<b>Okay</b> (Click to Rate)');
			break;
		case 4:
			$("#rating_desc").html('<b>Good</b> (Click to Rate)');
			break;
		case 5:
			$("#rating_desc").html('<b>Great</b> (Click to Rate)');
			break;
		default:
			$("#rating_desc").html('your rating');
	}
    */
}

function rating_out() {
	// This function resets the appearance of the orbs to the currently selected rating
	ratingSelectOutput(currentSelectedRating);
    /*
    switch(currentSelectedRating) {
		case 0:
			$("#rating_desc").html('your rating');
			break;
		case 1:
			$("#rating_desc").html('Your Rating: <b>Dislike</b>');
			break;
		case 2:
			$("#rating_desc").html('Your Rating: <b>Poor</b>');
			break;
		case 3:
			$("#rating_desc").html('Your Rating: <b>Okay</b>');
			break;
		case 4:
			$("#rating_desc").html('Your Rating: <b>Good</b>');
			break;
		case 5:
			$("#rating_desc").html('Your Rating: <b>Great</b>');
			break;
		default:
			$("#rating_desc").html('your rating');
	}
    */
}

function rating_click(stars) {
	// This function changes the currently selected rating
	$.get("/js/rating.php", { songid: currentSongId, rating: stars },
	function(data){
         //$("#load").html(data);
         var delayAmt = 2500;
         switch(data) {
            case "1": // Session not valid
                $("#rating_desc").html("You are not logged in.").show().delay(delayAmt).fadeOut();
                break;
            case "2": // UserID not valid // Not connected to station
                $("#rating_desc").html("Not connected to station.").show().delay(delayAmt).fadeOut();
                break;
            case "3": // Invalid rating
                $("#rating_desc").html("Invalid rating.").show().delay(delayAmt).fadeOut();
                break;
            case "4": // Song is invalid
                $("#rating_desc").html("Rating not submit (bad song ID).").show().delay(delayAmt).fadeOut();
                break;
            case "5": // Song not recent
                $("#rating_desc").html("Rating not submit (not a recent song).").show().delay(delayAmt).fadeOut();
                break;
            case "6": // Success
                $("#rating_desc").html("Thanks for rating!").show().delay(delayAmt).fadeOut();
                currentSelectedRating = stars;
                break;
            default:
                $("#rating_desc").html("Rating not submit (unknown error).").show().delay(delayAmt).fadeOut();
        }
    });
    ratingSelectOutput(stars);
}

function ratingSelectOutput(stars) {
    switch(stars) {
		case 0:
			$("#rating_star_1").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
			break;
		case 1:
			$("#rating_star_1").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
			break;
		case 2:
			$("#rating_star_1").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
			break;
		case 3:
			$("#rating_star_1").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
			break;
		case 4:
			$("#rating_star_1").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
			break;
		case 5:
			$("#rating_star_1").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star.png');
			break;
		default:
			$("#rating_star_1").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_2").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_3").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_4").attr('src', '/images/assets/rating_star_none.png');
			$("#rating_star_5").attr('src', '/images/assets/rating_star_none.png');
	}
}


// Song favorite status
function favorite_click(favId) {
	// This function changes the currently selected rating
    var fromPlayer = false;
    if(favId == null) {
        fromPlayer = true;
        favId = currentSongId;
    }
    var delayAmt = 2500;
    if(currentSongFavorite == 0) {
        $.post("/js/add_favorite.php", {id:favId}, function(data) {
            console.log(data);
            if(data.RESULT == "Success") {
                if(fromPlayer) {
                    // Update favorite icon
                    $("#favorite_icon").attr('src', '/images/assets/favorite_1.png');
                    // Output success message
                    $("#rating_desc").html("Song added as favorite").show().delay(delayAmt).fadeOut();
                    currentSongFavorite = 1;
                }
            } else {
                // Output error message
                $("#rating_desc").html(data.ERROR).show().delay(delayAmt).fadeOut();
            }
        });
    } else {
        $.post("/js/remove_favorite.php", {id:favId}, function(data) {
            console.log(data);
            if(data.RESULT == "Success") {
                if(fromPlayer) {
                    // Update favorite icon
                    $("#favorite_icon").attr('src', '/images/assets/favorite_0.png');
                    // Output success message
                    $("#rating_desc").html("Song removed from favorites").show().delay(delayAmt).fadeOut();
                    currentSongFavorite = 0;
                }
            } else {
                // Output error message
                $("#rating_desc").html(data.ERROR).show().delay(delayAmt).fadeOut();
            }
        });
    }
}



// Do after page load
$(function() {
    // Do an initial position check for navbar
    navInitialPositionCheck();

    // Get Now Playing Information
    //getNowPlaying();
    setupWSS();
    // Start ticking
    secondTick();

    // Check for url fragments
    if(window.location.hash) {
        $(this).delay(250).queue(function() {
            window.scrollBy(0,-150);
        });
    }

    // Check for navbar position whenever the page scrolls
    $(window).scroll(function() {
        navPositionCheck();
    });

    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
        // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
        $(".navbar-burger").toggleClass("is-active");
        $(".navbar-menu").toggleClass("is-active");
    });

    // Volume slider
    $("#volSlider").on("input change", function() {
        grVol = $(this).val();
        $("#songVolPercent").html(Math.round(grVol*100)+"%");
        adjustVolume(grVol);
    });

    // Check for window size adjustments
    $(window).resize(function() {
        screenWidth = $(window).width();
    });

    // Background parallax effect for homepage
    /*
    $(document).scroll(function() {
        var scroll = $(window).scrollTop();
        $(".hero-body").css("background-position", "0px 0" + (scroll / 4) + "px");
      });
      */
    
    // Login Modal Open Button
    document.getElementById("loginModalOpenBtn").addEventListener("click", function(event){
        event.preventDefault();
    });
});

// BULMA: Check for notifications and add listener for delete buttons
document.addEventListener('DOMContentLoaded', () => {
    (document.querySelectorAll('.notification .delete') || []).forEach(($delete) => {
        const $notification = $delete.parentNode;

        $delete.addEventListener('click', () => {
            $notification.parentNode.removeChild($notification);
        });
    });
});