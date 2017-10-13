// A highlight bar to mark a particular amino acid position
// Basically just like hover bar
function Highlight(graphLayout, lanes, graph) {
  var me = this;
  this.graphLayout = graphLayout;

  $("#highlightBar").remove();

  // How to display the highlighted AA
  this.highlightBar = graphLayout.entire.insert("g", ":first-child")
    .attr("id", "highlightBar")
    .attr("transform", "translate(0,0) scale(1, 1)")
    .attr("height", height)
    .attr("width", 1)
    .attr("class", "highlight-bar")
    .attr("display", "none");

  for (var i = 0; i < lanes.length; i++) {
    var lane = lanes[i];
    if (lane.highlight) {
      // We do not want a highligher for custom sequences (we already do that work)
      continue;
    }

    this.highlightBar.append("rect")
      .attr("x", 0)
      .attr("y", lane.layout.y)
      .attr("width", 1)
      .attr("height", lane.layout.height);
  }

  this.highlighting = false;
  this.highlightedAA = -1;
}

// Set the hover to highlight a given amino acid
Highlight.prototype = {
  highlight: function (aminoAcid) {
    this.highlightedAA = aminoAcid;
    if (aminoAcid >= xScale.domain()[0] && aminoAcid <= xScale.domain()[1]) {
      var x = xScale(aminoAcid - 0.5) + this.graphLayout.margin.left;
      var y = this.graphLayout.margin.top;
      var width = xScale(2) - xScale(1);
      this.highlightBar.attr("transform",
        "translate(" + x + "," + y + ") scale(" + width + "," + "1)");

      for (var i = 0; i < lanes.length; i++) {
        var lane = lanes[i];
        if (lane.highlight) {
          lane.highlight(aminoAcid);
        }
      }
      this.show();
    }
    else {
      this.hide();
    }
  },
  show: function () {
    if (!this.highlighting) {
      this.highlighting = true;
      if (this.highlightedAA > 0) {
        this.highlightBar.attr('display', null);
      } else {
        this.highlightBar.attr('display', 'none');
      }
    }
  },
  hide: function () {
    if (this.highlighting) {
      this.highlighting = false;
      this.highlightBar.attr('display', 'none');
      for (var i = 0; i < lanes.length; i++) {
        var lane = lanes[i];
        if (lane.unhighlight) {
          lane.unhighlight();
        }
      }
    }
  },
  disable: function () {
    this.highlightBar.attr('display', 'none');
  },
  enable: function () {
    this.highlight(this.highlightedAA);
  }
};
