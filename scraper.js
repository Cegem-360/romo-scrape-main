const puppeteer = require('puppeteer');
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
})
.delay('10s', '12s')
.concurrency(1)
// .throttle(2, '1s')
.timeout(20000);

const mainUrl = 'https://www.cooperklima.hu/lakossagi-termekek/split-klimak';
const familyUrls = [];
const productUrls = [];
const results = [];

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
      (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        for (const productUrl of productUrls) {
          try {
            await page.goto(productUrl, { waitUntil: 'networkidle2' });

            // Click on the product image to load the PhotoSwipe gallery
            const imageSelector = '#main_image';
            const gallerySelector = '.pswp__img';

            const imageExists = await page.$(imageSelector);
            let gallery = [];
            if (imageExists) {
              await page.click(imageSelector);
              console.log(`Clicked on image on ${productUrl}`);
                // check if pswp is initialized using browser context
                const isPswpInitialized = await page.evaluate(() => {
                return typeof window.pswp !== 'undefined';
                });
                if (!isPswpInitialized) {
                console.error(`PhotoSwipe gallery not initialized on ${productUrl}`);
                continue;
                }

              // Wait for the PhotoSwipe gallery to load
              try {
                await page.waitForSelector(gallerySelector, { timeout: 13000 });

                // Scrape the image URLs from the PhotoSwipe gallery
                gallery = await page.evaluate(() => {
                  const images = [];
                  document.querySelectorAll('.pswp__img').forEach(img => {
                    images.push(img.src);
                  });
                  return images;
                });
              } catch (error) {
                console.error(`Error loading PhotoSwipe gallery on ${productUrl}: ${error}`);
              }
            } else {
              console.error(`Image selector not found on ${productUrl}`);
            }

            // Scrape other product details using Xray
            x(productUrl, '#page_artdet_content', {
              sku: '.artdet__sku-value',
              title: 'h1.artdet__name',
              image: '#main_image@src',
              gallery: gallery, // Use the scraped gallery images
              price: '#price_net_brutto_CH__unas__S09FTXLA2__unas__NG',
              mainAttributes: x('.spec-param-right .artdet__spec-param', [{
                name: '.artdet__spec-param-title .param-name',
                value: '.artdet__spec-param-value'
              }]),
              furtherAttributes: x('.data__items .data__item-param', [{
                name: '.data__item-title .param-name',
                value: '.data__item-value .artdet__param-value'
              }]),
              description: '#pane-details .container@html', // Get the original HTML content
              performance: x('#artdet__type .product-type__item.type--text .product-type__values .product-type__value', [{
                name: '.product-type__option-name'
              }]),
              color: x('#artdet__type .product-type__item.type--icon .product-type__values .product-type__value', [{
                name: '.product-type__option-name img@alt'
              }])
            })((err, product) => {
              if (err) {
                console.error(`Error fetching product details from ${productUrl}: ${err}`);
                return;
              }

              // Transform mainAttributes and furtherAttributes into key-value pairs
              const transformAttributes = (attributes) => {
                const transformed = {};
                attributes.forEach(attr => {
                  transformed[attr.name.trim()] = attr.value.trim();
                });
                return transformed;
              };

              const mainAttributes = transformAttributes(product.mainAttributes);
              const furtherAttributes = transformAttributes(product.furtherAttributes);

              // Merge mainAttributes and furtherAttributes into the product object
              const mergedAttributes = { ...mainAttributes, ...furtherAttributes };
              delete product.mainAttributes;
              delete product.furtherAttributes;
              Object.assign(product, mergedAttributes);

              // Extract names from performance and color arrays
              product.performance = product.performance.map(item => item.name.trim());
              product.color = product.color.map(item => item.name.trim());

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
            });
          } catch (error) {
            console.error(`Error fetching product details from ${productUrl}: ${error}`);
          }
        }

        await browser.close();
      })();
    });
  });
});