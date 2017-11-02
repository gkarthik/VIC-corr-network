var category = {
  "Base": "Epitope_Class",
  "Fusion": "Epitope_Class",
  "Cap": "Epitope_Class",
  "GPcl": "Epitope_Class",
  "GPcl_sGP": "Epitope_Class",
  "HR2": "Epitope_Class",
  "Mucin": "Epitope_Class",
  "sGP": "Epitope_Class",
  "sGP_wGPcl": "Epitope_Class",
  "Unknown": "Epitope_Class",
  "GP1/Core": "Epitope_Class",
  "GP1/2": "Epitope_Class",
  "human": "Species",
  "mouse": "Species",
  "IgG1": "Isotype",
  "IgG2a": "Isotype",
  "IgG2b": "Isotype",
  "IgG3": "Isotype",
  "P1": "Round",
  "P2": "Round",
  "R1": "Round",
  "R10": "Round",
  "R11": "Round",
  "R12": "Round",
  "R2": "Round",
  "R3": "Round",
  "R4": "Round",
  "R5": "Round",
  "R6": "Round",
  "R7": "Round",
  "R8": "Round",
  "R9": "Round",
  "All": "Cross Reactivity",
  "BDBV & RESTV": "Cross Reactivity",
  "BDBV & SUDV": "Cross Reactivity",
  "BDBV only": "Cross Reactivity",
  "BDBV, SUDV, RESTV": "Cross Reactivity",
  "Marburg only": "Cross Reactivity",
  "None": "Cross Reactivity",
  "RESTV only": "Cross Reactivity",
  "SUDV & RESTV": "Cross Reactivity",
  "SUDV only": "Cross Reactivity",
  "Weak binding only": "Makona binding",
  "Not done": "Makona binding",
  "Binding": "Makona binding",
  "No binding": "Makona binding",
  "Escape Region: 10": "Escape code",
  "Escape Region: 28": "Escape code",
  "Escape Region: 48": "Escape code",
  "Escape Region: Base": "Escape code",
  "Escape Region: Cap": "Escape code",
  "Escape Region: Fusion Loop": "Escape code",
  "Escape Region: GP1 Core": "Escape code",
  "Escape Region: Mucin": "Escape code",
  "No Escape Mutants": "Escape code"
};

Array.prototype.unique = function() {
    var unique = [];
    for (var i = 0; i < this.length; i++) {
        if (unique.indexOf(this[i]) == -1) {
            unique.push(this[i]);
        }
    }
    return unique;
};

var svg = d3.select("#network-svg"),
    sidebarWidth = 500,
    width = window.innerWidth-(sidebarWidth+50),
    height = window.innerHeight-10,
    _limit = 0.4,
    graph = {
      nodes: [],
      links: [],
      d3nodes: [],
      d3links: []
    },
    gcsv,
    gcor,
    gData,
    sliderLength = 150;

var corrThresholdScale = d3.scaleLinear()
    .range([0, sliderLength])
    .domain([0, 1])
    .clamp(true);

// Slider
var svgSlider = d3.select("#slider-svg")
    .attr("width", "200")
    .attr("height", "50");

var slider = svgSlider.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(30,10)");

slider.append("line")
    .attr("class", "track")
    .attr("x1", corrThresholdScale.range()[0])
    .attr("x2", corrThresholdScale.range()[1])
  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-inset")
  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-overlay")
  .call(d3.drag()
	.on("start.interrupt", function() { slider.interrupt(); })	
        .on("start drag", function() {
	  var x = Math.min(Math.max(d3.event.x, 0), sliderLength);
	  handle.attr("cx", x);
	  d3.select("#limit_threshold").html(Math.round(corrThresholdScale.invert(x)*100)/100);
	  graph = create_graph_from_cor_matrix(corrThresholdScale.invert(x));
	  var nodes = JSON.parse(JSON.stringify(graph.nodes));
	  var links = JSON.parse(JSON.stringify(graph.links));
	  draw_network(nodes,links);
	  restartSimulation();
	}));

