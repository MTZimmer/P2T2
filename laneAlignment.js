// Visualizes multiple aligned and annotated protein sequences.
//
// graphLayout - GraphLayout object
// data - sequence alignment data
// referenceSequence - ID of the sequence considered to be reference
// laneLayout - LaneLayout object
function AlignmentLane(
  graphLayout,
  data,
  referenceSequence,
  laneLayout
) {
  var lane = this;

  this.name = "aligned";
  this.title = "Multiple Alignment";
  this.data = data;
  this.numSequences = data.MSA.length;
  this.referenceSequence = referenceSequence;
  this.referenceIndex = -1;
  this.numAaDisplayed = Math.floor(width / 20);
  for (var i = 0; i < this.numSequences; i++) {
    var msa = data.MSA[i];
    if (msa.ID === this.referenceSequence) {
      this.referenceIndex = i;
      break;
    }
  }
  this.coordinateMap = coordinateMappingFunction(data.MSA[this.referenceIndex].Seq);
  this.layout = laneLayout;
  this.graphLayout = graphLayout;
  this.xScaleCustom = d3.scale.linear();
  this.xScaleCustom.domain([1 - 0.5, this.numAaDisplayed + 0.5]);
  this.updateRange();

  this.yScale = d3.scale.linear()
    .domain([0, this.numSequences])
    .range(laneLayout.range());

  xAxisAnnotation(graphLayout, laneLayout, this);

  this.group = graphLayout.addDataGroup(laneLayout, this.name);

  this.xPos = function (d) {
    return this.xScaleCustom(d.start - 0.5);
  };
  this.barWidth = function (d) {
    return this.xScaleCustom(d.stop + 1) - this.xScaleCustom(d.start);
  };
  //this.exonElements = this.exons.selectAll("rect").data(exons)
  //    .enter()
  //    .append("svg:rect")
  //    .attr("x", this.xPos)
  //    .attr("y", 0)
  //    .attr("width", this.barWidth)
  //    .attr("height", laneLayout.height)
  //    .attr("style", function (d) {
  //        return d.odd ? "fill:rgba(117,  25, 117, 0.3)" : "fill:rgba(224, 163, 102, 0.3)"
  //    });

  // A group for all the letters
  this.letters = this.group.append("g")
    .attr("class", "alignment-lane")
    .attr("width", graphLayout.width)
    .attr("height", laneLayout.height);

  // Create title for the row
  for (var i = 0; i < this.numSequences; i++) {

    if (this.data.MSA[i].ID.indexOf('_') < 0) {
      var newLink = graphLayout.entire.append("a")
        .attr("xlink:href", "http://www.uniprot.org/uniprot/" + this.data.MSA[i].ID)
        .attr("target", "_blank")
        .append("rect")
        .attr("x", 0)
        .attr("y", graphLayout.margin.top + laneLayout.y + this.yScale(i + 0.75))
        .attr("height", 14)
        .attr("width", graphLayout.margin.left - leftColumnBorder)
        .style("fill", "lightgray");
      //.attr("rx", 10) // these make the area rounded
      //.attr("ry", 10);
    }

    var newText = graphLayout.entire.append("text")
      .attr("x", graphLayout.margin.left - leftColumnBorder - 2)
      .attr("y", graphLayout.margin.top + laneLayout.y + this.yScale(i + 0.75))
      .attr("width", graphLayout.margin.left - leftColumnBorder)
      .attr("height", 2)
      .attr("class", "line-title")
      .attr("style", "font-size: 13px")
      .text(this.data.MSA[i].Name);
    // this.data.MSA[i].Name = Gene Symbol
    // this.data.MSA[i].ID = UniProt ID

  }

  // Hovered letters
  this.hovered = {};
  this.hovered.group =
    graphLayout.entire.append("g")
      .attr("class", "alignment-lane-hover")
      .attr("transform",
        "translate(" +
        graphLayout.margin.left +
        ", " +
        (this.layout.y + graphLayout.margin.top) +
        ")");
  this.hovered.rect =
    this.hovered.group.append("rect")
      .attr("height", laneLayout.height);
  this.hovered.letters = [];
  for (var i = 0; i < this.numSequences; i++) {
    this.hovered.letters.push(this.hovered.group.append("text")
      .attr("y", this.yScale(i + 0.5)));
  }

  // Highlighted letters
  this.highlighted = {};
  this.highlighted.group =
    graphLayout.entire.insert("g", ":first-child")
      .attr("class", "alignment-lane-highlight")
      .attr("transform",
        "translate(" +
        graphLayout.margin.left +
        ", " +
        (this.layout.y + graphLayout.margin.top) +
        ")");
  this.highlighted.rect =
    this.highlighted.group.append("rect")
      .attr("height", laneLayout.height);
  this.highlighted.letters = [];
  for (var i = 0; i < this.numSequences; i++) {
    this.highlighted.letters.push(this.highlighted.group.append("text")
      .attr("y", this.yScale(i + 0.5)));
  }
  this.highlightedAA = -1;
}

