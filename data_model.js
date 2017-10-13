// Functions defining the model

// Turn the loaded data into a clean format
function DataModel(model) {

  this.geneName = getGeneName(model);
  this.numAminoAcids = getNumAminoAcids(model);
  this.sequence = model.hasOwnProperty("sequence") ? model.sequence : null;
  this.uniProtId = getUniProtId(model);

  this.exons = getExonAnnotations(model);

  this.ExAC = getExACData(model);

  this.siteSpecificAnnotations = getSiteSpecificAnnotations(model);
  this.ipsMotifs = getIpsMotifs(model);
  this.elmMotifs = getElmMotifs(model);
  this.pdbHomology = getPdbHomology(model);
  this.alignments = getAlignments(model);

  this.warning = getWarning(model);
  this.note = getNote(model);
}

function getGeneName(model) {
  return model.Gene_Symbol;
}

function getWarning(model) {
  if (!model.alignments) {
    var geneName = getGeneName(model);
    return "No paralogs for " + geneName + " found. "
           + "See <a href='http://www.ensembl.org/Multi/Search/Results?q=" + geneName
           + "'>Ensembl</a> for more information.";
  }
}

// Note to be displayed below the plots
function getNote(model) {
  // Set the note
  var PDBhits = 0;
  var nPDBhist = 0;
  if (model.hasOwnProperty('PDBCount')) {
    PDBhits = model['PDBCount'];
  }
  if (model.hasOwnProperty('PDB')) {
    nPDBhist = model['PDB'].length;
  }

  return getGeneName(model) +
         " has \"" +
         PDBhits +
         "\" homologous hits to the PDB. We are showing the top " +
         nPDBhist +
         " most distinct (by protein sequence coverage) for brevity.<br>" +
         "Annotations shown are anchored to UniProt sequence <a href='http://www.uniprot.org/uniprot/" +
         model['UniProt_ID'] +
         "'>" +
         model['UniProt_ID'] +
         "</a>" +
         " which mapped to <a href='http://www.ensembl.org/id/" +
         model['ENSP_ID'] +
         "'>" +
         model['ENSP_ID'] +
         "</a>" +
         " which is translated from <a href='http://www.ensembl.org/id/" +
         model['ENST_ID'] +
         "'>" +
         model['ENST_ID'] +
         "</a>.";
}

function getNumAminoAcids(model) {
  return +model.numAA;
}

function getUniProtId(model) {
  return model.UniProt_ID;
}

// Return ExAC data as an object:
// - data: array of [x,y] tuples,
// - yRange: array of [min, max] y value
function getExACData(model) {
  
  if (model.hasOwnProperty('ExAC')) {
    var obj = model['ExAC'];
    var data = [];
    for (var i = 0; i < obj.length; i++) {
      var yVal = +obj[i]['AF'];
      if (isNaN(yVal)) {
        continue;
      }

      var rec = [+obj[i]['CAVA_AA_Pos'], yVal];
      data.push(rec);
    }

    // We have array of amino acid - AF pairs
    var maxAF = data.reduce(function (value, item) {
      return Math.max(value, item[1]);
    }, 0);
    var minAF = data.reduce(function (value, item) {
      return Math.min(value, item[1]);
    }, maxAF);
    return { data: data, yRange: [minAF, maxAF] };
  }
  else {
    return null;
  }
  
}

// Return an array of exons with start, stop parameters
// Start and stop are inclusive, 1-based
function getExonAnnotations(model) {
  // Extract raw data
  if (model.hasOwnProperty("CCDS")) {
    var obj = model.CCDS;
    var ess_array = []; // Exon Start Stop array
    for (var x in obj) {
      if (obj.hasOwnProperty(x)) {
        var ex1 = +(obj[x]['start_residue']);
        var ex2 = +(obj[x]['stop_residue']);
        ess_array.push([ex1, ex2]);
      }
    }

    // Sort data
    ess_array.sort(function compare(a, b) {
      return a[0] - b[0];
    });

    // Format the resulting array
    var result = [];
    for (i = 0; i < ess_array.length; i++) {
      result.push({ start: ess_array[i][0] + 1, stop: ess_array[i][1] + 1, odd: (i % 2 == 0) });
    }
    return (result);
  }
  else {
    return [{ start: 1, stop: getNumAminoAcids(model), odd: true }];
  }
}

