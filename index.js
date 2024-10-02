const request = require('request')
const fs = require('fs')
const Xray = require('x-ray')
//const x = Xray()
const x = Xray({
  filters: {
    sku_replace: function(value) {
      return typeof value === 'string' ? value.replace("/", ".") : value
    },
    url_replace: function(value) {
      return typeof value === 'string' ? value.replace("/121x90/", "/900x550/") : value
    }
  }
}).delay('2s', '3s')
//const url = "https://www.romo.com/collections/accessories/trimmings/tivolitrimmings/tivoli-fringe/mulberry"
const urls = [
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/pacific',
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/lovat',
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/sandstone',
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/crema',
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/parsnip',
  'https://www.romo.com/collections/wallcoverings/etsu-wallcoverings/lyra-wallcovering/kelp',
  "https://www.romo.com/collections/accessories/trimmings/tivolitrimmings/tivoli-fringe/mulberry",
  "https://www.romo.com/collections/accessories/trimmings/tivolitrimmings/tivoli-fringe/danube"
]
const results = []
const output = ''
var counter = 0

const input = require('./input_urls.json');
input.forEach(line => {
  //urls.push(line)
  //console.log(line)
})

//urls.forEach(async(url) => {
//forEach(function(urls) {
urls.forEach(url => {
  console.log(url)
  x(url, '.productContainer', [
    {
      sku: '.sku | sku_replace',
      title: '.designName',
      image: 'img.u-photo@src',
      gallery: ['ul.collection-images img@src | url_replace']
    }
  ])
  (function(err, obj) {
    results.push(obj)
    //console.log(results)
    //const output = JSON.stringify(results)
    //console.log(obj)
    //console.log(output)
    //fs.writeFileSync('results.json', JSON.stringify(obj, null, 2) , 'utf-8')
  })(function(){
    const output = JSON.stringify(results)
    console.log(output)
    counter = counter+1
    console.log(counter)
    fs.writeFile('./results.json', output, 'utf-8', (err) => {
      if (err) {
          console.log(`Error writing file: ${err}`);
      } else {
          console.log(`File is written successfully!`);
      }
    });
  })//.write('results.json')
})

/*const input = require('./input_urls.json');
input.forEach(line => {
    console.log(line);
})

const jsonURLs = JSON.stringify(urls)
console.log(jsonURLs)*/

process.exit(0)

