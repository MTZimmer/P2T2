// Functions for accessing the data

// Find a given gene name, returns a promise containing the cleaned up version of the name
function searchGeneAsync(searchTerm) {
    var promise = Promise.resolve($.getJSON("http://rest.genenames.org/search/" + searchTerm + "*"));
    return promise.then(function (data) {
        try {
            return data;
        } catch (error) {
            var message = "Gene " + searchTerm + " not found";
            alert(message);
            throw Error(message);
        }
    });
}

var processGeneResults = function(data) {
    // Wipe the previous results
    $("#tbl_results").html("");

    var symbol_result, li_result, a_result, i;

    if (data.response.docs.length > 0) {
        $("#result_header").html("Please select an approved gene symbol:");

        for (i = 0; !!(symbol_result = data.response.docs[i]); i = i + 1) {
            // only show up to the first 10 results
            if (i === 10) { break; }

            a_result = document.createElement("A");
            a_result.href = "#";
            a_result.innerHTML = symbol_result.symbol;
            a_result.geneName = symbol_result.symbol;
            a_result.onclick = function() {
                // hide dropdown
                $(this).parent().parent().hide();

                loadGeneAsync(this.geneName)
                    .then(function (geneData) {
                        generateAnnotationPanels(new DataModel(geneData));
                        resetZoom();
                    });
                return false;
            };

            li_result = document.createElement("LI");
            li_result.appendChild(a_result);

            document.getElementById("tbl_results").appendChild(li_result);
        }

        $("#tbl_results").show();
    }
    else {
        a_result = document.createElement("A");
        a_result.href = "#";
        a_result.innerHTML = "<strong>None found, please try again.</strong>";
        a_result.onclick = function() {
            // hide dropdown
            $(this).parent().parent().hide();
        };

        li_result = document.createElement("LI");
        li_result.appendChild(a_result);

        document.getElementById("tbl_results").appendChild(li_result);
        $("#tbl_results").show();
    }
}

// Returns a promise containing the JSON information about a given gene
// enriched by the FASTA sequence (if available)
function loadGeneAsync(geneName) {
  
    var promise = Promise.resolve(
        $.getJSON("json/" + geneName + ".json")
        .error(function() { 
          
          // Wipe the previous gene view
          // HOW? THIS FUNCTION WOULD NEED the main graph/data model to be passed to it...
          
          // Update the user
          var message = "JSON file for " + geneName + " not found!";
          alert(message);
          throw Error(message);
          
        })
    );
    
    
    var withDoCM = promise.then(function (data) {
		data.DoCM = [];
		
		var url = "http://docm.genome.wustl.edu/api/v1/variants.json?genes=" + geneName + "&version=3.2";
		return Promise.resolve($.getJSON( url ))
        .then(function (docm) {
        	  
			  var d, i;
			  for (i = 0; i < docm.length; i++) {
  				d = docm[i];
  				var re1 = /^(p.)/;
  				var re2 = /([A-Z]+)(\d+)([A-Z]+)/;
  				var mut = d.amino_acid.replace(re1, '');
  				var new_data = { mut: mut,
  				                 ref: mut.replace(re2, '$1'),
  					               pos: mut.replace(re2, '$2'),
  								         alt: mut.replace(re2, '$3'),
  								     disease: mut + ' in: ' + d.diseases.join([separator = ', ']),
  								        pmid: d.pubmed_sources.join([separator = ','])
  				  
  				};
  				data.DoCM.push(new_data);
			  }
			  
			  //console.log(data.DoCM);
			  return data;
      })
      .catch(function(err) {
        console.log("No DoCM data available!");
        return data;
      });
		  
    });
    
    var withMutD = promise.then(function (data) {
		data.MutD = [];
		var url = 'http://54.146.11.205:8487/MutD/finder/'+ geneName;
		var request = new XMLHttpRequest();
		request.open("GET", url, false);
		request.send();
		var xml = request.responseXML;
		var annots = xml.getElementsByTagName("Annotation");
		for(var i = 0; i < annots.length; i++) {
			
			var ann = annots[i];
			var names = ann.getElementsByTagName("MutationNorm"); //p|SUB|G|128|E
			var dises = ann.getElementsByTagName("DiseaseName"); //ATS|arterial tortuosity syndrome
			var pmids = ann.getElementsByTagName("PubMedID"); //19028722
			for(var j = 0; j < names.length; j++) {
				var mutNormData = names[j].childNodes[0].nodeValue.split("|"); 
				var mutDisease  = dises[j].childNodes[0].nodeValue;
				var mutPMID     = pmids[j].childNodes[0].nodeValue;
				var annString   = mutNormData[3] + mutNormData[2] + '>' + mutNormData[4] + " in " + mutDisease + " from PMID" + mutPMID;
				//console.log(annString);
				var new_data = { pos: mutNormData[3],
								 ref: mutNormData[2],
								 alt: mutNormData[4],
								 disease: mutDisease,
								 pmid: mutPMID
				};
				data.MutD.push(new_data);
			}
			
		}
		//console.log(data.MutD);
		//console.log(data.MutD.length);
		//console.log(k);
		return data;
    });
	
    
    var withFasta = promise.then(function (data) {
        if (data.hasOwnProperty('UniProt_ID')) {
            var url = 'http://www.uniprot.org/uniprot/' + data['UniProt_ID'] + ".fasta";
            return Promise.resolve($.ajax(url))
                .then(function (fasta) {
                    var tmp = fasta.split('\n');
                    tmp.splice(0, 1);
                    sequence = tmp.join('');
                    data.sequence = sequence;
                    return data;
                });
        } else {
            return data;
        }
    });
	
    var withAlignments = withFasta.then(function (data) {
      
      // Handle options for which MSA file to show data from
      var MSA_SEQ = msa_seq_type.value;
      var MSA_ANN = msa_ann_type.value;
      var msa_file = '';
      if (        (MSA_SEQ == "Paralogs")  && (MSA_ANN == "Sites") ){
        msa_file = "json/" + geneName + ".Patho.canonical.json";
      } else if ( (MSA_SEQ == "Paralogs")  && (MSA_ANN == "Regions") ){
        msa_file = '';
      } else if ( (MSA_SEQ == "Orthologs") && (MSA_ANN == "Sites") ){
        msa_file = 'json/' + geneName + ".Patho.ortholog_v1.json";
      } else if ( (MSA_SEQ == "Orthologs") && (MSA_ANN == "Regions") ){
        msa_file = '';
      }
      
      if (msa_file === ''){
        alert( "The combination of MSA annotations for: '" + MSA_SEQ +
               "' and '" + MSA_ANN + "' is not yet implemented" );
      }
      
      // Update data model with the alignment data
      return Promise.resolve($.getJSON( msa_file ))
          .then(function (alignments) {
              data.alignments = alignments;
              return data;
          })
          .catch(function(err) {
              console.log("No alignment data available!");
              //alert('No MSA available for this gene and "' + MSA_SEQ + '"');
              return data;
          });
    });
    return withAlignments;
}