slider.insert("g", ".track-overlay")
  .attr("class", "ticks")
  .attr("transform", "translate(0," + 18 + ")")
  .selectAll("text")
  .data(corrThresholdScale.ticks(10))
  .enter().append("text")
  .attr("x", corrThresholdScale)
  .attr("text-anchor", "middle")
  .text(function(d) { return String(d).replace("0.", "."); });

d3.select("#limit_threshold").html(_limit);

var handle = slider.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 9)
    .attr("cx", corrThresholdScale(_limit));

svg.attr("width", width).attr("height", height);

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .call(d3.zoom()
        .scaleExtent([1 / 2, 4])
        .on("zoom", zoomed));

var wrapper = svg.append("g").attr("class", "wrapper"), node, link;

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().distance(function(d){return (1-d.value);}).id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(function(d){
      return d.strength * -400;
    }).distanceMax(120))
    .force("center", d3.forceCenter(width / 2, height / 2)),
    timeOut,
    stopSimulation = true,
    alphaTarget = 0.1,
    alphaDecay = 0.8;

// Stop Simulation Button
d3.select("#stop_simulation").on("click", function(){
  startStopSimulation();
});

function startStopSimulation(val){
  if(val){
    stopSimulation = val; 
  }
  if(stopSimulation){
    simulation.stop();
    d3.select("#stop_simulation").html("Restart");
  } else {
    simulation.alphaTarget(alphaTarget).alphaDecay(alphaDecay).restart();
    d3.select("#stop_simulation").html("Stop");
  }
  stopSimulation = !stopSimulation;
}


var color_scale = d3.scaleLinear().domain([-1, 1]).range(['#ff4c4c', '#4c4cff']);

var cat_unique = Object.values(category).unique();
var category_scale = d3.scaleOrdinal(d3.schemeCategory10).domain([cat_unique]);

var categoryLabel = d3.select("#category-legend-wrapper")
    .selectAll(".category_legend")
    .data(cat_unique);

var categoryEnter = categoryLabel.enter()
    .append("div")
    .attr("class", "category_legend");

categoryLabel = categoryEnter.merge(categoryLabel);

categoryLabel.append("div")
  .attr("class", "color_div")
  .style("background", function(d){
    return category_scale(d);
  });

categoryLabel.append("p")
  .attr("class", "category_label")
  .html(function(d){
    if(d==0){
      return "None";
    }
    return d;
  });

var marginBar={
      top: 40,
      bottom: 20,
      left: 10,
      right: 10
    },    
    heightBar=Math.max(window.innerHeight-100, 850)-(marginBar.top+marginBar.bottom),
    widthBar=sidebarWidth-(marginBar.left+marginBar.right),
    corrCoefBar = d3.select("#correlation-coeffecient-wrapper")
    .attr("width", sidebarWidth)
    .attr("height", heightBar+marginBar.top+marginBar.bottom),
    corrValues = [];

var xCorr = d3.scaleLinear().range([0, widthBar]).domain([-1, 1]),
    yCorr = d3.scaleBand().range([0, heightBar]),
    xAxisCorr = d3.axisBottom(xCorr),
    xAxisTopCorr = d3.axisTop(xCorr),
    yAxisCorr = d3.axisLeft(yCorr).tickSize(0),
    widthScale = d3.scaleLinear().range([0, widthBar/2]).domain([0, 1]);

corrCoefBar.append("g")
  .attr("class", "bar-wrapper");

corrCoefBar.append("text")
  .attr("id", "corr-current-feature")
  .attr("y",14)
  .attr("x", marginBar.left)
  .style("font-size", "12px")
  .style("font-weight", "bold");

corrCoefBar.append("g")
  .attr("class", "x-axis")
  .attr("transform", "translate("+marginBar.left+"," + (marginBar.top+heightBar) + ")")
  .call(xAxisCorr)
  .append("text")
  .attr("y", 6)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .text("Value ($)");