// Interval from-to amino acid
// overlap = the Y coordinate to put the interval on to prevent overlaps (integer, starting at 0)
// group = a list of sub-intervals in case this is an interval group. The groups
// are displayed in a way indicating that there are more elements
function Interval(start, stop, text, overlap, color, url, group) {
  this.start = start;
  this.stop = stop;
  this.text = text;
  this.overlap = overlap;
  this.color = typeof color !== 'undefined' ? color : null; // Color is optional
  this.url = typeof url !== 'undefined' ? url : null; // URL is optional
  this.group = typeof group !== 'undefined' ? group : null; // Group is optional
}

// A row of intervals
function Row(name, intervals, color) {
  this.name = name;
  this.intervals = intervals;
  this.maximumOverlap = layoutIntervals(intervals);
  this.color = color;
}

// Go over all intervals and create "group" intervals based on equivalence between input intervals.
// Two intervals are considered equivalent if their start,stop matches + a comparator function
// returns true on them
function groupIntervals(intervals, comparator) {
  var numIntervals = intervals.length;
  var order = new Array(numIntervals);
  for (var i = 0; i < numIntervals; i++) {
    order[i] = i;
  }
  order = order.sort(function (a, b) {
    return intervals[a].start - intervals[b].start ||
           intervals[a].end - intervals[b].end;
  });

  // Now order is order in which to process intervals so their start/end coordinates increase
  // Use this sorting for detecting duplicities
  var matching = [];
  var result = new Array(numIntervals);
  var numResult = 0;
  for (var j = 0; j < numIntervals;) {
    var index = order[j];
    var interval1 = intervals[index];
    matching[0] = interval1; // Put it into a group with itself
    var toGroup = [];
    toGroup[0] = interval1;
    for (var k = j + 1; k < numIntervals; k++) {
      var interval2 = intervals[order[k]];
      if (
        interval1.start !== interval2.start ||
        interval1.end !== interval2.end) {
        break;
      }
      toGroup.push(interval2);
    }
    var matches = new Array(toGroup.length);
    while(toGroup.length > 0) {
      var first = toGroup[0];
      matches[0] = true; // Ourselves
      var numMatches = 1;
      for(var ii=1; ii<toGroup.length; ii++)
      {
        var isMatch = comparator(toGroup[ii], first);
        matches[ii] = isMatch;
        if (isMatch) {
          numMatches++;
        }
      }
      if (numMatches > 1) {
        result[numResult] = new Interval(
          first.start,
          first.stop,
          first.text + " (" + numMatches + ")",
          first.overlap,
          first.color,
          first.url,
          // All grouped go in
          toGroup.filter(function(element, i) { return matches[i] }));
      }
      else {
        result[numResult] = first;
      }
      numResult++;
      // Filter the grouped out
      toGroup = toGroup.filter(function(element, i) { return !matches[i]});
    }
    j = k; // Skip to the first ungrouped
  }
  return result.slice(0, numResult);
}

// Fill in the 'overlap' filed for the row intervals, return maximum overlap
function layoutIntervals(intervals) {
  var startStops = [];
  for (var i = 0; i < intervals.length; i++) {
    var interval = intervals[i];
    startStops.push({ pos: interval.start * 2, start: true, i: i });
    startStops.push({ pos: interval.stop * 2 + 1, start: false, i: i }); // Stops behave as if they ended just after start
  }

  startStops.sort(function cmp(a, b) {
    if (a.pos != b.pos) {
      return a.pos - b.pos;
    }
    return a.start == false ? -1 : 1; // Ends go first
  });

  var currentOverlap = -1;
  var maximumOverlap = 0;
  for (var i = 0; i < startStops.length; i++) {
    var startStop = startStops[i];
    if (startStop.start) {
      currentOverlap++;
      intervals[startStop.i].overlap = currentOverlap; // Set the overlap position on the interval
      if (currentOverlap > maximumOverlap) {
        maximumOverlap = currentOverlap;
      }
    }
    else {
      currentOverlap--;
    }
  }
  return maximumOverlap;
}

