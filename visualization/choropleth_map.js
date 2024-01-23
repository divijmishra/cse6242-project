// --- --- --- --- GLOBAL VARIABLES --- --- --- ---
var svg_width = 700
var svg_height = 800

//
// Projection and Path required for Choropleth
var projection = d3.geoAlbers();
var path = d3.geoPath().projection(projection);

//
// EXPLANATION ARRAY
var explanationArr = [
"This choropleth displays precincts' tendency to increase violations at month-end to meet a quota.", 
"This choropleth displays the distribution of the total fines associated with parking violations throughout precincts in NYC.", 
"This choropleth shows the number of collisions in the precincts.", 
"This choropleth shows the most common plate type (Passenger vs Commerical vs Others) for ticketed vehicles in the given precincts.",
"This choropleth shows the most common time of day for receiving parking tickets in a given precinct.",
"This choropleth shows the most frequent color for ticketed vehicles in the given precinct.",
"This choropleth displays the the vehicle type with the maximum percentage of parking violations in the precincts."
]


// --- --- --- --- GETTING DATA --- --- --- ---
Promise.all([
    d3.json("NYC_Police_Precincts.geojson"),
    d3.csv("choropleth_data.csv", function(d){
        var dateParts = d["time"].split("-");
        // console.log(dateParts)
        return { 
            time: new Date(dateParts[1], dateParts[0]),                                         // use for filtering
            precinct: +d["precinct"],                                                           // use for attaching to JSON
            mostTicketedCarType: d["maximum_ticketed_car_type"],                                // use in Type Choro
            percentageMostTicketedCarType: +d["percentage_maximum_ticketed_car_type"],          // use in Type Choro
            mostTicketedVehicleColor: d["maximum_ticketed_vehicle_color"],                      // use in Color Choro
            percentageMostTicketedVehicleColor: +d["percentage_maximum_ticketed_vehicle_color"],// use in Color Choro
            mostTicketedViolationCode: d["maximum_ticketed_violation_code"],                    // use in Viol Choro
            mostTicketedViolationCodeMeaning: d["maximum_ticketed_violation_definition"],       // use in Viol Choro
            mostTicketedPlateType: d["maximum_ticketed_plate_type"],                            // use in Plate Choro
            percentageMostTicketedPlateType: +d["percent_maximum_ticketed_plate_type"],         // use in Plate Choro
            quotasCondition: d["quotas_condition_met"],                                         // use in Quota Choro       // Done
            mostTicketsTimeOfDay: d["max_tickets_issued_time_of_day"],                          // use in Time Choro
            numberCollisions: +d["collisions"]                                                  // use in Colli Choro
        }
    })
]).then(([precinctData, allData]) => {
    ready(precinctData, allData);
});



// --- --- --- --- READY THE PAGE --- --- --- ---
function ready(nycJson, allData) {
    // Extract all Unique Features into featureSet
    featureList = ["Month End Increase in Tickets", "Most Common Type of Violation", "Number of Collisions", "Ticketing Frequency by Plate Type", "Ticketing Frequency by Time of Day", 
        "Ticketing Frequency by Vehicle Color", "Ticketing Frequency by Vehicle Type"];

    // Append Unique Features to Dropdown Menu
    d3.select("#featureDropdown")
        .selectAll("option")
        .data(featureList)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    
    projection.fitSize([700,800], nycJson);

    // --- EVENT LISTENERS --- 
    var sliderForMonth = document.getElementById("MonthRange");
    var sliderForYear = document.getElementById("YearRange");
    var selectedFeature = document.getElementById("featureDropdown");

    // Event Listener for the Dropdown to Update Choropleth
    selectedFeature.onchange = function(){
        createrMapDisburser(nycJson, allData, selectedFeature.value, sliderForMonth.value, sliderForYear.value);
    };

    sliderForMonth.onchange = function(){
        createrMapDisburser(nycJson, allData, selectedFeature.value, this.value, sliderForYear.value);
    }

    sliderForYear.onchange = function(){
        createrMapDisburser(nycJson, allData, selectedFeature.value, sliderForMonth.value, this.value);
    }

    // Default Choropleth
    createrMapDisburser(nycJson, allData, selectedFeature.value, sliderForMonth.value, sliderForYear.value);
}


