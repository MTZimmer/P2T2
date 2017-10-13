// Window display details for given AA
// element - the div to fill in
// lanes - information about lanes
function Details(element, lanes) {
  this.element = element;
  this.lanes = lanes;
}

// Set the hover to highlight a given amino acid
Details.prototype = {
  highlight: function (aminoAcid) {
    // Wipe it
    this.element.html("");
    for(var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      // Ask the lane to append info about itself to the element
      if (lane.appendDetails) {
        lane.appendDetails(this.element, aminoAcid);
      }
    }
  }
};