// Group of rows. Color is optional.
function RowGroup(name, title, rows) {
  this.name = name;
  this.title = title;
  this.rows = rows;
  this.color = null;
}

// Calculate Y coordinate span that would the row group take assuming each row has height 1*maxOverlap
RowGroup.prototype.yDomain = function (spaceBetweenRows) {
  var maxY = 0;
  for (var i = 0; i < this.rows.length; i++) {
    if (i != 0) {
      maxY += spaceBetweenRows;
    }
    maxY += this.rows[i].maximumOverlap;
  }
  return [0, maxY];
};

RowGroup.prototype.addRow = function (row) {
  this.rows.push(row);
};

function getSiteSpecificAnnotations(model) {
  result = new RowGroup("siteSpecific", 'SNVs & PTMs', []);

  // Colors for all the annotations in one place
  colors = {
    "ClinVar_Patho": '#CB333A', // medium red
    "ClinVar_Other": '#332288', // dark blue
    "ClinVar_Benign": '#117733', // dark green
    "HGMD": '#87222A', // dark red
    "PTMCode2": '#999933',
    "PhosphoSitePlus": '#ddcc77',
    "DoCM": '#cc6677',
    "MutD": '#aa4499',
    "UniProt": "#71b8d3",
    "UniProt_sites": "#1c5fcc",
    "UniProt_variants": "#71b8d3"
  };

  function groupSameText(a, b) {
    return a.text === b.text;
  }

  function addSeries(name, getData, grouping) {
    if (model.hasOwnProperty(name)) {
      var intervals = model[name].map(getData);
      var color = colors[name];
      var groupedIntervals = groupIntervals(intervals, grouping);
      var row = new Row(name, groupedIntervals, color);
      result.addRow(row);
    }
  }

  addSeries("ClinVar_Patho", function (obj) {
    if (obj['CAVA_AA_Change'].match(/X$/)) {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" + getGeneName(model) + "[gene] ";
    }
    else {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" + getGeneName(model) + "[gene] " +
                "p." + obj['CAVA_AA_Change'];
    }
    return new Interval(+obj['CAVA_AA_Pos'],
      +obj['CAVA_AA_Pos'] + obj['aa.len'] - 1,
      obj['CAVA_AA_Change'] + " : " + obj['ClinVar.all_traits'], //+ obj['ClinVar.clinical_significance']
      undefined,
      undefined,
      url);
  }, groupSameText);

  addSeries("ClinVar_Other", function (obj) {
    if (obj['CAVA_AA_Change'].match(/X$/)) {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" + getGeneName(model) + "[gene] ";
    }
    else {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" +
                getGeneName(model) +
                "[gene] " +
                "p." +
                obj['CAVA_AA_Change'];
    }
    return new Interval(+obj['CAVA_AA_Pos'],
      +obj['CAVA_AA_Pos'] + obj['aa.len'] - 1,
      obj['CAVA_AA_Change'] + " : " + obj['ClinVar.all_traits'], //+ obj['ClinVar.clinical_significance']
      undefined,
      undefined,
      url);
  }, groupSameText);

  addSeries("ClinVar_Benign", function (obj) {
    if (obj['CAVA_AA_Change'].match(/X$/)) {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" + getGeneName(model) + "[gene] ";
    }
    else {
      var url = "http://www.ncbi.nlm.nih.gov/clinvar/?term=" + getGeneName(model) + "[gene] " +
                "p." + obj['CAVA_AA_Change'];
    }
    return new Interval(+obj['CAVA_AA_Pos'],
      +obj['CAVA_AA_Pos'] + obj['aa.len'] - 1,
      obj['CAVA_AA_Change'] + " : " + obj['ClinVar.all_traits'], //+ obj['ClinVar.clinical_significance']
      undefined,
      undefined,
      url);
  }, groupSameText);

  addSeries("HGMD", function (obj) {
    var url = "http://www.hgmd.cf.ac.uk/ac/gene.php?gene=" + getGeneName(model);
    return new Interval(+obj['AA_pos'],
      +obj['AA_pos'],
      obj['PROT'] + " : " + obj['PHEN'],
      undefined,
      undefined,
      url);
  }, groupSameText);
  
  addSeries("UniProt_sites", function (obj) {
    var url = "http://www.uniprot.org/uniprot/" + getUniProtId(model);
    return new Interval(+obj['start'],
      +obj['stop'],
      obj["category"] + " : " + obj["description"],
      undefined,
      undefined,
      url);
  }, groupSameText);
  
  addSeries("UniProt_variants", function (obj) {
    var url = "http://www.uniprot.org/uniprot/" + getUniProtId(model);
    return new Interval(+obj['start'],
      +obj['stop'],
      //obj["ref"] + obj["start"] + obj["alt"], // <<-- want to smartly add description & disease here...
      [obj["ref"] + obj["start"] + obj["alt"], obj["disease"], obj["description"]].filter(function (val) {return val;}).join(': '),
      undefined,
      undefined,
      url);
  }, groupSameText);

  addSeries("PTMCode2", function (obj) {
    var url = "http://ptmcode.embl.de/search.cgi?species=9606&protein=" + getGeneName(model);
    return new Interval(+obj['pos'],
      +obj['pos'],
      obj['site'] + " : " + obj['type'],
      undefined,
      undefined,
      url);
  }, groupSameText);

  addSeries("PhosphoSitePlus", function (obj) {
    var url = "http://www.phosphosite.org/simpleSearchSubmitAction.action?searchStr=" +
              getGeneName(model);
    return new Interval(+obj['pos'], +obj['pos'], obj['mod'], undefined, undefined, url);
  }, groupSameText);

  addSeries("DoCM", function (obj) {
    var url = "http://www.ncbi.nlm.nih.gov/pubmed/" + obj['pmid'];
    return new Interval(+obj['pos'], +obj['pos'], obj['disease'], undefined, undefined, url);
  }, groupSameText);

  addSeries("MutD", function (obj) {
    var url = "http://www.ncbi.nlm.nih.gov/pubmed/" + obj['pmid'];
    return new Interval(+obj['pos'], +obj['pos'], obj['disease'], undefined, undefined, url);
  }, groupSameText);

  return result;
}

