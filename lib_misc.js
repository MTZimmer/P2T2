// Ran code through http://jsbeautifier.org/
"use strict";

function sort_unique(arr) {
    arr = arr.sort(function(a, b) {
        return a * 1 - b * 1;
    });
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
        if (arr[i - 1] !== arr[i]) {
            ret.push(arr[i]);
        }
    }
    return ret;
}

// function FileHelper() {} {
// FileHelper.readStringFromFileAtPath = function(pathOfFileToReadFrom) {
// var request = new XMLHttpRequest();
// request.open("GET", pathOfFileToReadFrom, false);
// request.send(null);
// var returnValue = request.responseText;

// return returnValue;
// }
// }

function createArray(len, itm) {
    var arr1 = [itm],
        arr2 = [];
    while (len > 0) {
        if (len & 1) arr2 = arr2.concat(arr1);
        arr1 = arr1.concat(arr1);
        len >>>= 1;
    }
    return arr2;
}

//a resuable function for async XMLHttpRequests
function getXMLHttpRequest(url, json, func) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            func(xmlhttp.responseText);
        }
    }

    xmlhttp.open("GET", url, true);
    if (json === true) {
        xmlhttp.setRequestHeader("Accept", "application/json");
    }
    xmlhttp.send();
}
