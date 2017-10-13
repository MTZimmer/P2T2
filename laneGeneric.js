function titleWithSymbol(lane) {
  if (lane.title) {
    return lane.title + (isLaneHidden(lane.name) ? " ▸" : " ▾");
  }
  return lane.title;
}

// Visualizes generic row group
function xAxisAnnotation(graphLayout, laneLayout, lane) {
  graphLayout.entire.append("rect")
    .attr("x", 0)
    .attr("y", graphLayout.margin.top + laneLayout.y - 10)
    .attr("width", graphLayout.margin.left - leftColumnBorder)
    .attr("height", laneLayout.height + 15)
    .attr("class", "rowGroupRect");

  graphLayout.entire.append("text")
    .attr("x", 5)
    .attr("y", graphLayout.margin.top + laneLayout.y - 25)
    .attr("width", graphLayout.margin.left)
    .attr("class", "rowGroupLabel")
    .text(titleWithSymbol(lane))
    .on("click", function (d, i) {
      toggleLaneHidden(lane);
      d3.select(this).text(titleWithSymbol(lane));
    });
}

// rowLabels - one of "none", "color", "black"
function GenericLane(graphLayout, data, laneLayout, spaceBetweenRows, rowLabels) {
  var lane = this;
  this.name = data.name;
  this.title = data.title;
  this.layout = laneLayout;
  this.data = data;
  if (laneLayout.hidden) {
    rowLabels = "none";
  }

  // Y scale
  this.yScale = d3.scale.linear()
    .domain(data.yDomain(spaceBetweenRows))
    .range(laneLayout.reverseRange());

  xAxisAnnotation(graphLayout, laneLayout, lane);

  // A group element to hold the visualization (+annotation)
  this.group = graphLayout.addDataGroup(laneLayout, this.name);

  this.elements = [];

  // Appropriate color palette for the number of rows we need to distinguish
  this.palette = palette[Math.max(Math.min(data.rows.length, palette.length - 1), 0)];
  var myPalette = this.palette;

  // Functions that map coordinate space to screen space
  var lineWidthHalf = 2;
  this.x1 = function (d) {
    return Math.min(xScale(d.start - 0.5) + lineWidthHalf + 1, xScale(d.start));
  };
  this.x2 = function (d) {
    return Math.max(xScale(d.stop + 0.5) - lineWidthHalf - 1, xScale(d.stop));
  };
  this.yForTop = function (topY) {
    return function (d) {
      return lane.yScale(d.overlap + topY);
    };
  };
  this.text = function (d) {
    return d.text;
  };
  this.strokeWidth = function (d) {
    return d.group ? 6 : undefined;
  };
  this.color = function (i) {
    if (data.rows[i].hasOwnProperty("color") && data.rows[i].color) {
      var color = data.rows[i].color;
      return function (d) {
        // If color is defined on the interval, use it
        if (d.hasOwnProperty("color") && d.color !== null) {
          return d.color;
        }
        // Fall back to row color
        return color;
      }
    }
    return function (d) {
      // If color is defined on the interval, use it
      if (d.hasOwnProperty("color") && d.color !== null) {
        return d.color;
      }

      // Fall back to default palette
      return myPalette[i % myPalette.length];
    }
  };
  var topY = 0;

  this.rowY = [];

  this.hoverLine = graphLayout.data.append("line")
    .attr("display", "none");

  this.hoverText = graphLayout.data.append("text")
    .attr("class", "highlight-closest-text")
    .attr("display", "none");

  // Turn each group into horizontal lines
  for (var i = 0; i < data.rows.length; i++) {
    var row = data.rows[i];
    var seriesName = row.name;
    var seriesData = row.intervals; // { start, stop, text }

    var seriesGroup = this.group.append("g")
      .attr("class", data.name + "-" + seriesName);

    var y = this.yForTop(topY);

    if (rowLabels !== "none") {
      // Create title for the row
      var newText = graphLayout.entire.append("text")
        .attr("x", graphLayout.margin.left - leftColumnBorder - 2)
        .attr("y", y({ overlap: 0 }) + laneLayout.y + graphLayout.margin.top - 5)
        .attr("width", graphLayout.margin.left - leftColumnBorder)
        .attr("height", 2)
        .attr("class", "line-title")
        .text(row.name);

      if (rowLabels == "color") {
        newText.attr("fill",
          row.hasOwnProperty("color") ? row.color : myPalette[i % myPalette.length]);
      }
      else {

      }
    }

    this.rowY[i] = lane.yScale(0 + topY); // Store where the row starts when zero overlap

    this.elements.push(seriesGroup
      .selectAll("line")
      .data(seriesData)
      .enter()
      .append("line")
      .attr("x1", this.x1)
      .attr("y1", y)
      .attr("x2", this.x2)
      .attr("y2", y)
      .attr("stroke", this.color(i))
      .attr("stroke-width", this.strokeWidth)
      .attr("xlink:href", function (d) {
        return d.url;
      })
      .attr("title", this.text));

    topY += row.maximumOverlap + spaceBetweenRows;
  }
}

