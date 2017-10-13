// The lane hiding functionality is implemented using cookies.
// Basically, when the user hides a lane, a cookie is set, and screen is redrawn
// This way the tool remembers what lanes should/should not be visible, hopefully providing better user experience
// Each lane is identified using its Name - short identifier

const hiddenLaneCookie = "p2t2.hiddenLane";

function getHiddenLaneCookieArray() {
  return getCookie(hiddenLaneCookie).split(":");
}

var setHiddenLaneCookieArray = function (hidden) {
  var hiddenText = hidden.join(":");
  setCookie(hiddenLaneCookie, hiddenText, 1);
};
function hideLane(lane) {
  var hidden = getHiddenLaneCookieArray();
  if(!hidden.includes(lane.name)) {
    hidden.push(lane.name);
    setHiddenLaneCookieArray(hidden);
  }
}

function showLane(lane) {
  setHiddenLaneCookieArray(
    getHiddenLaneCookieArray()
    .filter(function(i) { return i !== lane.name; })
  );
}

function isLaneHidden(name) {
  var hidden = getHiddenLaneCookieArray();
  return hidden.includes(name);
}

// Stolen from the internet
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Stolen from the internet
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}