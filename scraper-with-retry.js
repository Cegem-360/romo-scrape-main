const request = require('request');
const fs = require('fs');
const Xray = require('x-ray');
const x = Xray({
  filters: {
    sku_replace: function(value) {
      return typeof value === 'string' ? value.replace("/", ".") : value;
    },
    url_replace: function(value) {
      return typeof value === 'string' ? value.replace("/121x90/", "/900x550/") : value;
    }
  }
}).delay('2s', '3s');

const mainUrl = 'https://www.cooperklima.hu/lakossagi-termekek/split-klimak';
const familyUrls = [];
const productUrls = [];
const results = [];
const maxRetries = 3;

// Helper function to retry requests
function retryRequest(url, retries, callback) {
  x(url, '#page_artdet_content', {
    sku: '.artdet__sku-value',
    title: 'h1.artdet__name',
    gallery: ['.pswp__img@src'],
    price: '#price_net_brutto_CH__unas__S09FTXLA2__unas__NG',
    attributes: x('.product-attributes', [{
      name: '.attribute-name',
      value: '.attribute-value'
    }]),
    mainAttributes: x('.spec-param-right .artdet__spec-param', [{
      name: '.artdet__spec-param-title .param-name',
      value: '.artdet__spec-param-value'
    }]),
    furtherAttributes: x('.data__items .data__item-param', [{
      name: '.data__item-title .param-name',
      value: '.data__item-value .artdet__param-value'
    }]),
    description: x('#pane-details .tab-pane__container', 'ul', [{
      feature: 'li'
    }]),
    variants: {
      performance: x('#artdet__type .product-type__item.type--text .product-type__values .product-type__value', [{
        name: '.product-type__option-name',
        url: 'a@href'
      }]),
      color: x('#artdet__type .product-type__item.type--icon .product-type__values .product-type__value', [{
        name: '.product-type__option-name img@alt',
        url: 'a@href'
      }])
    }
  })((err, product) => {
    if (err) {
      if (retries > 0) {
        console.log(`Retrying ${url} (${maxRetries - retries + 1}/${maxRetries})`);
        setTimeout(() => retryRequest(url, retries - 1, callback), 2000);
      } else {
        console.error(`Error fetching product details from ${url}: ${err}`);
        callback(err, null);
      }
    } else {
      callback(null, product);
    }
  });
}

// Step 1: Scrape split klíma family URLs from the main page
x(mainUrl, ['.categories .category-card__pic-url@href'])((err, urls) => {
  if (err) {
    console.error(`Error fetching family URLs: ${err}`);
    return;
  }
  if (urls && Array.isArray(urls)) {
    familyUrls.push(...urls);
    console.log(`Family URLs: ${familyUrls}`);
  } else {
    console.error(`No family URLs found or invalid format: ${urls}`);
    return;
  }

  // Step 2: Scrape product URLs from each family page
  familyUrls.forEach(familyUrl => {
    x(familyUrl, ['.page_artlist_list .product .product_link_normal@href'])((err, urls) => {
      if (err) {
        console.error(`Error fetching product URLs from ${familyUrl}: ${err}`);
        return;
      }
      if (urls && Array.isArray(urls)) {
        productUrls.push(...urls);
        console.log(`Product URLs from ${familyUrl}: ${urls}`);
      } else {
        console.error(`No product URLs found for ${familyUrl}`);
      }

      // Step 3: Scrape product details from each product page
      productUrls.forEach(productUrl => {
        retryRequest(productUrl, maxRetries, (err, product) => {
          if (!err && product) {
            results.push(product);

            // Step 4: Save results to a JSON file
            if (results.length === productUrls.length) {
              fs.writeFile('./scrape-results.json', JSON.stringify(results, null, 2), 'utf-8', (err) => {
                if (err) {
                  console.error(`Error writing file: ${err}`);
                } else {
                  console.log('File is written successfully!');
                }
              });
            }
          }
        });
      });
    });
  });
});