// --- --- --- --- DISBURSE INTO EACH MAP BUILDER --- --- --- ---
function createrMapDisburser(nycJson, allData, selectedFeature, selectedMonth, selectedYear){
    if(selectedFeature == "Month End Increase in Tickets"){
        makeQuotaChoro(nycJson, allData, selectedMonth, selectedYear);
    } else if(selectedFeature == "Most Common Type of Violation"){
        makeViolChoro(nycJson, allData, selectedMonth, selectedYear);
    } else if(selectedFeature == "Number of Collisions"){
        makeColliChoro(nycJson, allData, selectedMonth, selectedYear);
    } else if(selectedFeature == "Ticketing Frequency by Plate Type"){
        makePlateChoro(nycJson, allData, selectedMonth, selectedYear);
    } else if(selectedFeature == "Ticketing Frequency by Time of Day"){
        makeTimeChoro(nycJson, allData, selectedMonth, selectedYear);
    } else if(selectedFeature == "Ticketing Frequency by Vehicle Color"){
        makeColorChoro(nycJson, allData, selectedMonth, selectedYear);
    } else {
        makeTypeChoro(nycJson, allData, selectedMonth, selectedYear);
    };
};

function makeQuotaChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[0];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['quotasCondition'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    quotasCond: allData[i]['quotasCondition']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();

        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");

        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["quotasCond"] = reqData[k]["quotasCond"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();

    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `Precinct ${d.properties["Precinct"]}`;
        });

    svg.call(tooltip);
    // DEFINE SCALE
    var colorScale = d3.scaleOrdinal()
        .range(["#08529D", "#f7f7f7", "#C0C0C0"]) // first is blue
        .domain(["True", "", "False"]); // Use an array for the domain

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["quotasCond"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.range().reverse())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return d;
        });

    legend.selectAll("text")
        .data(colorScale.range().reverse())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d, j){
            if(j == 0){
                return "False"
            }
            if(j == 1){
                return "Data Not Available"
            }
            if(j == 2){
                return "True"
            }
        })
        .style("font-family", "Arial, Helvetica, sans-serif") // Set font family
        .style("font-size", "16px");
};

function makeViolChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[1];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['mostTicketedViolationCode'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    violCode: allData[i]['mostTicketedViolationCode'],
                    violNotes: allData[i]['mostTicketedViolationCodeMeaning']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();

        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");

        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON AND MAKE SET OF UNIQUE VIOLATIONS FOR MAKING SCALE
    const uniqueViols = new Set();
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["violCode"] = reqData[k]["violCode"];
                nycJson.features[j].properties["violNotes"] = reqData[k]["violNotes"];
                uniqueViols.add(reqData[k]["violCode"]);
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();
    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `The most common violation in Precinct ${d.properties["Precinct"]} is because of - <br> ${d.properties["violNotes"]}`;
        });
    svg.call(tooltip);

    // DEFINE SCALE
    const uniqueViolsArr = Array.from(uniqueViols);
    uniqueViolsArr.sort();
    var colorScale = d3.scaleOrdinal()
        .range(["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"]) // first is blue
        .domain(uniqueViolsArr); // Use an array for the domain

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["violCode"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.domain().reverse())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return colorScale(d);
        });

    legend.selectAll("text")
        .data(colorScale.domain().reverse())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d){
            if(d == ""){
                return "Data Not Available"
            }
            return "Violation Code " + parseInt(d)
        })
        .style("font-family", "Arial, Helvetica, sans-serif")
        .style("font-size", "16px");
};

function makeColliChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[2];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['numberCollisions'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    numberCollisions: allData[i]['numberCollisions']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();

        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");

        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["numberCollisions"] = reqData[k]["numberCollisions"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();
    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `Precinct ${d.properties["Precinct"]}`;
        });
    svg.call(tooltip);

    // DEFINE SCALE
    var colorScale = d3.scaleQuantile()
    .range(["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"])
    .domain([0, d3.max(reqData, function(d) { return d.numberCollisions; })]);

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["numberCollisions"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"])
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 20 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return d;
        });

    legend.selectAll("text")
        .data(colorScale.domain())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 80 + 315;
        })
        .text(function(d){
            return parseInt(d);
        })
        .style("font-family", "Arial, Helvetica, sans-serif") // Set font family
        .style("font-size", "16px");
};

function makePlateChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[3];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['mostTicketedPlateType'] != "" && allData[i]['percentageMostTicketedPlateType'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    plateType: allData[i]['mostTicketedPlateType'],
                    plateTypePerc: allData[i]['percentageMostTicketedPlateType']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();
        
        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");

        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["plateType"] = reqData[k]["plateType"],
                nycJson.features[j].properties["plateTypePerc"] = reqData[k]["plateTypePerc"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();

    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            if(d.properties["plateType"] == "commercial"){
                return `In Precinct ${d.properties["Precinct"]}, ${d.properties["plateType"]} vehicles formed ${d.properties["plateTypePerc"]}% of those ticketed!`
            } else {
                return `In Precinct ${d.properties["Precinct"]}, ${d.properties["plateType"]} vehicles formed the majority of those ticketed.`
            };
        });

    svg.call(tooltip);
    // DEFINE SCALE
    var colorScale = d3.scaleOrdinal()
        .range(["#C0C0C0" , "#f7f7f7",  "#08529D"]) // first is blue
        .domain(["passenger", "", "commercial"]);

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["plateType"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.range().reverse())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return d;
        });

    legend.selectAll("text")
        .data(colorScale.domain().reverse())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d){
            if(d == "passenger"){
                return "Passenger Vehicles"
            }
            if(d == ""){
                return "Other Plate Type"
            }
            if(d == "commercial"){
                return "Commercial Vehicles"
            }
        })
        .style("font-family", "Arial, Helvetica, sans-serif")
        .style("font-size", "16px");
};

function makeTimeChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[4];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['mostTicketsTimeOfDay'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    TimeOfDay: allData[i]['mostTicketsTimeOfDay']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();
        
        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");
        
        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["TimeOfDay"] = reqData[k]["TimeOfDay"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();

    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `Precinct ${d.properties["Precinct"]}`
        });

    svg.call(tooltip);

    // DEFINE SCALE
    var colorScale = d3.scaleOrdinal()
        .range(["#9ecae1", "#3182bd", "#08529D" , "#C0C0C0"]) // 3rd is blue
        .domain(["Morning", "Afternoon", "Night", ""]);

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["TimeOfDay"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.range())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return d;
        });

    legend.selectAll("text")
        .data(colorScale.domain())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d){
            if(d == ""){
                return "Data Not Available"
            } else {
                return d;
            }
        })
        .style("font-family", "Arial, Helvetica, sans-serif")
        .style("font-size", "16px");
};

function makeColorChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[5];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['mostTicketedVehicleColor'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    vehicleColor: allData[i]['mostTicketedVehicleColor'],
                    percVehicleColor: allData[i]['percentageMostTicketedVehicleColor']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();
        
        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");
        
        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["vehicleColor"] = reqData[k]["vehicleColor"];
                nycJson.features[j].properties["percVehicleColor"] = reqData[k]["percVehicleColor"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();

    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `In Precinct ${d.properties["Precinct"]}, ${d.properties["percVehicleColor"]}% of the vehicles ticketed are ${d.properties["vehicleColor"].toLowerCase()} in color!`
        });

    svg.call(tooltip);

    // DEFINE SCALE
    var colorScale = d3.scaleOrdinal()
        .range(["#FFFFFF", "#DEB887", "#778899" , "#343434", "#08529d"]) // last is blue
        .domain(['WHITE', 'BROWN', 'GRAY', 'BLACK', 'OTHER']);

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries") // CAN ADD STROKE HERE IF REQUIRED
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["vehicleColor"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.range())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return d;
        });

    legend.selectAll("text")
        .data(colorScale.domain())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d){
            return lowercaseExceptFirst(d);
        })
        .style("font-family", "Arial, Helvetica, sans-serif")
        .style("font-size", "16px");
};

