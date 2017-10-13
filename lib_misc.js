// Ran code through http://jsbeautifier.org/
"use strict";

function sort_unique(arr) {
  arr = arr.sort(function (a, b) {
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
