var xScale = d3.scale.linear();
var xAxis = d3.svg.axis()
  .scale(xScale)
  .tickSize(5)
  .orient("top");

// List of the "lanes" in the chart, representing different data sets
// Each lane has - name, title, svg group it belongs to, transform that goes from the coord space to screen space,
// list of graphical elements in it, yScale and yAxis
var lanes = [];

var loaded = false;
var dataModel = null;

var brush; // Brush to zoom
var brushElement; // The element displaying the brush

var graph;

var hover; // Green hover bar
var highlight; // Yellow current highlight bar
var details; // Controls the details view

var svg;

// Default palette for different numbers of colors to distinguish
var palette = [
  ['#4477aa'],
  [
    '#4477aa',
    '#cc6677'
  ],
  [
    '#4477aa',
    '#ddcc77',
    '#cc6677'
  ],
  [
    '#4477aa',
    '#117733',
    '#ddcc77',
    '#cc6677'
  ],
  [
    '#332288',
    '#88ccee',
    '#117733',
    '#ddcc77',
    '#cc6677'
  ],
  [
    '#332288',
    '#88ccee',
    '#117733',
    '#ddcc77',
    '#cc6677',
    '#aa4499'
  ],
  [
    '#332288',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#ddcc77',
    '#cc6677',
    '#aa4499'
  ],
  [
    '#332288',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#cc6677',
    '#aa4499'
  ],
  [
    '#332288',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#cc6677',
    '#882255',
    '#aa4499'
  ],
  [
    '#332288',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#661100',
    '#cc6677',
    '#882255',
    '#aa4499'
  ],
  [
    '#332288',
    '#6699cc',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#661100',
    '#cc6677',
    '#882255',
    '#aa4499'
  ],
  [
    '#332288',
    '#6699cc',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#661100',
    '#cc6677',
    '#aa4466',
    '#882255',
    '#aa4499'
  ]
];

var margin = { top: 20, right: 10, bottom: 0, left: 160 };
var leftColumnBorder = 5;
var width = 1000;
var height = 1000 - margin.top - margin.bottom;
var exacHeight = 80;
var numAA;

// Set everything up
var displayAminoAcid = function (aminoAcid) {
  $("#txt_aa_mark").val(aminoAcid);
  highlight.highlight(aminoAcid);
  details.highlight(aminoAcid);
};

// Blank the view out
function resetView() {
  svg = null;
  numAA = 0;
  xScale = null;
  brush = null;
  brushElement = null;
  height = 0;
  hover = null;
  highlight = null;
  details = null;
  generateAnnotationPanels(null);
}

function setupView() {
  graph = d3.select("#graph");

  // Handler for gene search
  $("#btn_gene_search").click(function () {
    var geneName = $("#txt_gene_search").val();
    searchGeneAsync(geneName)
      .then(function (data) {
        return processGeneResults(data);
      });
    return false;
  });

  // Reset zoom handler
  $("#graph").dblclick(resetZoom);

  $("#graph").click(function(event) {
    if (event.shiftKey) {
      // When user shift-clicks, set the mark and display details
      var aminoAcid = hover.highlightedAA;
      if (aminoAcid >= xScale.domain()[0] && aminoAcid <= xScale.domain()[1]) {
        displayAminoAcid(aminoAcid);
      }
    }
  });

  // Handler for marking amino acid position
  $("#btn_aa_mark").click(function () {
    // Get the mark value
    var value = +$("#txt_aa_mark").val();
    if (!isNaN(value)) {
      displayAminoAcid(value);
    }
  });

  // Handlers that reset view if user changes seq type / ann type
  $("#msa_seq_type").change(resetView);
  $("#msa_ann_type").change(resetView);

  // Async loading spinner
  var $loading = $('.spinner');
  $(document)
    .ajaxStart(function () {
      $loading.css("visibility", "visible");
    })
    .ajaxStop(function () {
      $loading.css("visibility", "hidden");
    });

  // Graph itself
  graph
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  d3.select(window).on('resize', debounce(resize, 100));
  resize();
}

// Change the plot size
function resize() {
  width = $("#graph-container").width() - margin.left - margin.right;

  xScale = xScale.range([0, width]);

  graph
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  $("#dataClip rect")
    .attr("width", width)
    .attr("height", height);

  updateView();

  clearBrush();
}

