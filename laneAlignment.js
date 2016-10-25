// Visualizes multiple aligned and annotated protein sequences.
//
// graphLayout - GraphLayout object
// data - sequence alignment data
// referenceSequence - ID of the sequence considered to be reference
// laneLayout - LaneLayout object
function AlignmentLane(graphLayout,
                       data,
                       referenceSequence,
                       laneLayout) {
    var lane = this;

    this.name = "aligned";
    this.title = "Multiple Alignment";
    this.data = data;
    this.numSequences = data.MSA.length;
    this.referenceSequence = referenceSequence;
    this.referenceIndex = -1;
    this.numAaDisplayed = Math.floor(width/20);
    for (var i = 0; i < data.MSA.length; i++) {
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

    xAxisAnnotation(graphLayout, laneLayout, this.title);

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
	  
	  if (this.data.MSA[i].ID.indexOf('_') < 0){
		var newLink = graphLayout.entire.append("a")
			.attr("xlink:href", "http://www.uniprot.org/uniprot/" + this.data.MSA[i].ID )
			.attr("target","_blank")
			.append("rect")  
			.attr("x", 0 )
			.attr("y", graphLayout.margin.top + laneLayout.y + this.yScale(i + 0.75) )
			.attr("height", 14 )
			.attr("width", graphLayout.margin.left - leftColumnBorder )
			.style("fill", "lightgray");
			//.attr("rx", 10) // these make the area rounded
			//.attr("ry", 10);
	  }
			
		var newText = graphLayout.entire.append("text")
			.attr("x", graphLayout.margin.left - leftColumnBorder - 2 )
			.attr("y", graphLayout.margin.top + laneLayout.y + this.yScale(i + 0.75) )
			.attr("width", graphLayout.margin.left - leftColumnBorder)
			.attr("height", 2)
			.attr("class", "line-title")
			.attr("style", "font-size: 13px")
			.text( this.data.MSA[i].Name );
		// this.data.MSA[i].Name = Gene Symbol
		// this.data.MSA[i].ID = UniProt ID
		
	}
	
    // Highlighted letters
    this.highlighted = {};
    this.highlighted.group =
        graphLayout.entire.append("g")
            .attr("class", "alignment-lane-highlight")
            .attr("transform", "translate(" + graphLayout.margin.left + ", " + (this.layout.y + graphLayout.margin.top) + ")");
    this.highlighted.rect =
        this.highlighted.group.append("rect")
            .attr("height", laneLayout.height);
    this.highlighted.letters = [];
    for (var i = 0; i < this.numSequences; i++) {
        this.highlighted.letters.push(this.highlighted.group.append("text")
            .attr("y", this.yScale(i + 0.5)));
    }
	
}

AlignmentLane.prototype = {
    highlight: function (aminoAcid, mouseY) {
        var mappedAminoAcid = this.coordinateMap(aminoAcid);
        if (mappedAminoAcid > this.xScaleCustom.domain()[0] && mappedAminoAcid < this.xScaleCustom.domain()[1]) {
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
        } else {
            this.xScaleCustom.domain([Math.max(1, mappedAminoAcid - this.numAaDisplayed / 2) - 0.5, Math.min(this.data.MSA[0].Seq.length, mappedAminoAcid + this.numAaDisplayed / 2) + 0.5]);
            this.update();
        }
    },

    unhighlight: function () {
        this.highlighted.group.attr("display", "none");
    },

    customHighlight: true,

    update: function () {
        this.numAaDisplayed = Math.floor(width/12);
        this.updateRange();

        // Try to copy range from the main graph if mostly small
        var mainDomain = xScale.domain();
        var startPos = this.coordinateMap(Math.ceil(mainDomain[0]));
        var endPos = this.coordinateMap(Math.floor(mainDomain[1]));
        if (endPos - startPos < this.numAaDisplayed) {
            this.xScaleCustom.domain([startPos - 0.5, endPos + 0.5]);
        }

        this.letters[0][0].innerHTML = "";

        var MAX_DOTS_IN_A_ROW = 1;

        for (var seqId = 0; seqId < this.numSequences; seqId++) {
            var prevDisplayedX = -1e6;
            var wasSkipped = false; // We did not get to display previous letter
            var numPreviousDots = 0; // How many dots did we display so far

            var sequence = this.data.MSA[seqId].Seq;
            for (var j = Math.ceil(this.xScaleCustom.domain()[0]); j < this.xScaleCustom.domain()[1]; j++) {
                var xPos = this.xScaleCustom(j);

                if (xPos - prevDisplayedX > 10) {
                    var text = sequence[j - 1];
                    var ellipsis = false;

                    if (wasSkipped) {
                        if (numPreviousDots < MAX_DOTS_IN_A_ROW) {
                            text = "\u2026";
                            ellipsis = true;
                            numPreviousDots++;
                        }
                        wasSkipped = false;
                    }

                    var ann = this.data.annotations[seqId][j];

                    if(ann) {
                        this.letters.append("svg:rect")
                            .attr("x", this.xScaleCustom(j-0.5)+1)
                            .attr("y", this.yScale(seqId+1)+1)
                            .attr("width",  this.xScaleCustom(j+0.5)-this.xScaleCustom(j-0.5)-2)
                            .attr("height", this.yScale(seqId)-this.yScale(seqId+1)-2)
                            .attr("rx", "3")
                            .attr("ry", "3")
                            .attr("style", "fill:"+ann.bg_color);
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
                            .text(ann.ID + " " + ann.variant+" - "+ ann.phenotype);
                    }
                    prevDisplayedX = xPos;
                    if (!ellipsis) {
                        numPreviousDots = 0;
                    }
                } else {
                    wasSkipped = true;
                }
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