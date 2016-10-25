// Ran code through http://jsbeautifier.org/
"use strict";
var FULLJ, PSEQ = "", gs = [];

var my_mark_underlay = function(canvas, area, g) {
    var mpos = g.toDomCoords(mark_aa_pos, 0)[0];
    canvas.fillStyle = "rgba(255, 125, 30, 1.0)";
    canvas.fillRect(mpos - 1, area.y, 3, area.h);
}

function loadPSEQ(responseText) {
    var tmp = responseText.split('\n');
    tmp.splice(0, 1);
    PSEQ = tmp.join('');
    drawPlot();
}

function loadJSON(responseText) {
    FULLJ = JSON.parse(responseText);

    document.getElementById("td_gene_symbol").innerHTML = "The above annotations for <strong>" + GENE_NAME + "</strong> use:";
    document.getElementById("td_uniprot_id").innerHTML = FULLJ['UniProt_ID'];
    document.getElementById("td_ensp_id").innerHTML = FULLJ['ENSP_ID'];
    document.getElementById("td_enst_id").innerHTML = FULLJ['ENST_ID'];

    if (FULLJ.hasOwnProperty('UniProt_ID')) {
        var url = 'http://www.uniprot.org/uniprot/' + FULLJ['UniProt_ID'] + ".fasta";
        getXMLHttpRequest(url, false, loadPSEQ);
    }
    else {
        drawPlot();
    }
}

function generateAnnotationPanels() {
    // must flush the array every time for performance reasons when changing genes
    gs = [];
    var url = "json/" + GENE_NAME + ".json";
    getXMLHttpRequest(url, true, loadJSON);
}

