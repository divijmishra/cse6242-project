function scaleBody() {
    // Set the desired base screen width (you can adjust this value)
    var baseScreenWidth = 1920;

    // Calculate the scale factor based on the user's screen width
    var scaleFactor = window.innerWidth / baseScreenWidth;

    // Apply the scale transformation to the body
    document.body.style.zoom = scaleFactor;
};
window.onload = scaleBody;
window.onresize = scaleBody;

var sliderForMonth = document.getElementById("MonthRange")
var sliderForYear = document.getElementById("YearRange")

var yearOutput = document.getElementById("yearOutput");
var monthOutput = document.getElementById("monthOutput");

var monthString = "March";

monthOutput.innerHTML = monthString;
yearOutput.innerHTML = sliderForYear.value;

sliderForMonth.oninput = function() {
    if(this.value == 1){
        monthString = "January";
    } else if(this.value == 2) {
        monthString = "February";
    } else if(this.value == 3) {
        monthString = "March";
    } else if(this.value == 4) {
        monthString = "April";
    } else if(this.value == 5) {
        monthString = "May";
    } else if(this.value == 6) {
        monthString = "June";
    } else if(this.value == 7) {
        monthString = "July";
    } else if(this.value == 8) {
        monthString = "August";
    } else if(this.value == 9) {
        monthString = "September";
    } else if(this.value == 10) {
        monthString = "October";
    } else if(this.value == 11) {
        monthString = "November";
    } else {
        monthString = "December";
    }
    monthOutput.innerHTML = monthString;
}

sliderForYear.oninput = function() {
    yearOutput.innerHTML = this.value;
}