// Top X axis
corrCoefBar.append("g")
  .attr("class", "x-axis-top")
  .attr("transform", "translate("+marginBar.left+"," + (marginBar.top) + ")")
  .call(xAxisTopCorr)
  .append("text")
  .attr("y", 6)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .text("Value ($)");


corrCoefBar.append("g")
  .attr("class", "y-axis")
  .attr("transform", "translate("+((widthBar/2)+marginBar.left)+", "+marginBar.top+")");

d3.select("#cluster-options")
  .on("change", function(){
    var v = d3.select(this).property('value');
    init(v);
  });

d3.queue()
  .defer(d3.csv, "data/spearman.csv")
  .defer(d3.csv, "data/spearman_1_cluster.csv")
  .defer(d3.csv, "data/spearman_2_cluster.csv")
  .defer(d3.csv, "data/spearman_3_cluster.csv")
  .defer(d3.csv, "data/spearman_4_cluster.csv")
  .defer(d3.csv, "data/spearman_5_cluster.csv")
  .await(function(error, fall, f1, f2, f3, f4, f5) {
    if (error) {
      console.error('Oh dear, something went wrong: ' + error);
    }
    else {
      gcsv = [fall,f1,f2,f3,f4,f5];
      for(var k = 0; k < gcsv.length; k++) {
	gcsv[k].columns.splice(0, 1);
	for(var i = 0; i < gcsv[k].length; i++) {
	  delete gcsv[k][i]["Colnames"];
	}
      }
      wrapper.append("g")
	.attr("class", "links");
      wrapper.append("g")
	.attr("class", "nodes");
      init(0);
    }
  });

function init(i){
  gcor = gcsv[i];  
  graph = {
    nodes: [],
    links: [],
    d3nodes: [],
    d3links: []
  },

  graph = create_graph_from_cor_matrix(_limit);
  var nodes = JSON.parse(JSON.stringify(graph.nodes));
  var links = JSON.parse(JSON.stringify(graph.links));
  
  draw_network(nodes, links);
  restartSimulation();
}

// d3.csv("data/spearman_3_cluster.csv", function(error, cor) {
//   d3.csv("data/data.csv", function(error, csvData) {
//     if (error) throw error;

//     console.log(csvData);
//     cor.columns.splice(0, 1);
//     for(var i = 0; i < cor.length; i++) {
//       delete cor[i]["Colnames"];
//     }
//     gcor = cor;
//     gData = csvData;

//     wrapper.append("g")
//       .attr("class", "links");
//     wrapper.append("g")
//       .attr("class", "nodes");

//     graph = create_graph_from_cor_matrix(_limit);
//     var nodes = JSON.parse(JSON.stringify(graph.nodes));
//     var links = JSON.parse(JSON.stringify(graph.links));
    
//     draw_network(nodes, links);
//     restartSimulation();
//   });
// });