function drawPlot() {
    var orig_range = [1, FULLJ['numAA']];
    //console.log( orig_range );

    var N = Number(FULLJ['numAA']);
    var PDBhits = 0;
    var nPDBhist = 0;
    if (FULLJ.hasOwnProperty('PDBCount')) {
        PDBhits = FULLJ['PDBCount'];
    }
    if (FULLJ.hasOwnProperty('PDB')) {
        nPDBhist = FULLJ['PDB'].length;
    }
    document.getElementById("notes").innerHTML = "<b>Note:</b> " + GENE_NAME + " has \"" + PDBhits +
        "\" homologous hits to the PDB. We are showing the top " + nPDBhist +
        " most distinct (by protein sequence coverage) for brevity.<br>";

    var blockRedraw = false;
    for (var panel_i = 0; panel_i <= 5; panel_i++) {

        // -------------------------------------------------------------------------
        if (panel_i == 0) {

            /**/
            // MAKE ARRAY FOR EXON CANVAS
            //var divID = "divC";
            var obj = FULLJ['CCDS'];
            //var c   = document.getElementById("myCanvas");
            //var ctx = c.getContext("2d");
            //var ulx = 0; // upper left corner x
            //var uly = 0; // upper left corner y
            var ess_array = []; // Exon Start Stop array
            for (var x in obj) {
                var ex1 = Number(obj[x]['start_residue']);
                var ex2 = Number(obj[x]['stop_residue']);
                ess_array.push([ex1, ex2]);
                /*
                var pxl = Math.ceil( 740 * (( ex2 - ex1 + 1 ) / N ) );
                if (Number(x)%2 == 0){
                  ctx.fillStyle = "#751975";
                } else {
                  ctx.fillStyle = "#E0A366";
                }
                ctx.fillRect( ulx, uly, pxl, 50);
                ulx += pxl;
                */
            }

            // MAKE DYGRAPH FOR SEQUENCE
            var divID = "div" + panel_i;

            // var upid = "";

            // if (FULLJ.hasOwnProperty('UniProt_ID')) {
                // upid = FULLJ['UniProt_ID'];
                // var url = 'http://www.uniprot.org/uniprot/' + upid + ".fasta";
                // var xhr = new XMLHttpRequest();
                // xhr.open("GET", url, false);
                // xhr.send(null)
                // if (xhr.status == 200) {
                    // var tmp = xhr.responseText.split('\n');
                    // tmp.splice(0, 1);
                    // PSEQ = tmp.join('');
                    // // document.getElementById("notes").innerHTML = PSEQ; //xhr.responseText.replace(/\n/mg,"|");
                // } else alert("Error executing XMLHttpRequest call!\n" + xhr.responseText);
            // }

            var seqx = [];
            var seqann = [];
            var seqa = PSEQ.split('');
            for (var i = 0; i < seqa.length; i++) {
                seqann.push({
                    series: "Seq",
                    x: i + 1,
                    cssClass: 'annSeq',
                    tickHeight: 0, // THERE'S STILL A LITTLE DOT SHOWN...
                    shortText: seqa[i],
                    text: seqa[i] + Number(i + 1)
                });
                seqx.push([i, 1]);
            }

            var dgProteinSeq = new Dygraph(document.getElementById(divID), seqx, {
                ylabel: "Protein Sequence",
                strokeWidth: 0.0,
                drawPoints: false,
                animatedZooms: true,
                labels: ["AA", "Seq"],
                color: "black",
                underlayCallback: function(canvas, area, g) {
                    for (var ei = 0; ei < ess_array.length; ei++) {
                        var exon_start_x = g.toDomCoords(ess_array[ei][0], 0)[0];
                        var exon_stop_x = g.toDomCoords(ess_array[ei][1], 0)[0];
                        if (ei % 2 == 0) {
                            canvas.fillStyle = "rgba(117,  25, 117, 0.3)";
                        } else {
                            canvas.fillStyle = "rgba(224, 163, 102, 0.3)";
                        }
                        // upper-left-x, upper-left-y, width, height
                        canvas.fillRect(exon_start_x - 1, area.y, exon_stop_x - exon_start_x + 3, area.h);
                    }
                },
                //TODO figure out how to get synchronize to execute the zoomCallback
                //right now this only works when you zoom using the protein seq dygraph
                zoomCallback: function() {
                    var xRange = this.xAxisRange(), empty = [];

                    if (xRange[1] - xRange[0] > 60) {
                        this.setAnnotations(empty);
                    }
                    else {
                        this.setAnnotations(seqann);
                    }
                }
            });
            gs.push(dgProteinSeq);
            //gs[panel_i].setAnnotations(seqann);


            // -------------------------------------------------------------------------
        } else if (panel_i == 1) {
            var divID = "div" + panel_i;
            if (FULLJ.hasOwnProperty('ExAC')) {

                var obj = FULLJ['ExAC'];
                var arr = [];
                for (var x in obj) {
                    var rec = [obj[x]['CAVA_AA_Pos'], Number(obj[x]['AF'])];
                    arr.push(rec);
                }
                gs.push(new Dygraph(document.getElementById(divID), arr, {
                    ylabel: "ExAC AF",
                    strokeWidth: 0.0,
                    logscale: true,
                    drawPoints: true,
                    highlightCircleSize: 5,
                    animatedZooms: true,
                    labels: ["CAVA_AA_Pos", "AF"],
                    underlayCallback: my_mark_underlay
                }));

            } else {

                gs.push(new Dygraph(document.getElementById(divID),
                    "X,Y\n" +
                    "0,0\n", {
                        legend: 'always',
                        animatedZooms: true,
                        title: 'No ExAC data found...'
                    }));

            }

            // -------------------------------------------------------------------------
        } else if (panel_i == 2) {
            var divID = "div" + panel_i;
            var allx = [];
            var arr2Anno = [];

            var arrC = [];
            if (FULLJ.hasOwnProperty('ClinVar')) {
                var obj = FULLJ['ClinVar'];
                for (var x in obj) {
                    var aa = Number(obj[x]['CAVA_AA_Pos']);
                    var rec = [aa, 4];
                    allx.push(aa);
                    arrC.push(rec);
                    arr2Anno.push({
                        series: "ClinVar",
                        x: aa,
                        shortText: 'C', // short text is displayed on the plot
                        text: obj[x]['CAVA_AA_Change'] + " : " + obj[x]['Clinvar.ClinicalSignificance']
                    })
                }
            }

            var arrH = [];
            if (FULLJ.hasOwnProperty('HGMD')) {
                var obj = FULLJ['HGMD'];
                for (var x in obj) {
                    var aa = Number(obj[x]['AA_pos']); // amino acid
                    var rec = [aa, 3];
                    allx.push(aa);
                    arrH.push(rec);
                    arr2Anno.push({
                        series: "HGMD",
                        x: aa,
                        shortText: 'H',
                        text: obj[x]['PROT'] + " : " + obj[x]['PHEN']
                    })
                }
            }

            var obj = FULLJ['PTMCode2'];
            var arrPC2 = [];
            for (var x in obj) {
                var aa = Number(obj[x]['pos']);
                var rec = [aa, 2];
                allx.push(aa);
                arrPC2.push(rec);
                arr2Anno.push({
                    series: "PTMCode2",
                    x: aa,
                    shortText: 'P',
                    text: obj[x]['site'] + " : " + obj[x]['type']
                })
            }

            var obj = FULLJ['PhosphoSitePlus'];
            var arrPSP = [];
            for (var x in obj) {
                var aa = Number(obj[x]['pos']);
                var rec = [aa, 1];
                allx.push(aa);
                arrPSP.push(rec);
                arr2Anno.push({
                    series: "PhosphoSitePlus",
                    x: aa,
                    shortText: 'P',
                    text: obj[x]['mod']
                })
            }



            allx = sort_unique(allx);
            var arr2 = [];
            for (var i = 0, tot = allx.length; i < tot; i++) {
                var tmp = [allx[i], null, null, null, null];

                // ClinVar
                for (var j = 0, tot2 = arrC.length; j < tot2; j++) {
                    if (arrC[j][0] == allx[i]) {
                        tmp[1] = arrC[j][1];
                    }
                }

                // HGMD
                for (var j = 0, tot2 = arrH.length; j < tot2; j++) {
                    if (arrH[j][0] == allx[i]) {
                        tmp[2] = arrH[j][1];
                    }
                }

                // PTMCode2
                for (var j = 0, tot2 = arrPC2.length; j < tot2; j++) {
                    if (arrPC2[j][0] == allx[i]) {
                        tmp[3] = arrPC2[j][1];
                    }
                }

                // PhosphoSitePlus
                for (var j = 0, tot2 = arrPSP.length; j < tot2; j++) {
                    if (arrPSP[j][0] == allx[i]) {
                        tmp[4] = arrPSP[j][1];
                    }
                }

                arr2.push(tmp);
            }

            gs.push(new Dygraph(document.getElementById(divID), arr2, {
                ylabel: "Site-Specific Annotations",
                strokeWidth: 0.0,
                drawPoints: true,
                animatedZooms: true,
                highlightCircleSize: 5,
                labels: ["AA_Pos", "ClinVar", "HGMD", "PTMCode2", "PhosphoSitePlus"],
                dateWindow: orig_range,
                underlayCallback: my_mark_underlay
                    /*axes: {
			   y: { valueFormatter: function(y) {
					  var tmp = ["AA_Pos", "ClinVar", "HGMD", "PTMCode2", "PhosphoSitePlus" ];
					  return tmp[y];
					 }
				   }
				}*/
                    // underlayCallback & drawCallback = background annotations
                    // drawPointCallback = to make custome points = value can be a function
                    // highlightCallback & un = function that sends text to DOM or <div>
                    //                        = crosshair example - xline is a <div>
            }));
            gs[panel_i].setAnnotations(arr2Anno);


            // -------------------------------------------------------------------------
        } else if (panel_i == 3) {
            var divID = "div" + panel_i;
            var obj = FULLJ['IPS'];
            var dimj = obj.length;
            var arr4 = [];
            var ipsL = ['x'];
            var i = 0;
            for (var x in obj) {

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['start']);
                rec[i + 1] = i + 1;
                arr4.push(rec);

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['stop']);
                rec[i + 1] = i + 1;
                arr4.push(rec);

                var lab1 = obj[x]["analysis_type"] + " (" + obj[x]["signature_accession"] +
                    "): " + obj[x]["signature_description"]
                ipsL.push(lab1);
                var i = i + 1;

            }

            gs.push(new Dygraph(document.getElementById(divID), arr4, {
                xlabel: "",
                ylabel: "IPS Motifs",
                labels: ipsL,
                connectSeparatedPoints: true,
                drawPoints: true,
                dateWindow: orig_range,

                stackedGraph: false,
                highlightCircleSize: 2,
                strokeWidth: 1,
                strokeBorderWidth: 1,
                highlightSeriesOpts: {
                    strokeWidth: 3,
                    strokeBorderWidth: 1,
                    highlightCircleSize: 5
                },
                underlayCallback: my_mark_underlay
            }));

            gs[panel_i].updateOptions({
                pointClickCallback: function(event, p) {
                    var id = p.name.replace(/(\w+) \(/i, "");
                    id = id.replace(/\).+/i, "");
                    var url = 'https://www.google.com/search?q=' + id;
                    window.open(url, '_blank');
                }
            });

            // -------------------------------------------------------------------------
        } else if (panel_i == 4) {

            var divID = "div" + panel_i;
            var obj = FULLJ['ELM'];
            var dimj = obj.length;
            var arrELM = [];
            var annELM = []; // long label (description)
            var ipsELM = ['x']; // series label (column name for arrELM)
            var seriesColor = [];

            for (var x in obj) {

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['start']);
                rec[i + 1] = i + 1;
                arrELM.push(rec);

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['stop']);
                rec[i + 1] = i + 1;
                arrELM.push(rec);

                //ipsELM.push( obj[x]["elm_identifier"] + " = " + obj[x]["description"] ); // series label
                ipsELM.push(obj[x]["elm_identifier"]); // series label
                //ipsELM.push( obj[x]["description"] ); // series label
                //annELM.push( obj[x]["description"] ); // series description
                var i = i + 1;

            }

            /**/
            gs.push(new Dygraph(document.getElementById(divID), arrELM, {
                xlabel: "Residue Number",
                ylabel: "ELM Motifs",
                labels: ipsELM,
                animatedZooms: true,

                connectSeparatedPoints: true,
                drawPoints: true,
                dateWindow: orig_range,

                stackedGraph: false,
                highlightCircleSize: 2,
                strokeWidth: 1,
                strokeBorderWidth: 1,
                highlightSeriesOpts: {
                    strokeWidth: 3,
                    strokeBorderWidth: 1,
                    highlightCircleSize: 5
                },
                underlayCallback: my_mark_underlay
            }));
            //gs[ panel_i ].setAnnotations(annELM);
            /**/
            gs[panel_i].updateOptions({
                pointClickCallback: function(event, p) {
                    var url = "http://elm.eu.org/elms/" + p.name
                    window.open(url, '_blank');
                }
            });



            // -------------------------------------------------------------------------
        } else if (panel_i == 5) {

            var divID = "div" + panel_i;
            var obj = FULLJ['PDB'];
            var dimj = obj.length;
            var arrPDB = [];
            var annPDB = [];
            var ipsL = ['x']; // series label (column name for arrPDB)
            var seriesColor = [];
            var i = 0;
            for (var x in obj) {

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['QueryStart']);
                rec[i + 1] = i + 1;
                arrPDB.push(rec);

                var rec = createArray(dimj + 1, null);
                rec[0] = Number(obj[x]['QueryEnd']);
                rec[i + 1] = i + 1;
                arrPDB.push(rec);

                //ipsL.push( obj[x]["PDB"].substring(0, 4) ); // series label
                ipsL.push("hit " + i + " for " + obj[x]["PDB"]); // series label
                var lab1 = "#CC0000"; // red // http://www.w3schools.com/tags/ref_colorpicker.asp
                if ((Number(obj[x]["Identity"]) >= 70) || (Number(obj[x]["Positive"]) >= 75)) {
                    lab1 = "#009900"; // dark green
                } else if ((Number(obj[x]["Identity"]) >= 40) || (Number(obj[x]["Positive"]) >= 60)) {
                    lab1 = "#FFD700"; // gold
                }
                seriesColor.push(lab1); // series color
                var i = i + 1;

            }

            gs.push(new Dygraph(document.getElementById(divID), arrPDB, {
                xlabel: "Residue Number",
                ylabel: "PDB Homology",
                labels: ipsL,
                colors: seriesColor,
                connectSeparatedPoints: true,
                drawPoints: true,
                dateWindow: orig_range,

                stackedGraph: false,
                highlightCircleSize: 2,
                strokeWidth: 1,
                strokeBorderWidth: 1,
                highlightSeriesOpts: {
                    strokeWidth: 3,
                    strokeBorderWidth: 1,
                    highlightCircleSize: 5
                },
                underlayCallback: my_mark_underlay
            }));
            gs[panel_i].setAnnotations(annPDB);

            // ## THIS WOULD BE REALLY NICE TO HAVE ##
            // ## BUT HOW TO LINK IT TO SYNCHRONIZER? ##
            //showRangeSelector: true,
            //rangeSelectorHeight: 30,
            //rangeSelectorPlotStrokeColor: 'yellow',
            //rangeSelectorPlotFillColor: 'lightyellow'

            gs[panel_i].updateOptions({
                pointClickCallback: function(event, p) {
                    var id = p.name.replace(/hit (\d+) for /i, "");
                    id = id.replace(/_(\w+)$/i, "");
                    var url = "http://www.rcsb.org/pdb/explore/explore.do?structureId=" + id;
                    window.open(url, '_blank');
                    //document.getElementById("notes").innerHTML = id;
                }
            });


            // -------------------------------------------------------------------------
        }

        // -------------------------------------------------------------------------
    }

    var sync = Dygraph.synchronize(gs);

    function update() {
        var zoom = document.getElementById('chk-zoom').checked,
            selection = document.getElementById('chk-selection').checked;
        sync.detach();
        sync = Dygraph.synchronize(gs, {
            zoom: zoom,
            selection: selection,
            range: false
        });
    }


}