function brushEnded() {
  if (loaded) {
    var extent = brush.extent();

    if (extent[0] != extent[1]) {
      xScale.domain([
        Math.max(1, Math.floor(extent[0] + 0.5)) -
        0.5,
        Math.min(Math.ceil(extent[1] - 0.5), numAA) +
        0.5
      ]);
    }
    clearBrush();
    updateView();
    if (hover) {
      hover.enable();
    }
    if (highlight) {
      highlight.enable();
    }
  }
}

function clearBrush() {
  if (loaded) {
    d3.select(".brush").call(brush.clear());
  }
}

// RE-layout all the annotations
function relayout() {
  // Reset display
  generateAnnotationPanels(null);
  // Then re-fill with model
  generateAnnotationPanels(dataModel);
}

function toggleLaneHidden(lane) {
  if(isLaneHidden(lane.name)) {
    showLane(lane);
  }
  else {
    hideLane(lane);
  }
  relayout();
}

function updateView() {
  if (loaded) {
    for (var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      lane.update();
    }

    xAxis.tickValues(xScale.ticks(5).concat([
      Math.floor(xScale.domain()[0] + 0.5),
      xScale.domain()[1] -
      0.5
    ]));
    graph.select(".x.axis").call(xAxis);
  }
}

function resetZoom() {
  if (loaded) {
    xScale.domain([1, numAA]);
    updateView();
    hover.enable();
    highlight.enable();
  }
}

function resetDetails() {
  $("#txt_aa_mark").val(""); // Reset the mark
  $("#details").html(""); // Remove details view
}

// Layout of the entire graph
//
// entire - element representing the entire graph (svg element)
// data - element representing the data of the graph (group element)
// margin - margins that define the data area
// dataWidth - how wide is the data area
function GraphLayout(entire, data, margin, dataWidth) {
  this.entire = entire;
  this.data = data;
  this.margin = margin;
  this.dataWidth = dataWidth;
}

// Make svg <g> element for the data portion, add annotation
GraphLayout.prototype.addDataGroup = function (laneLayout, name, title) {
  return this.data.append("g")
    .attr("width", this.dataWidth)
    .attr("height", laneLayout.height)
    .attr("class", "noselect " + name)
    .attr("transform", "translate(0," + laneLayout.y + ")");
};

// Represents a layout of a single "lane"
//
// y - where does the lane start (top edge)
// height - how high the lane is (when hidden, the height is truncated)
// hidden - if true, the lane is collapsed
function LaneLayout(y, height, hidden) {
  this.y = y;
  this.requestedHeight = height;
  this.height = hidden ? 10 : height;
  this.hidden = hidden;
}

LaneLayout.prototype.range = function () {
  return [this.height, 0];
};

LaneLayout.prototype.reverseRange = function () {
  return [0, this.height];
};