Array.prototype.getUnique = function () {
  var u = {}, a = [];
  for (var i = 0, l = this.length; i < l; ++i) {
    if (u.hasOwnProperty(this[i])) {
      continue;
    }
    a.push(this[i]);
    u[this[i]] = 1;
  }
  return a;
};

function getIpsMotifs(model) {
  var result = null;
  if (model.hasOwnProperty("IPS")) {
    var data = model.IPS;
    result = new RowGroup("ipsMotifs", "Domains & Motifs", []);

    colors = {
      "Gene3D": "#332288",
      "Coils": "#999999",
      "Pfam": "#88ccee",
      "PRINTS": "#117733",
      "ProSitePatterns": "#ddcc77",
      "ProSiteProfiles": "#cc6677",
      "SUPERFAMILY": "#aa4499",
      "SMART": "#404040",
      "UniProt": "#71b8d3"
    };

    var uniqueTypes = data.map(function (obj) {
      return obj.analysis_type;
    }).getUnique().sort();

    var entryToInterval = function (entry) {
      var url = "https://www.google.com/search?q=" + entry.signature_accession; // default url = Google Search
      if (entry.analysis_type == 'Gene3D') {
        url = "http://www.cathdb.info/version/latest/superfamily/" +
              entry.signature_accession.replace('G3DSA:', '')
      }
      else if (entry.analysis_type == 'Pfam') {
        url = "http://pfam.xfam.org/family/" + entry.signature_accession
      }
      else if (entry.analysis_type == 'PRINTS') {
        url = "http://www.bioinf.manchester.ac.uk/cgi-bin/dbbrowser/sprint/searchprintss.cgi?prints_accn=" +
              entry.signature_accession
      }
      else if (entry.analysis_type == 'ProSitePatterns') {
        url = "http://prosite.expasy.org/" + entry.signature_accession
      }
      else if (entry.analysis_type == 'ProSiteProfiles') {
        url = "http://prosite.expasy.org/" + entry.signature_accession
      }
      else if (entry.analysis_type == 'SUPERFAMILY') {
        url = "http://supfam.cs.bris.ac.uk/SUPERFAMILY/cgi-bin/scop.cgi?ipid=" + entry.signature_accession
      }
      else if (entry.analysis_type == 'UniProt') {
        url = "http://www.uniprot.org/uniprot/" + entry.signature_accession
      }

      return new Interval(+entry.start, +entry.stop,
        entry.analysis_type +
        " (" +
        entry.signature_accession +
        "): " +
        entry.signature_description,
        undefined, undefined, url);
    };

    for (var i = 0; i < uniqueTypes.length; i++) {
      var uniqueType = uniqueTypes[i];

      var subsetForType = data.filter(function (obj) {
        return obj.analysis_type == uniqueType;
      });

      var row = new Row(uniqueType, subsetForType.map(entryToInterval), colors[uniqueType]);
      result.addRow(row);
    }
  }
  return result;
}

