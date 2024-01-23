// 
var margin = {top: 50, right: 50, bottom: 50, left: 50},
width = 1320 - margin.left - margin.right, 
height = 907 - margin.top - margin.bottom;

scaleHeight = 100;
scaleWidth = 80;
var pathToCsv = "line_graph_output_data.csv";

// creating formatter
// var parseTime = d3.timeFormat("%d %b %y")

d3.csv(pathToCsv, function(d){
    var dateParts = d["time"].split("-");
    return {
    time: new Date(dateParts[0], dateParts[1], dateParts[2]),
    prophetData: +d["prophet_pred"],
    arimaData: +d["arima_pred"],
    trueVals: +d["values"],
    precinctNumber: +d["precinct_number"]
    }
}).then(function(d){
    ready_linegrapher(d);
});

function ready_linegrapher(data){
    // --- BUILDING DROPDOWN ---
    var precinctSet = new Set();
    for (var i = 0; i < Object.keys(data).length-1; i++){
        precinctSet.add(data[i].precinctNumber.toString()) 
    }
    var precinctList = Array.from(precinctSet);

    // Append Unique Features to Dropdown Menu
    d3.select("#timeSeriesDropdown")
        .selectAll("option")
        .data(precinctList)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Listener for Select Element
    var selectedPrecinct = document.getElementById("timeSeriesDropdown");

    // Making Initial LineGraph
    lineFilteredData = dataFilterer(data, selectedPrecinct.value);
    lineGraphMaker(lineFilteredData);

    // Make New Graph on Change of Selection
    selectedPrecinct.onchange = function(){
        d3.select("#line_graph").remove();
        lineFilteredData = dataFilterer(data, selectedPrecinct.value);
        lineGraphMaker(lineFilteredData);
    };
};

function lineGraphMaker(data){
    // Attaching SVG
    var svg = d3.select("#svgLineGraphContainer")
      .append("svg")
      .attr("id", "line_graph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    
    // Creating Arrays of Vals 
    var arimaDataArray = data.map(function(d) {
        return d.arimaData;
    });
    var prophetDataArray = data.map(function(d) {
        return d.prophetData;
    });
    var trueValsArray = data.map(function(d) {
        return d.trueVals;
    });

    // --- SCALES --- //
    // Creating Scales
    var xScale = d3.scaleTime()
        .domain(d3.extent(data, function(d){
            return d.time;
        }))
        .range([0, width-150+scaleWidth]);
    var yScale = d3.scaleLinear()
        .domain([0,40000]) // or use biggest value as d3.max([d3.max(arimaDataArray),d3.max(prophetDataArray),d3.max(trueValsArray)])
        .range([height-scaleHeight, 100]);

    // --- AXES --- //
    // Creating X-Axis
    x_axis = svg.append("g")
        .attr("id", "x-axis-a")
        .attr("transform", "translate("+ scaleWidth +"," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%b %Y"))
        )
        .attr("overflow", "visible");
    // Creating Y-Axis
    y_axis = svg.append("g")
        .attr("id", "y-axis-a")
        .attr("transform", "translate("+ scaleWidth + "," + scaleHeight + ")")
        .call(d3.axisLeft(yScale))
        .attr("overflow", "visible")
        .attr("z-index", "4");
    
    // Plot
    var lines = svg.append("g")
        .attr("id", "lines")
        .attr("overflow", "visible");

    lines.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(function(d){
                return xScale(d.time)+scaleWidth
            })
            .y(function(d){
                return yScale(d.arimaData)+scaleHeight
            })
            .defined(function(d) {
                return d.arimaData;
            })
        )
    
    lines.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#08519c")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(function(d){
                return xScale(d.time)+scaleWidth
            })
            .y(function(d){
                return yScale(d.prophetData)+scaleHeight
            })
            .defined(function(d) {
                return d.prophetData;
            })
        )

    lines.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 4)
        .attr("d", d3.line()
            .x(function(d){
                return xScale(d.time)+scaleWidth
            })
            .y(function(d){
                return yScale(d.trueVals)+scaleHeight
            })
            .defined(function(d) {
                return d.trueVals;
            })
        )

    // ATTACHING LINE LABELS
    lines.append("text")
        .data(data)
        .attr("class", "line_labels")
        .text("ARIMA")
        .attr("y", function(d){
            return yScale(data[23]["arimaData"])+scaleHeight+5;
        })
        .attr("x", width+20)
        .attr("fill", "#FFFFFF")
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("font-size", "20px");
    lines.append("text")
        .data(data)
        .attr("class", "line_labels")
        .text("Prophet")
        .attr("y", function(d){
            return yScale(data[23]["prophetData"])+scaleHeight+5;
        })
        .attr("x", width+20)
        .attr("fill", "#08519c")
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("font-size", "20px");

    

    // adding axis labels
    x_axis.append("text")
      .attr("class", "axis-label")
      .attr("id", "x-axis label")
      .attr("x", 580)
      .attr("y", 60)  // Adjust the y-coordinate to position the label as needed
      .attr("text-anchor", "middle")
      .text("Month")
      .attr("fill", "black")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("font-size", "30px");

  // Adding y-axis label
    y_axis.append("text")
      .attr("class", "axis-label")
      .attr("id", "y-axis label")
      .attr("x", -height / 2 +50)
      .attr("y", -margin.left -5)  // Adjust the x-coordinate and y-coordinate to position the label as needed
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .text("Violation Counts")
      .attr("fill", "black")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("font-size", "30px")
      .attr("z-index", "4");

                        // ADDING FORECAST MODEL TEXT IF REQ
    // x_axis.append("text")
    //   .attr("class", "axis-label")
    //   .attr("id", "x-axis label")
    //   .attr("x", 870)
    //   .attr("y", 92)
    //   .attr("text-anchor", "middle")
    //   .text("Note: Forecast models are trained on data from Aug 2014 - Jul 2023, only data from Aug 2022 visualized")
    //   .attr("fill", "black")
    //   .attr("font-family", "Arial, Helvetica, sans-serif")
    //   .attr("font-size", "15px");
};

function dataFilterer(data, selection){
    // console.log(data);
    // Filter data only for the specified time and specified feature
    var new_data = [];
    for (var i = 0; i < Object.keys(data).length-1; i++){
        if(data[i]['precinctNumber'] == selection){
            new_data.push({
                time: data[i]['time'],
                prophetData: data[i]['prophetData'],
                arimaData: data[i]['arimaData'],
                trueVals: data[i]['trueVals']
            });
        }
    };
    return new_data
}