function makeTypeChoro(nycJson, allData, valMonth, valYear){
    // UPDATE EXPLANATION OVERLAY
    var explanationDiv = document.getElementById("explanationOverlay");
    explanationDiv.innerHTML = explanationArr[6];

    // CLEAN PREVIOUS
    d3.select("#svgContainer > *").remove();
    d3.select("#legend").remove();

    var svg = d3.select("#svgContainer")
        .append("svg")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("id", "choropleth");

    // FILTER DATA
    var reqData = [];
    for (var i = 0; i < Object.keys(allData).length-1; i++){
        const dataTime = allData[i]['time'];
        const dataMonth = dataTime.getMonth();
        const dataYear = dataTime.getFullYear();
        if((dataMonth == valMonth-1) && (dataYear == valYear)){
            if(allData[i]['mostTicketedCarType'] != ""){
                reqData.push({
                    precinct: allData[i]['precinct'],
                    vehicleType: allData[i]['mostTicketedCarType'],
                    percVehicleType: allData[i]['percentageMostTicketedCarType']
                });
            }
        }
    };

    // IF DATA NOT AVAILABLE
    if(reqData.length === 0){
        d3.select("#choropleth").remove();
        
        d3.select("#svgContainer")
            .append("text")
            .attr("class", "textBox")
            .html("Data for this time period not available <br> Please choose a different time period!");
        
        explanationDiv.innerHTML = "";
        return;
    };

    // ADD TO JSON
    for (var j = 0; j < Object.keys(nycJson.features).length; j++){
        for(var k = 0; k < reqData.length; k++ ){
            if(nycJson.features[j].properties["Precinct"] == reqData[k]["precinct"]){
                nycJson.features[j].properties["vehicleType"] = reqData[k]["vehicleType"];
                nycJson.features[j].properties["percVehicleType"] = reqData[k]["percVehicleType"];
            }
        };
    };

    // ADD TOOLTIP
    d3.select("#tooltip").remove();

    const tooltip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("id", "tooltip")
        .html(function(d){
            return `In Precinct ${d.properties["Precinct"]}, ${d.properties["percVehicleType"]}% of the vehicles ticketed are ${d.properties["vehicleType"].toLowerCase()}s!`
        });

    svg.call(tooltip);

    // DEFINE SCALE
    var colorScale = d3.scaleOrdinal()
        .range(["#33a02c","#08519c","#fb9a99","#fdbf6f","#ff7f00","#6a3d9a","#ffff99","#b15928"]) // 3rd is blue 
        .domain(['Van', 'Suburban', 'Delivery Truck', '4 Door Sedan', 'Sedan', 'Tractor']);

    // BUILD MAP USING PATHS
    var countries = svg.append("g")
        .attr("id", "countries");

    countries.selectAll("#countries")
        .data(nycJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", function(d){
            return d.properties['Precinct'];
        })
        .style("fill", function(d){
            return colorScale(d.properties["vehicleType"])
        })
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", tooltip.show)
        .on("mouseout", tooltip.hide);

    // BUILD LEGEND
    d3.select("#legend").remove();

    var legend = d3.select("#svgContainer")
        .append("svg")
        .attr("width", 30)
        .attr("height", svg_height)
        .attr("id", "legend")
        .style("overflow", "visible");

    legend.selectAll("rect")
        .data(colorScale.domain())
        .enter()
        .append('rect')
        .attr("x", 80)
        .attr("y", function(d, i) {
            return i * 30 + 300;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d){
            return colorScale(d);
        });

    legend.selectAll("text")
        .data(colorScale.domain())
        .enter()
        .append('text')
        .attr("x", 110)
        .attr("y", function(d, i) {
            return i * 30 + 315;
        })
        .text(function(d){
            return d;
        })
        .style("font-family", "Arial, Helvetica, sans-serif")
        .style("font-size", "16px");
};

function lowercaseExceptFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// 