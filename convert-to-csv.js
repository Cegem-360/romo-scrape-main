const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Step 1: Read the JSON file
const jsonFilePath = path.join(__dirname, "scrape-results.json");
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

// Step 2: Flatten the arrays in the JSON data
const flattenedData = jsonData.map(item => {
  return {
    ...item,
    gallery: item.gallery ? item.gallery.join("|") : "",
    galleryThumbs: item.galleryThumbs ? item.galleryThumbs.join("|") : "",
    performance: item.performance ? item.performance.join("|") : "",
    color: item.color ? item.color.join("|") : ""
  };
});

// Step 3: Define the CSV writer
const csvWriter = createCsvWriter({
  path: path.join(__dirname, "output.csv"),
  header: Object.keys(flattenedData[0]).map(key => ({ id: key, title: key }))
});

// Step 4: Write the flattened data to a CSV file
csvWriter.writeRecords(flattenedData)
  .then(() => {
    console.log("CSV file was written successfully");
  })
  .catch(err => {
    console.error("Error writing CSV file", err);
  });