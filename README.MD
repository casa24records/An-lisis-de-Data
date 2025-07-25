# DVISUAL Artist Analytics Dashboard

A clean, intuitive analytics dashboard for tracking artist performance across Spotify and YouTube platforms. Built specifically for artist collectives and designed to work seamlessly in GitHub Codespaces.

## Features

- **Individual Artist Analytics**: Dropdown selector for each artist in your collective
- **Multi-Platform Tracking**: Spotify (followers, popularity, monthly listeners) and YouTube (subscribers, views, video count)
- **Growth Visualization**: Interactive line charts showing trends over time
- **Time Range Filtering**: View all-time data or focus on 7, 30, or 90-day periods
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **No Installation Required**: Runs entirely in the browser using GitHub Codespaces

## Project Structure

```
DVISUAL/
├── index.html                 # Main dashboard interface
├── css/
│   └── styles.css            # Responsive styling
├── js/
│   ├── dashboard.js          # Main application logic
│   └── data-processor.js     # Data loading and processing
├── data/
│   ├── historical/           # Your existing JSON files (2025-04-26.json, etc.)
│   └── popularity_scores.csv # Optional CSV data
└── README.md                 # This file
```

## Setup Instructions

### 1. GitHub Codespaces Setup

1. Open your DVISUAL repository in GitHub
2. Click the green "Code" button
3. Select "Codespaces" tab
4. Click "Create codespace on main"

### 2. File Organization

Create the folder structure and add the provided files:

```bash
# Create directories
mkdir -p css js

# Add the files
# - Copy index.html to root
# - Copy styles.css to css/
# - Copy dashboard.js and data-processor.js to js/
```

### 3. Running the Dashboard

In your Codespace terminal:

```bash
# Option 1: Using Python (if available)
python -m http.server 8000

# Option 2: Using Node.js (if available)
npx http-server -p 8000

# Option 3: Using VS Code Live Server extension
# Right-click on index.html and select "Open with Live Server"
```

Then open the forwarded port (usually http://localhost:8000) in your browser.

## Data Format

The dashboard expects JSON files in `data/historical/` with this structure:

```json
{
  "date": "2025-04-26",
  "artists": [
    {
      "name": "Artist Name",
      "spotify": {
        "popularity_score": 7,
        "followers": 334,
        "monthly_listeners": "710",  // Optional
        "genres": [],
        "top_tracks": [...]
      },
      "youtube": {
        "subscribers": 621,
        "total_views": 28554,
        "video_count": 94
      }
    }
  ]
}
```

## Handling Missing Data

- Artists without YouTube data will show "N/A" in YouTube metrics
- Missing data points in time series are connected with dashed lines
- The dashboard gracefully handles:
  - Files that fail to load
  - Artists with incomplete data
  - Time periods with no data

## Customization

### Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --spotify-green: #1DB954;
    --youtube-red: #FF0000;
    --primary-color: #1a1a2e;
    /* ... other colors */
}
```

### Chart Settings

Modify chart configurations in `dashboard.js`:

```javascript
chartDefaults: {
    // Adjust animation, tooltips, scales, etc.
}
```

### Time Ranges

Add custom time range buttons in `index.html` and handle them in `dashboard.js`.

## Troubleshooting

### Data Not Loading

1. Check browser console for errors (F12)
2. Verify JSON files are in `data/historical/` folder
3. Ensure JSON files are valid (use JSONLint to validate)
4. Check file permissions in Codespaces

### Charts Not Displaying

1. Ensure Chart.js is loading from CDN
2. Check for JavaScript errors in console
3. Verify data format matches expected structure

### Performance Issues

1. Limit the number of historical files loaded
2. Implement data pagination for large datasets
3. Use the time range filters to reduce data points

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Optimized touch interactions

## Future Enhancements

- Export charts as images
- Add more metrics (engagement rate, growth rate)
- Implement data caching for faster loads
- Add comparison mode between artists
- Integration with real-time APIs

## License

This dashboard is built for internal use by your artist collective. Feel free to modify and extend as needed.

## Support

For issues or questions, check the browser console for error messages and ensure all files are properly placed in the project structure.
