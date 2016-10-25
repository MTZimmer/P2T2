// A highlighter object to let user read out information for particular AA
function Highlighter(graphLayout, lanes, graph) {
    var me = this;
    this.graphLayout = graphLayout;
    this.lanes = lanes;
    this.graph = graph;
    this.lastMouseY = 0;

    $("#highlighterBar").remove();

    // How to display the highlighted AA
    this.highlightBar = graphLayout.entire.append("g")
        .attr("id", "highlighterBar")
        .attr("transform", "translate(0,0) scale(1, 1)")
        .attr("height", height)
        .attr("width", 1)
        .attr("class", "highlight-bar");

    for (var i = 0; i < lanes.length; i++) {
        var lane = lanes[i];
        if (lane.customHighlight) {
            // We do not want a highligher for custom sequences (we already do that work)
            continue;
        }

        this.highlightBar.append("rect")
            .attr("x", 0)
            .attr("y", lane.layout.y)
            .attr("width", 1)
            .attr("height", lane.layout.height);
    }

    var lastBrushableLaneIndex = lanes.length - 1;
    if (lanes[lastBrushableLaneIndex].name === "aligned") {
        lastBrushableLaneIndex--;
    }
    var lastBrushableLane = lanes[lastBrushableLaneIndex];

    // A rectangle capturing highlighting events
    this.eventRect = graph.append("rect")
        .attr("class", "overlay")
        .attr("width", width + graphLayout.margin.left + graphLayout.margin.right)
        .attr("height", lastBrushableLane.layout.y + lastBrushableLane.layout.height + graphLayout.margin.top)
        .on("mousedown", function () {
            // First check whether we are over something clickable
            for (var i = 0; i < lanes.length; i++) {
                var lane = lanes[i];
                if (lane.click) {
                    // This will handle the click event properly and return true to terminate
                    if (lane.click(me.highlightedAA, me.lastMouseY)) {
                        return;
                    }
                }
            }

            // This is very tricky. Since the brush is under the "eventRect" layer that gathers mouse
            // events, we need to first disable the highlight bar, THEN fake a mousedown event
            // and pass it over to the brush to process.

            // The brush is instructed to call .enable() again on brushend.
            // This way these two kinds of interaction alternate between each other
            me.disable();
            var brush_elm = graph.select(".brush").node();
            var new_click_event = new Event('mousedown');
            new_click_event.pageX = d3.event.pageX;
            new_click_event.clientX = d3.event.clientX;
            new_click_event.pageY = d3.event.pageY;
            new_click_event.clientY = d3.event.clientY;
            brush_elm.dispatchEvent(new_click_event);
        })
        .on("mouseover", function () {
            me.show();
        })
        .on("mouseout", function () {
            me.hide();
        })
        .on("mousemove", function () {
            var x = d3.mouse(this)[0] - margin.left;
            var y = d3.mouse(this)[1] - margin.top;
            me.highlight(x, y);
        });

    this.highlighting = false;
    this.highlightedAA = -1;
}

// Set the highlighter to highlight a given amino acid
Highlighter.prototype = {
    highlight: function (mouseX, mouseY) {
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
        var aminoAcid = Math.round(xScale.invert(mouseX));
        if (aminoAcid >= xScale.domain()[0] && aminoAcid <= xScale.domain()[1]) {
            this.show();

            this.highlightedAA = aminoAcid;
            var x = xScale(aminoAcid - 0.5) + this.graphLayout.margin.left;
            var y = this.graphLayout.margin.top;
            var width = xScale(2) - xScale(1);
            this.highlightBar.attr("transform", "translate(" + x + "," + y + ") scale(" + width + "," + "1)");

            for (var i = 0; i < lanes.length; i++) {
                var lane = lanes[i];
                if (lane.highlight) {
                    lane.highlight(aminoAcid, mouseY);
                }
            }
        } else {
            this.hide();
        }
        this.lastMouseY = mouseY;
    },
    show: function () {
        if (!this.highlighting) {
            this.highlighting = true;
            this.highlightBar.attr('display', null);
            for (var i = 0; i < lanes.length; i++) {
                var lane = lanes[i];
                if (lane.highlight) {
                    lane.highlight(this.highlightedAA, this.lastMouseY);
                }
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
        this.eventRect.attr('display', 'none');
        this.highlightedAA = -1;
    },
    enable: function () {
        this.eventRect.attr('display', 'null');
        this.highlight(this.lastMouseX, this.lastMouseY);
    }
};