function getElmMotifs(model) {
  var result = null;
  if (model.hasOwnProperty("ELM")) {
    var data = model.ELM;
    result = new RowGroup("elmMotifs", "Simple Motifs", []);

    var uniqueTypes = data.map(function (obj) {
      return obj.elm_identifier;
    }).getUnique().sort();

    var entryToInterval = function (entry) {
      var url = "http://elm.eu.org/elms/" + entry.elm_identifier
      return new Interval(+entry.start,
        +entry.stop,
        entry.elm_identifier,
        undefined,
        entry.Probability_color,
        url);
    };

    for (var i = 0; i < uniqueTypes.length; i++) {
      var uniqueType = uniqueTypes[i];

      var subsetForType = data.filter(function (obj) {
        return obj.elm_identifier == uniqueType;
      });

      var row = new Row(uniqueType, subsetForType.map(entryToInterval));
      result.addRow(row);
    }
  }
  return result;
}

function getPdbHomology(model) {
  var result = null;
  if (model.hasOwnProperty("PDB")) {
    var data = model.PDB;
    result = new RowGroup("pdbHomology", "3D Structures", []);

    var uniqueTypes = data.map(function (obj) {
      return obj.PDB;
    }).getUnique().sort();

    var entryToInterval = function (entry) {
      //var color = "#CC0000"; // red
      //if ((+entry.Identity >= 70) || (+entry.Positive >= 75)) {
      //  color = "#009900"; // dark green
      //}
      //else if ((+entry.Identity >= 40) || (+entry.Positive >= 60)) {
      //  color = "#FFD700"; // gold
      //}

      var id = entry.PDB.replace(/_(\w+)$/i, "");
      var url = "http://www.rcsb.org/pdb/explore/explore.do?structureId=" + id;

      return new Interval(+entry.QueryStart, +entry.QueryEnd,
                          entry.PDB + ": " + entry.Identity + "% identity",
                          0, entry.col, url);
    };

    for (var i = 0; i < uniqueTypes.length; i++) {
      var uniqueType = uniqueTypes[i];

      var subsetForType = data.filter(function (obj) {
        return obj.PDB == uniqueType;
      });

      var row = new Row(uniqueType, subsetForType.map(entryToInterval));
      result.addRow(row);
    }
  }
  return result;
}

function getAlignments(model) {
  var result = null;

  if (model.hasOwnProperty("alignments")) {
    result = {};
    result.MSA = model.alignments.MSA;  // Take as-is

    result.seqIdToIndex = {};
    result.annotations = [];
    result.sequenceLength = result.MSA[0].Seq.length;

    for (var seq = 0; seq < result.MSA.length; seq++) {
      // Store the sequence Id to index lookup
      result.seqIdToIndex[result.MSA[seq].ID] = seq;

      // Add array of highlights for each position
      result.annotations.push(new Array(result.sequenceLength + 1));
    }

    for (var i = 0; i < model.alignments.Annotation.length; i++) {
      var annotation = model.alignments.Annotation[i];
      var seqIndex = result.seqIdToIndex[annotation.ID];
      for (var j = annotation.MSA_start; j <= annotation.MSA_stop; j++) {
        result.annotations[seqIndex][j] = annotation;
      }
    }
  }

  return result;
}