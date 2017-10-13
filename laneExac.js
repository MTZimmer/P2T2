
// Visualizes the ExAC lane
function ExacLane(graphLayout,
                  data,
                  laneLayout) {
    var lane = this;
    this.name = "ExAC";
    this.title = "ExAC AF";
    this.layout = laneLayout;
    this.data = data;

    var border = 5;
    var rangeWithoutBorder = [laneLayout.range()[0]-border, laneLayout.range()[1]+border];

    this.yScale = d3.scale.log()
        .domain(data.yRange)
        .range(rangeWithoutBorder);

    xAxisAnnotation(graphLayout, laneLayout, this);

    this.yAxis = d3.svg.axis()
        .scale(this.yScale)
        .tickSize(5, 0)
        .ticks(5, ",.3%")
        .orient("left");

    this.yAxisGroup = graphLayout.entire.append("g")
        .attr("class", "y axis noselect")
        .attr("transform", "translate(" + (graphLayout.margin.left - leftColumnBorder) + "," + (laneLayout.y + graphLayout.margin.top) + ")")
        .call(this.yAxis);

    this.transform = function (d) {
        return "translate(" + (xScale(d[0])) + "," + lane.yScale(d[1]) + ")";
    };

    this.group = graphLayout.addDataGroup(laneLayout, this.name);

    this.hoverCircle = graphLayout.data.append("svg:circle")
        .attr("class", "highlight-closest-circle")
        .attr("r", "2px")
        .attr("display", "none");

    this.elements = this.group.selectAll("circle").data(data.data)
        .enter()
        .append("svg:circle")
        .attr("r", 2)
        .attr("transform", this.transform);

    this.hoverText = graphLayout.data.append("text")
        .attr("class", "highlight-closest-text")
        .attr("display", "none");
}

ExacLane.prototype = {
    update: function () {
        this.elements.attr("transform", this.transform);
    },

    hover: function (aminoAcid, mouseY) {
            // Find closest element
             closest = {
                 aa: -1,
                 aaDistance: 1000000,
                 y: -1,
                 yDistance: 1000000,
                 value: "",
                 closer: function(aaDist, yDist) {
                     if(aaDist < this.aaDistance) {
                         return true;
                     }
                     if(aaDist > this.aaDistance) {
                         return false;
                     }
                     if(yDist < this.yDistance) {
                         return true;
                     }
                     return false;
                 }
             };

            var exacAfTuples = this.data.data;

             for (var i = 0; i < exacAfTuples.length; i++) {
                 var aa = exacAfTuples[i][0];
                 var value = exacAfTuples[i][1];
                 var y = this.yScale(value)+this.layout.y;

                 var aaDistance = Math.abs(aa-aminoAcid);
                 var yDistance = Math.abs(y-mouseY);

                 if(closest.closer(aaDistance, yDistance)) {
                     closest.aa = aa;
                     closest.aaDistance = aaDistance;
                     closest.y = y;
                     closest.yDistance = yDistance;
                     closest.value = value;
                 }
             }

             if (closest.aa != -1) {
                 // Found a closest entry
                 // Highlight it!

                 var color = "red";
                 var valueFormat = d3.format(",.3%"); // Text to show on highlight

                 this.hoverCircle
                     .attr("cx", xScale(closest.aa))
                     .attr("cy", closest.y)
                     .attr("fill", color)
                     .attr("display", null);

                 var xText = xScale(closest.aa) + 25; // Right end of the line

                 this.hoverText
                     .attr("x", xText)
                     .attr("y", closest.y)
                     .attr("fill", color)
                     .attr("display", null)
                     .attr("text-anchor", "start")
                     .text(valueFormat(closest.value));

                 // Correct for sliding out of screen
                 var length = this.hoverText[0][0].clientWidth;
				 if(xText + length > width) {
                     xText = xScale(aminoAcid) - 5;
                     this.hoverText
                         .attr("x", xText)
                         .attr("text-anchor", "end");
                 }
             }
    },

    unhover: function() {
        this.hoverCircle
            .attr("display", "none");
        this.hoverText
            .attr("display", "none");
    }
};