// Main function that sets up the graphics
// If ran with model==null, resets everything
function generateAnnotationPanels(model) {
  // Load data
  loaded = model ? true : false;

  lanes = [];

  if (!loaded) {
    $("#status").html("");
    $("#notes").html("");
    $("#graph").html("");
    $("#details").html("");
  }
  else {
    // Set status
    $("#status").html("Gene Symbol Selected: " + model.geneName);

    // Set the note

    if(model.warning) {
      $("#warnings").html("<b>Warning:</b> " + model.warning).show();
    }
    else {
      $("#warnings").hide();
    }
    $("#notes").html("<b>Note:</b> " + model.note).show();

    // Wipe the visualization
    $("#graph").html("");

    graph.append("defs").append("clipPath").attr("id", "dataClip").append("rect")
      .attr("width", width)
      .attr("height", height);

    // The area for drawing the plots themselves (sans margins)
    svg = graph.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#dataClip)");

    // Create X axis --------------------------------
    graph.append("g")
      .attr("class", "x axis noselect")
      .attr("transform", "translate(" + margin.left + "," + (margin.top) + ")")
      .call(xAxis);

    // Create brush --------------------------------
    brush = d3.svg.brush()
      .x(xScale)
      .extent([1, numAA])
      .on("brushend", brushEnded);

    brushElement = svg.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.event);

    // Start creating the lanes/rows in the graph --------------------------------
    var graphLayout = new GraphLayout(graph, svg, margin, width);

    // Start creating graphs
    yPos = 0; // Where are we right now
    ySpace = 10 + 25; // Spacing between lanes

    var proteinLaneHeight = 20;
    lanes.push(new ProteinSequenceLane(graphLayout,
      model.sequence,
      model.exons,
      new LaneLayout(yPos, proteinLaneHeight)));
    yPos += proteinLaneHeight + ySpace;

    if (model.ExAC != null) {
      var layout = new LaneLayout(yPos, exacHeight, isLaneHidden("ExAC"));
      lanes.push(new ExacLane(graphLayout, model.ExAC, layout));
      yPos += layout.height + ySpace; // Bump the y coordinate that got used up
    }

    if (model.siteSpecificAnnotations != null) {
      var spaceBetweenRows = 1; // Since there is no overlap likely, the space should be 1

      // How many rows of intervals do we need to visualize this
      var layout = new LaneLayout(yPos,
        model.siteSpecificAnnotations.yDomain(spaceBetweenRows)[1] * 10,
        isLaneHidden(model.siteSpecificAnnotations.name));
      var lane = new GenericLane(
        graphLayout,
        model.siteSpecificAnnotations,
        layout,
        spaceBetweenRows,
        "color");
      lanes.push(lane);
      yPos += layout.height + ySpace;
    }

    if (model.ipsMotifs != null) {
      var spaceBetweenRows = 1;

      // How many rows of intervals do we need to visualize this
      var layout = new LaneLayout(
        yPos,
        Math.min(model.ipsMotifs.yDomain(spaceBetweenRows)[1] * 10, 100),
        isLaneHidden(model.ipsMotifs.name));
      lanes.push(new GenericLane(
        graphLayout,
        model.ipsMotifs,
        layout,
        spaceBetweenRows,
        "color"));
      yPos += layout.height + ySpace;
    }

    if (model.elmMotifs != null) {
      var spaceBetweenRows = 1;

      // How many rows of intervals do we need to visualize this
      var layout = new LaneLayout(
        yPos,
        Math.min(model.elmMotifs.yDomain(spaceBetweenRows)[1] * 3, 300),
        isLaneHidden(model.elmMotifs.name));
      lanes.push(new GenericLane(
        graphLayout,
        model.elmMotifs,
        layout,
        spaceBetweenRows,
        "none"));
      yPos += layout.height + ySpace;
    }

    if (model.pdbHomology != null) {
      var spaceBetweenRows = 1;

      // How many rows of intervals do we need to visualize this
      var layout = new LaneLayout(
        yPos,
        model.pdbHomology.yDomain(spaceBetweenRows)[1] * 10,
        isLaneHidden(model.pdbHomology.name));
      lanes.push(new GenericLane(
        graphLayout,
        model.pdbHomology,
        layout,
        spaceBetweenRows,
        "black"));
      yPos += layout.height + ySpace;
    }

    if (model.alignments != null) {
      var layout = new LaneLayout(
        yPos,
        model.alignments.MSA.length * proteinLaneHeight,
        isLaneHidden("aligned")
      );
      lanes.push(new AlignmentLane(
        graphLayout,
        model.alignments,
        model.uniProtId,
        layout
      ));
      yPos += layout.height + ySpace;
    }

    // Brush all except the alignment lane
    var lastBrushableLaneIndex = lanes.length - 1;
    if (lanes[lastBrushableLaneIndex].name === "aligned") {
      lastBrushableLaneIndex--;
    }
    var lastBrushableLane = lanes[lastBrushableLaneIndex];
    brushElement.selectAll("rect")
      .attr("height", lastBrushableLane.layout.y + lastBrushableLane.layout.height);

    // Set plot height
    height = lanes[lanes.length - 1].layout.y + lanes[lanes.length - 1].layout.height + ySpace;

    hover = new Hover(graphLayout, lanes, graph);
    highlight = new Highlight(graphLayout, lanes, graph);
    highlight.disable();

    details = new Details($("#details"), lanes);

    resize();
  }
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
};