function draw_network(nodes, links){
  
  node = wrapper.select(".nodes")
    .selectAll(".node").data(nodes);

  link = wrapper.select(".links")
    .selectAll("line").data(links);

  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("id", function(d){return d.id;});
  
  var linkEnter = link.enter().append("line");

  nodeEnter.append("circle");
  nodeEnter.append("text");  

  node.exit().remove();
  link.exit().remove();  

  node = nodeEnter.merge(node);
  link = linkEnter.merge(link);

  node.on("mouseenter", function(d){
    for(var i = 0; i < links.length; i++) {
      if(links[i].source.id == d.id || links[i].target.id == d.id){
	links[i].fadeOut = 0;
      } else {
	links[i].fadeOut = 1;
      }
    }
    draw_network(nodes, links);
  });
  
  node.on("mouseleave", function(){
    for(var i = 0; i < links.length; i++) {
      links[i].fadeOut = 0;
    }    
    draw_network(nodes, links);
  });

  categoryLabel.on("mouseenter", function(d){
    var hnodes = [], temp = [];
    for(var i = 0; i < nodes.length; i++) {
      if(nodes[i].category==d){
	hnodes.push(nodes[i].id);
      }
    }
    for(var i = 0; i < links.length; i++) {
      if(hnodes.indexOf(links[i].source.id) != -1  || hnodes.indexOf(links[i].target.id) != -1){
	links[i].fadeOut = 0;
	if(temp.indexOf(links[i].source.id) == -1)
	  temp.push(links[i].source.id);
	if(temp.indexOf(links[i].target.id) == -1)
	  temp.push(links[i].target.id);
      } else {
	links[i].fadeOut = 1;
      }
    }
    hnodes = hnodes.concat(temp);
    for(var i = 0; i < nodes.length; i++) {
      if(hnodes.indexOf(nodes[i].id) == -1){
	nodes[i].opacity = 0.1;
      } else {
	nodes[i].opacity = 1;
      }
    }    
    draw_network(nodes, links);
  });

  categoryLabel.on("mouseleave", function(d){
    for(var i = 0; i < links.length; i++) {
      links[i].fadeOut = 0;
    }
    for(var i = 0; i < nodes.length; i++) {
      nodes[i].opacity = 1;
    }
    draw_network(nodes, links);
  });
    
  node.on("click", function(d){
    updateCorrGraph(d.id);
  });

  node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

  node.select("text")
    .attr("transform", "translate(8,8)")
    .text(function(d) {return d.name.replace(/`/g,""); });

  node.select("circle")
    .attr("r", 7.5)
    .attr("fill", function(d){
      return category_scale(d.category);
    });

  node.select("text")
    .transition()
    .duration(100)
    .style("opacity", function(d){
      return d.opacity;
    });

  node.select("circle")
    .transition()
    .duration(100)
    .attr("opacity", function(d){
      return d.opacity;
    });

  link.attr("stroke-width", function(d){
      return d.value * 10;
    })
    .attr("stroke", function(d){
      return color_scale(d.actual_value);
    });

  link.transition().duration(100)
    .attr("stroke-opacity", function(d){
      return (d.fadeOut == 1) ? 0.1 : 1;
    });

  graph.d3nodes = nodes;
  graph.d3links = links;

}

function updateCorrGraph(id){
  updateCorrValues(id);
  d3.select("#corr-current-feature").text(gcor.columns[id]);
  var corrd = JSON.parse(JSON.stringify(corrValues));
  var bar = corrCoefBar.select(".bar-wrapper").selectAll(".bar")
      .data(corrd);
  // Update x axis
  yCorr = d3.scaleBand().range([0, Math.min((heightBar/20)*corrd.length, heightBar)]);
  yAxisCorr = d3.axisLeft(yCorr).tickSize(0);
  yCorr.domain(corrd.map(function(i){return i.y;}));
  
  corrCoefBar.select(".y-axis")
    .call(yAxisCorr)
    .selectAll("text")
    .text(function(d){
      return d;
    })
    .attr("text-anchor", function(d){
      var v = 0;
      for(var i = 0; i < corrd.length; i++) {
	if(corrd[i].y==d){
	  v = corrd[i].x;
	  break;
	}
      }
      return (v>=0) ? "end": "start";
    })
    .attr("dx", function(d){
      var v = 0;
      for(var i = 0; i < corrd.length; i++) {
	if(corrd[i].y==d){
	  v = corrd[i].x;
	  break;
	}
      }
      return (v>=0) ? 0 : "0.5em";
    })
    .attr("dy", "0.32em")
    .style("font-size", "10px");
  
  bar.exit().remove();
  
  var barEnter = bar.enter()
      .append("g").attr("class", "bar");

  barEnter.append("rect");
  barEnter.append("text");

  bar = barEnter.merge(bar);
  
  bar.select("rect")
    .style("fill", function(d){
      return color_scale(d.x);
    })
    .transition()
    .attr("y", function(d) { return marginBar.top + yCorr(d.y); })
    .attr("height", yCorr.bandwidth())
    .attr("x", function(d) { return xCorr(Math.min(d.x, 0))+marginBar.left; })
    .attr("width", function(d) { return widthScale(Math.abs(d.x)); });

  bar.select("text")
    .text(function(d){
      return Math.round(d.x*100)/100;
    })  
    .attr("y", function(d) { return marginBar.top + yCorr(d.y) + yCorr.bandwidth()/2; })
    .attr("x", function(d) {
      var t = Math.min(d.x, 0);
      if(t<0){
	t=xCorr(t);
      } else {
	t=xCorr(t)+widthScale(Math.abs(d.x));
      }
      return t+marginBar.left;
    })
    .attr("text-anchor", function(d){
      return (d.x>=0) ? "start" : "end";
    })
    .style("font-size", "10px")
    .attr("dy", "0.32em");
}

function getDataFromCsv(col){
  var d= [];
  for(var i = 0; i < gData.length; i++) {
    d.push({
      x: d[""],
      y: d[col]
    });
  }
  return d;
}

function compareCorr(a,b) {
  if (a.x < b.x)
    return -1;
  if (a.x > b.x)
    return 1;
  return 0;
}

function updateCorrValues(id){
  var keys = Object.keys(gcor[id]),
      d = [];
  if (corrValues.length == 0) {
    corrValues = Array(keys.length -1).fill({
      x: 0,
      y: ""
    });
  }
  for(var i = 0; i < keys.length; i++) {
    if (keys[i] =="" || keys[i]==gcor.columns[id] || gcor[id][keys[i]]=="NA")
      continue;
    d.push({
      y : keys[i],
      x : parseFloat(gcor[id][keys[i]])
    });
  }
  d.sort(compareCorr);
  corrValues = d;
}


var _animateInterval, visitedNodes = [];
function animateMouseover(inttime){
  clearInterval(_animateInterval);
  var nodes = JSON.parse(JSON.stringify(graph.nodes)),
      links = JSON.parse(JSON.stringify(graph.links)),
      i, tmp, startNode = 0, neighbours = [],
      temp = 1000;
  _animateInterval = setInterval(function() {
    tmp = [];
    for(var i = 0; i < nodes.length; i++) {
      nodes[i].opacity = 0.1;
    }    
    for(i = 0; i < links.length; i++) {
      if(links[i].source == startNode || links[i].target == startNode){
	links[i].fadeOut = 0;	
	tmp.push((links[i].source == startNode) ? links[i].target : links[i].source);
      } else {
	links[i].fadeOut = 1;
      }
    }
    nodes[check_if_node_exists(nodes, startNode)].opacity = 1;
    for(var i = 0; i < tmp.length; i++) {
      nodes[check_if_node_exists(nodes, tmp[i])].opacity = 1;
    }
    var newVisit = false;
    for(var i = tmp.length-1; i >= 0; i--) {
      if (visitedNodes.indexOf(tmp[i]) == -1) {
	startNode = tmp[i];
	visitedNodes.push(startNode);
	newVisit = true;
	break;
      }
    }
    var n;
    if(!newVisit){
      n = nodes.map(function(_n){return _n.id;});
      startNode = n[Math.round(Math.random() * (n.length-1))];
    }
    draw_network(nodes, links);
  }, inttime);
}

function restartSimulation(){
  
  simulation
    .nodes(graph.d3nodes)
    .on("tick", ticked);
  
  simulation.force("link")
    .links(graph.d3links);
  simulation.alphaTarget(alphaTarget).alphaDecay(alphaDecay).restart();
  console.log(timeOut);
  clearTimeout(timeOut); 
  console.log(timeOut); 
  timeOut = window.setTimeout(function(){
    simulation.stop();
    startStopSimulation(true);
  }, 5000);
  console.log(timeOut);  
}

function ticked() {
  var x,y;
  node
    .attr("transform", function(d) {
      x = get_x_bounding_box(d.x);
      y = get_y_bounding_box(d.y);
      return "translate("+x+","+y+")";
    });

  link.attr("x1", function(d) { return get_x_bounding_box(d.source.x); })
    .attr("y1", function(d) { return get_y_bounding_box((d.source).y); })
    .attr("x2", function(d) { return get_x_bounding_box(d.target.x); })
    .attr("y2", function(d) { return get_y_bounding_box(d.target.y); });
}

function zoomed() {
  wrapper.attr("transform", d3.event.transform);
}

function get_x_bounding_box(x){	     
  return Math.max(Math.min(x, width-50), 15);
}

function get_y_bounding_box(y){
  return Math.max(Math.min(y, height-15), 50);
}	      
	      
	      
function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(alphaTarget).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  // d.fx = null;
  // d.fy = null;
}

function get_node_strength(cor , i){
  var s = 0;
  for(var k = 0; k < cor.columns.length; k++) {
    if(cor[i][cor.columns[k]]=="NA"){
      continue;
    }
    s += Math.pow(parseFloat(cor[i][cor.columns[k]]), 2);
  }
  return Math.sqrt(s);
}

function check_limit_for_node(cor, i, limit){
  var s = false;
  for(var k = 0; k < cor.columns.length; k++) {
    if (cor[i][cor.columns[k]]=="NA"){
      continue;
    }
    if (Math.abs(parseFloat(cor[i][cor.columns[k]])) >= limit && cor.columns[i]!=cor.columns[k]) {
      s = true;
      break;
    }
  }
  return s;
}

function check_if_link_exists(links, source, target){
  for(var i = 0; i < links.length; i++) {
    if((links[i].source == source && links[i].target == target) || (links[i].target == source && links[i].source == target)){
      return i;
    }
  }
  return -1;
}

function check_if_node_exists(nodes, id){
  for(var i = 0; i < nodes.length; i++) {
    if(nodes[i].id == id){
      return i;
    }
  }
  return -1;
}

function nodeCompare(a,b) {
  if (a.id < b.id)
    return -1;
  if (a.id > b.id)
    return 1;
  return 0;
}

function linkCompare(a,b){
  if(a.source < b.source)
    return -1;
  if(a.source > b.source)
    return 1;
  // Goes here only if a.source == b.source
  if(a.target > b.target)
    return 1;
  return -1;
}

function create_graph_from_cor_matrix(limit){
  var node_ids = [],
      nodes = graph.nodes,
      links = graph.links,
      c,
      index,
      col,
      cat;
  _limit = limit;
  for(var i = 0; i < gcor.columns.length; i++) {
    col = gcor.columns[i];
    cat = Object.keys(category).indexOf(col.trim());
    s = get_node_strength(gcor, i);
    c = check_limit_for_node(gcor, i, limit);
    index = check_if_node_exists(nodes, i);
    if(c && index==-1){
      nodes.push({
	"id": i,
	"name": col,
	"category": (cat != -1) ? category[Object.keys(category)[cat]] : 0,
	"strength": s,
	"opacity": 1
      });
    } else if(!c && index != -1) {
      nodes.splice(index, 1);
    }
  }
  // Sort to ensure same order
  nodes.sort(nodeCompare);
  
  var _i, _j, s;
  for(i = 0; i < gcor.columns.length; i++) {
    _i = gcor.columns[i];
    for(var j = 0; j < gcor.columns.length; j++) {
      _j = gcor.columns[j];
      if (i == j)
	continue;
      if(gcor[i][_j]=="NA"){
	continue;
      }
      c = Math.abs(parseFloat(gcor[i][_j])) >= limit;
      index = check_if_link_exists(links, i, j);
      if(c && index == -1){
	links.push({
	  source: i,
	  target: j,
	  value: Math.abs(parseFloat(gcor[i][_j])),
	  actual_value: parseFloat(gcor[i][_j]),
	  fadeOut: 0
	});
      } else if(!c && index != -1){
	links.splice(index, 1);
      }
    }
  }

  links.sort(linkCompare);

  // Reset fadeOut
  for(i = 0; i < links.length; i++) {
    links[i].fadeOut = 0;
  }
  
  return {
    nodes: nodes,
    links: links
  };
}
