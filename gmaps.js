const { chromium } = require('playwright');
const fs = require('fs');

// Function to mask phone numbers for privacy (replace last 4 digits with ****)
function maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) {
        return phoneNumber;
    }
    return phoneNumber.slice(0, -4) + '****';
}

const query = "Cafe Purwokerto";
const maxScrolls = 2;
const scrollPause = 2000; // in milliseconds

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1366, height: 768 }
    });
    const page = await context.newPage();

    try {
        // Open Google Maps
        await page.goto("https://www.google.com/maps");
        await page.waitForTimeout(5000);

        // Search input and enter query
        const searchBox = page.locator("#searchboxinput");
        await searchBox.fill(query);
        await searchBox.press("Enter");
        await page.waitForTimeout(5000);

        // Scroll the results feed
        const scrollable = page.locator('div[role="feed"]');
        for (let i = 0; i < maxScrolls; i++) {
            await page.evaluate((el) => {
                const element = document.querySelector('div[role="feed"]');
                if (element) {
                    element.scrollTop = element.scrollHeight;
                }
            });
            await page.waitForTimeout(scrollPause);
        }

        // Get all result cards
        const feedContainer = page.locator('div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[role="feed"]');
        const cards = feedContainer.locator("div.Nv2PK.THOPZb.CpccDe");
        const count = await cards.count();

        console.log(`Found ${count} cards`);

        const data = [];

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);

            let name = "";
            let rating = "";
            let reviews = "";
            let category = "";
            let services = "";
            let imageUrl = "";
            let detailUrl = "";
            let phoneNumber = "";

            try {
                // Name
                const nameEl = card.locator(".qBF1Pd");
                if (await nameEl.count() > 0) {
                    name = await nameEl.nth(0).innerText();
                }

                // Rating
                const ratingEl = card.locator('span[aria-label*="stars"]');
                if (await ratingEl.count() > 0) {
                    const ariaLabel = await ratingEl.nth(0).getAttribute("aria-label");
                    if (ariaLabel) {
                        const match = ariaLabel.match(/([\d.]+)/);
                        if (match) {
                            rating = match[1];
                        }
                    }
                }

                // Reviews
                const reviewsEl = card.locator(".UY7F9");
                if (await reviewsEl.count() > 0) {
                    const text = await reviewsEl.nth(0).innerText();
                    const match = text.match(/([\d,]+)/);
                    if (match) {
                        reviews = match[1].replace(/,/g, "");
                    }
                }

                // Category
                const categoryEl = card.locator('div.W4Efsd > span').first();
                if (categoryEl) {
                    try {
                        category = await categoryEl.innerText();
                    } catch (e) {
                        // Element might not exist
                    }
                }

                // Services
                const servicesEl = card.locator('div.ah5Ghc > span');
                const servicesCount = await servicesEl.count();
                if (servicesCount > 0) {
                    const servicesList = [];
                    for (let j = 0; j < servicesCount; j++) {
                        try {
                            const serviceText = await servicesEl.nth(j).innerText();
                            servicesList.push(serviceText);
                        } catch (e) {
                            // Skip if element is not accessible
                        }
                    }
                    services = servicesList.join(", ");
                }

                // Image URL
                const imageEl = card.locator('img[src*="googleusercontent"]');
                if (await imageEl.count() > 0) {
                    imageUrl = await imageEl.nth(0).getAttribute("src") || "";
                }

                // Detail URL
                const linkEl = card.locator('a.hfpxzc');
                if (await linkEl.count() > 0) {
                    detailUrl = await linkEl.nth(0).getAttribute("href") || "";
                }

                // Click card to get phone number
                try {
                    await card.click();
                    await page.waitForTimeout(3000); // Wait longer for detail panel to load
                    
                    // Wait for the detail panel to be visible
                    await page.waitForSelector('[role="main"]', { timeout: 5000 });
                    
                    // Try to find phone number using multiple selectors based on the HTML structure
                    const phoneSelectors = [
                        'button[data-item-id*="phone:tel:"] .Io6YTe.fontBodyMedium.kR99db.fdkmkc',
                        'button[aria-label*="Phone:"] .Io6YTe.fontBodyMedium.kR99db.fdkmkc',
                        '.RcCsl button[data-item-id*="phone:tel:"] .Io6YTe',
                        'button.CsEnBe[data-item-id*="phone:tel:"] .Io6YTe',
                        '.Io6YTe.fontBodyMedium.kR99db.fdkmkc'
                    ];
                    
                    let phoneFound = false;
                    for (const selector of phoneSelectors) {
                        try {
                            const phoneEl = page.locator(selector);
                            const count = await phoneEl.count();
                            
                            if (count > 0) {
                                for (let j = 0; j < count; j++) {
                                    const phoneText = await phoneEl.nth(j).innerText();
                                    // Check if it looks like a phone number (Indonesian format)
                                    if (/^[\+]?[0-9\-\(\)\s]{8,}$/.test(phoneText.trim()) && 
                                        (phoneText.includes('08') || phoneText.includes('+62'))) {
                                        phoneNumber = phoneText.trim();
                                        phoneFound = true;
                                        break;
                                    }
                                }
                                if (phoneFound) break;
                            }
                        } catch (selectorError) {
                            // Continue to next selector
                        }
                    }
                    
                    if (!phoneFound) {
                        console.log(`No phone found for ${name}`);
                    }
                    
                    // Go back to the list by clicking somewhere else or pressing escape
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(1500);
                    
                } catch (phoneError) {
                    console.log(`Could not get phone for ${name}:`, phoneError.message);
                }

                data.push({
                    Name: name,
                    Rating: rating,
                    Reviews: reviews,
                    Category: category,
                    Services: services,
                    Image: imageUrl,
                    "Detail URL": detailUrl,
                    Phone: phoneNumber || ""
                });

                console.log(`Processed ${i + 1}/${count}: ${name} - Phone: ${phoneNumber ? maskPhoneNumber(phoneNumber) : "No phone"}`);

            } catch (error) {
                console.log(`Error processing card ${i + 1}:`, error.message);
                // Still add the data even if there's an error, but without phone
                data.push({
                    Name: name,
                    Rating: rating,
                    Reviews: reviews,
                    Category: category,
                    Services: services,
                    Image: imageUrl,
                    "Detail URL": detailUrl,
                    Phone: ""
                });
            }
        }

        // Convert to CSV format
        const csvHeader = "Name,Rating,Reviews,Category,Services,Image,Detail URL,Phone\n";
        const csvRows = data.map(row => {
            return [
                `"${row.Name.replace(/"/g, '""')}"`,
                `"${row.Rating}"`,
                `"${row.Reviews}"`,
                `"${row.Category.replace(/"/g, '""')}"`,
                `"${row.Services.replace(/"/g, '""')}"`,
                `"${row.Image}"`,
                `"${row["Detail URL"]}"`,
                `"${row.Phone || ""}"`
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Save to CSV file
        fs.writeFileSync("maps_data_playwright.csv", csvContent, 'utf8');
        console.log(`Saved ${data.length} records to maps_data_playwright.csv`);

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
})();