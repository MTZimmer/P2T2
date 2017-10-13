// Visualizes protein sequence.
// Produces ellipses, highlights exons
//
// graphLayout - GraphLayout object
// sequence - sequence of amino acids to display
// exons - list of intervals (start, stop) where the exons are located. The odd ones are exons, even ones are introns
// laneLayout - LaneLayout object
function ProteinSequenceLane(graphLayout,
                             sequence, exons,
                             laneLayout
) {
  var lane = this;

  this.name = "sequence";
  this.title = "Protein Sequence";
  this.sequence = sequence;
  this.layout = laneLayout;
  this.graphLayout = graphLayout;

  this.yScale = d3.scale.linear()
    .domain([0, 1])
    .range(laneLayout.range());

  this.group = graphLayout.addDataGroup(laneLayout, this.name);

  this.exons = this.group.append("g")
    .attr("width", graphLayout.dataWidth)
    .attr("height", laneLayout.height);

  this.xPos = function (d) {
    return xScale(d.start - 0.5);
  };
  this.barWidth = function (d) {
    return xScale(d.stop + 1) - xScale(d.start);
  };
  this.exonElements = this.exons.selectAll("rect").data(exons)
    .enter()
    .append("svg:rect")
    .attr("x", this.xPos)
    .attr("y", 0)
    .attr("width", this.barWidth)
    .attr("height", laneLayout.height)
    .attr("style", function (d) {
      return d.odd ? "fill:rgba(117,  25, 117, 0.3)" : "fill:rgba(224, 163, 102, 0.3)"
    });

  this.letters = this.group.append("g")
    .attr("width", graphLayout.width)
    .attr("height", laneLayout.height)
    .attr("class", "protein-sequence");

  this.letter = {};
  this.letter.group =
    graphLayout.entire.append("g")
      .attr("class", "protein-sequence-lane-highlight")
      .attr("transform",
        "translate(" +
        graphLayout.margin.left +
        ", " +
        (this.layout.y + graphLayout.margin.top) +
        ")");
  this.letter.rect =
    this.letter.group.append("rect")
      .attr("height", laneLayout.height);
  this.letter.letter =
    this.letter.group.append("text")
      .attr("y", (this.layout.y + this.layout.height / 2));
}

ProteinSequenceLane.prototype = {
  appendDetails: function (element, aminoAcid) {
    element.append("<h4>AA #" + aminoAcid + " - <span class='aa-letter'>" + this.sequence[aminoAcid - 1] + "</span></h4>")
  },
  hover: function (aminoAcid, mouseY) {
    var x = xScale(aminoAcid);
    var w = Math.max(xScale(aminoAcid + 1) - x, 10);

    this.letter.group.attr("display", null);

    this.letter.rect
      .attr("x", x - w / 2)
      .attr("width", w);

    this.letter.letter
      .attr("x", x)
      .text(this.sequence[aminoAcid - 1]);

  },

  unhover: function () {
    this.letter.group.attr("display", "none");
  },

  customHighlight: true,

  update: function () {
    this.exonElements
      .attr("x", this.xPos)
      .attr("width", this.barWidth);

    this.letters[0][0].innerHTML = "";

    var prevDisplayedX = -1e6;
    var wasSkipped = false; // We did not get to display previous letter
    var numPreviousDots = 0; // How many dots did we display so far
    var MAX_DOTS_IN_A_ROW = 1;
    for (var i = Math.ceil(xScale.domain()[0]) - 1; i < xScale.domain()[1]; i++) {
      var xPos = xScale(i + 1);

      if (xPos - prevDisplayedX > 10) {
        var text = this.sequence[i];
        var ellipsis = false;

        if (wasSkipped) {
          if (numPreviousDots < MAX_DOTS_IN_A_ROW) {
            text = "\u2026";
            ellipsis = true;
            numPreviousDots++;
          }
          wasSkipped = false;
        }
        this.letters.append("svg:text")
          .attr("x", xPos)
          .attr("y", this.layout.height / 2)
          .text(text);
        prevDisplayedX = xPos;
        if (!ellipsis) {
          numPreviousDots = 0;
        }
      }
      else {
        wasSkipped = true;
      }
    }
  }
};