AlignmentLane.prototype = {
  appendDetails: function (element, aminoAcid) {
    element.append("<h4>" + this.title + "</h4>");
    var html="<table class='mult-align-table'><tbody>";
    var mappedAminoAcid = this.coordinateMap(aminoAcid);
    for (var i = 0; i < this.numSequences; i++) {
      var msa = this.data.MSA[i];
      var seqText = msa.Seq;
      var aa = seqText[mappedAminoAcid - 1];
      if (aa !== '-') {
        var seqName = msa.Name;
        var pos = positionWithinSequence(seqText, mappedAminoAcid - 1) + 1;

        var ann = this.data.annotations[i][mappedAminoAcid];

        html += "<tr><td>" + seqName + "</td><td>#" + pos + "</td>";

        if (ann) {
          aa = "<span style='border-radius: 3px; padding: 0 5px; background-color: " + ann.bg_color
                                + "; color: " + ann.fg_color + "'>" + aa + "</span>";
        } else {
          aa = "<span style='padding: 0 5px'>" + aa + "</span>";
        }

        html += "<td>"+aa+"</td>";
        html += "</tr>";

        if (ann) {
          html += "<tr><td colspan='3' class='mult-align-annotation'>";
          html += ann.ID + " " + ann.variant + " - " + ann.phenotype;
          html += "</td></tr>";
        }

      }
    }
    html += "</tbody></table>";
    element.append(html);
  },
  highlight: function (aminoAcid) {
    var mappedAminoAcid = this.coordinateMap(aminoAcid);
    if (mappedAminoAcid >
        this.xScaleCustom.domain()[0] &&
        mappedAminoAcid <
        this.xScaleCustom.domain()[1]) {
      var x = this.xScaleCustom(mappedAminoAcid);
      var w = Math.max(this.xScaleCustom(mappedAminoAcid + 1) - x, 10);

      this.highlighted.group.attr("display", null);

      this.highlighted.rect
        .attr("x", x - w / 2)
        .attr("width", w);

      for (var i = 0; i < this.numSequences; i++) {
        this.highlighted.letters[i]
          .attr("x", x)
          .text(this.data.MSA[i].Seq[mappedAminoAcid - 1]);
      }
    }
    else {
      this.highlighted.group.attr("display", "none");
    }
    this.highlightedAA = aminoAcid;
  },

  unhighlight: function () {
    this.highlighted.group.attr("display", "none");
    this.highlightedAA = -1;
  },

  hover: function (aminoAcid, mouseY) {
    var mappedAminoAcid = this.coordinateMap(aminoAcid);
    if (mappedAminoAcid >
        this.xScaleCustom.domain()[0] &&
        mappedAminoAcid <
        this.xScaleCustom.domain()[1]) {
      var x = this.xScaleCustom(mappedAminoAcid);
      var w = Math.max(this.xScaleCustom(mappedAminoAcid + 1) - x, 10);

      this.hovered.group.attr("display", null);

      this.hovered.rect
        .attr("x", x - w / 2)
        .attr("width", w);

      for (var i = 0; i < this.numSequences; i++) {
        this.hovered.letters[i]
          .attr("x", x)
          .text(this.data.MSA[i].Seq[mappedAminoAcid - 1]);
      }
    }
    else {
      this.xScaleCustom.domain([
        Math.max(1, mappedAminoAcid - this.numAaDisplayed / 2) -
        0.5,
        Math.min(this.data.MSA[0].Seq.length,
        mappedAminoAcid + this.numAaDisplayed / 2) +
        0.5
      ]);
      // Make sure to update the highlight
      if (this.highlightedAA > 0) {
        this.highlight(this.highlightedAA);
      }
      this.update();
    }
  },

  unhover: function () {
    this.hovered.group.attr("display", "none");
  },

  customHighlight: true,

  update: function () {
    this.numAaDisplayed = Math.floor(width / 12);
    this.updateRange();

    // Try to copy range from the main graph if mostly small
    var mainDomain = xScale.domain();
    var startPos = this.coordinateMap(Math.ceil(mainDomain[0]));
    var endPos = this.coordinateMap(Math.floor(mainDomain[1]));
    if (endPos - startPos < this.numAaDisplayed) {
      this.xScaleCustom.domain([startPos - 0.5, endPos + 0.5]);
    }

    this.letters[0][0].innerHTML = "";

    for (var seqId = 0; seqId < this.numSequences; seqId++) {
      var prevDisplayedX = -1e6;

      var sequence = this.data.MSA[seqId].Seq;
      for (var j = Math.ceil(this.xScaleCustom.domain()[0]); j <
                                                             this.xScaleCustom.domain()[1]; j++) {
        var xPos = this.xScaleCustom(j);

        var text = sequence[j - 1];

        var ann = this.data.annotations[seqId][j];

        if (ann) {
          this.letters.append("svg:rect")
            .attr("x", this.xScaleCustom(j - 0.5) + 1)
            .attr("y", this.yScale(seqId + 1) + 1)
            .attr("width", this.xScaleCustom(j + 0.5) - this.xScaleCustom(j - 0.5) - 2)
            .attr("height", this.yScale(seqId) - this.yScale(seqId + 1) - 2)
            .attr("rx", "3")
            .attr("ry", "3")
            .attr("style", "fill:" + ann.bg_color);
        }

        var letter = this.letters.append("svg:text")
          .attr("x", xPos)
          .attr("y", this.yScale(seqId + 0.5))
          .text(text);

        if (ann) {
          letter
            .attr("fill", ann.fg_color)
            .attr("class", "annotation-font-" + ann.font_face)
            .append("title")
            .text(ann.ID + " " + ann.variant + " - " + ann.phenotype);
        }
        prevDisplayedX = xPos;
      }
    }
  },

  updateRange: function () {
    var width = $("#graph-container").width() - margin.left - margin.right;
    this.xScaleCustom = this.xScaleCustom.range([0, width]);
  }

};

// Map amino acid position to amino acid position within an aligned sequence (skipping dashes)
function coordinateMappingFunction(sequence) {
  var mappingArray = [0];
  var currentOffset = 0;
  for (var i = 0; i < sequence.length; i++) {
    if (sequence[i] !== "-") {
      mappingArray.push(i + 1);
    }
  }
  return function (pos) {
    return mappingArray[pos];
  }
}

// Count how many non-dashes are there in a sequence (==position within given sequence)
function positionWithinSequence(sequence, pos) {
  count = 0;
  for(var i = 0; i<pos; i++) {
    if(sequence[i]!=='-') {
      count++;
    }
  }
  return count;
}