GenericLane.prototype = {
  // On update, recalculate start and end coordinates by re-setting their function
  update: function () {
    for (var i = 0; i < this.elements.length; i++) {
      this.elements[i]
        .attr("x1", this.x1)
        .attr("x2", this.x2);
    }
  },
  appendDetails: function (element, aminoAcid) {
    var wasHeader = false;
    for (var i = 0; i < this.data.rows.length; i++) {
      var row = this.data.rows[i];
      var seriesData = row.intervals; // { start, stop, text, url }
      for (var j = 0; j < seriesData.length; j++) {
        var interval = seriesData[j];
        if (interval.start <= aminoAcid && aminoAcid <= interval.stop) {
          if (!wasHeader) {
            element.append("<h4>" + this.title + "</h4>");
            wasHeader = true;
          }
          element.append("<a href='" + interval.url + "'>" + interval.text + "</a><br/>");
        }
      }
    }
  },
  click: function () {
    if (this.hasOwnProperty("closest")) {
      if (this.closest.aaMatch && this.closest.distance < 5) {
        if (this.closest.interval.hasOwnProperty("url") && this.closest.interval.url !== null) {
          window.open(this.closest.interval.url, "_blank");
          return true;
        }
      }
    }
    return false;
  },

  hover: function (aminoAcid, mouseY) {
    // Find closest element
    this.closest = {
      minRow: -1,
      minInterval: -1,
      distance: 1000000, // Distance in Y axis
      start: -1,
      stop: -1,
      y: -1,
      aaDistance: 1000000, // Distance from amino acid
      aaMatch: false // True if the closest item matches the amino acid we are highlighting
    };

    for (var i = 0; i < this.data.rows.length; i++) {
      var row = this.data.rows[i];
      var y = this.rowY[i] + this.layout.y;

      var seriesData = row.intervals; // { start, stop, text, url }

      for (var j = 0; j < seriesData.length; j++) {
        var interval = seriesData[j];
        var aaMatch = interval.start <= aminoAcid && aminoAcid <= interval.stop;
        if (this.closest.aaMatch && !aaMatch) {
          continue; // We already have interval that matches AA, but the new one doesn't
        }
        var yInterval = y + this.yScale(interval.overlap);
        var distance = Math.abs(mouseY - yInterval);
        var aaDistance = aaMatch ?
          0 :
          Math.min(Math.abs(aminoAcid - interval.start), Math.abs(aminoAcid - interval.stop));

        var betterMatch = (aaMatch && !this.closest.aaMatch) ||
                          aaDistance <
                          this.closest.aaDistance ||
                          (aaDistance ==
                           this.closest.aaDistance &&
                           (distance < this.closest.distance));
        if (betterMatch) {
          this.closest.distance = distance;
          this.closest.minRow = i;
          this.closest.minInterval = j;
          this.closest.interval = interval;
          this.closest.y = yInterval;
          this.closest.aaMatch = aaMatch;
          this.closest.aaDistance = aaDistance;
        }
      }
    }

    if (this.closest.minRow != -1) {
      var lineWidthHalf = 2;
      // Found a closest entry
      // Highlight it!

      var color = this.data.rows[this.closest.minRow].hasOwnProperty("color") ?
        this.data.rows[this.closest.minRow].color
        : this.palette[this.closest.minRow % this.palette.length];

      this.hoverLine
        .attr("x1",
          Math.min(xScale(this.closest.interval.start),
            xScale(this.closest.interval.start - 0.5) + lineWidthHalf + 1))
        .attr("x2",
          Math.max(xScale(this.closest.interval.stop),
            xScale(this.closest.interval.stop + 0.5) - lineWidthHalf - 1))
        .attr("y1", this.closest.y)
        .attr("y2", this.closest.y)
        .attr("stroke", color)
        .attr("class", "highlight-closest-line")
        .attr("display", null);

      var xText = xScale(this.closest.interval.stop + 0.5) + 3; // Right end of the line
      if (this.closest.aaMatch &&
          (xScale(this.closest.interval.stop + 0.5) - xScale(this.closest.interval.start - 0.5)) >
          100) {
        // The interval is long and we matched the amino acid
        // The text is too far from the current position
        xText = xScale(aminoAcid + 0.5) + 3;
      }

      this.hoverText
        .attr("x", xText)
        .attr("y", this.closest.y - 3)
        .attr("fill", "black")
        .attr("display", null)
        .attr("background", "lightsteelblue")
        .attr("text-anchor", "start")
        .text(this.closest.interval.text);

      // Correct for sliding out of screen
      var length = this.hoverText[0][0].clientWidth;
      if (xText + length > width) {
        xText = xScale(this.closest.interval.start - 0.5) - 3;
        if (this.closest.aaMatch &&
            (xScale(this.closest.interval.stop + 0.5) - xScale(this.closest.interval.start - 0.5)) >
            100) {
          // The interval is long and we matched the amino acid
          // The text is too far from the current position
          xText = xScale(aminoAcid - 0.5) + 3;
        }
        this.hoverText
          .attr("x", xText)
          .attr("text-anchor", "end");
      }
    }
  },
  unhover: function () {
    this.hoverLine
      .attr("display", "none");
    this.hoverText
      .attr("display", "none");
  }
};