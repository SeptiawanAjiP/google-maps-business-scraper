# Google Maps Scraper

A web scraper that extracts business data from Google Maps using Playwright. This tool searches for businesses and extracts information like name, rating, reviews, category, services, images, and phone numbers.

## Installation

1. **Install Node.js** from [nodejs.org](https://nodejs.org/)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

## How to Run

1. **Edit search query** in `gmaps.js` file (line 4):
   ```javascript
   const query = "Laundry Jakarta";  // Change to your desired search term
   ```

2. **Run the scraper**:
   ```bash
   npm start
   ```
   
   or
   
   ```bash
   node gmaps.js
   ```

3. **Wait for completion**. The browser will open automatically, perform the search, and extract data.

4. **Results will be saved** in `maps_data_playwright.csv` file

## Output

CSV file contains columns:
- Name (Business name)
- Rating (Star rating)
- Reviews (Number of reviews)
- Category (Business category)
- Services (Available services)
- Image (Image URL)
- Detail URL (Google Maps link)
- Phone (Phone number)

## Configuration

Edit variables at the top of `gmaps.js`:
```javascript
const query = "Laundry Jakarta";      // Search keyword
const maxScrolls = 2;                 // Number of scrolls for more results
const scrollPause = 2000;             // Pause between scrolls (milliseconds)
```