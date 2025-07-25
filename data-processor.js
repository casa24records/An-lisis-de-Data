// Data Processor Module
const DataProcessor = {
    // Cache for loaded data
    cache: {
        jsonFiles: [],
        csvData: null,
        processedData: {}
    },

    // Load manifest file if available
    async loadManifest() {
        try {
            const response = await fetch('data/historical/manifest.json');
            if (response.ok) {
                const manifest = await response.json();
                return manifest.files.map(f => `data/historical/${f}`);
            }
        } catch (error) {
            console.warn('Manifest not found, falling back to date range method');
        }
        return null;
    },

    // Load all JSON files from the historical folder
    async loadHistoricalData() {
        try {
            // Try to load from manifest first
            const manifestFiles = await this.loadManifest();
            
            let files;
            if (manifestFiles) {
                console.log('Loading files from manifest...');
                files = manifestFiles;
            } else {
                // Fallback to date range method
                console.log('No manifest found, generating file list...');
                const startDate = new Date('2025-04-26');
                const endDate = new Date();
                files = [];

                // Generate file paths for each day
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    files.push(`data/historical/${dateStr}.json`);
                }
            }

            // Load files in parallel
            const promises = files.map(async (file) => {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const data = await response.json();
                        return data;
                    }
                } catch (error) {
                    console.warn(`Failed to load ${file}:`, error);
                }
                return null;
            });

            const results = await Promise.all(promises);
            this.cache.jsonFiles = results.filter(data => data !== null);
            
            return this.cache.jsonFiles;
        } catch (error) {
            console.error('Error loading historical data:', error);
            return [];
        }
    },

    // Load CSV data if available
    async loadCSVData() {
        try {
            const response = await fetch('data/popularity_scores.csv');
            if (response.ok) {
                const text = await response.text();
                this.cache.csvData = this.parseCSV(text);
            }
        } catch (error) {
            console.warn('CSV file not found, using JSON data only');
        }
    },

    // Simple CSV parser
    parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index];
            });
            data.push(entry);
        }

        return data;
    },

    // Get unique artist names
    getArtistNames() {
        const artistSet = new Set();
        this.cache.jsonFiles.forEach(file => {
            if (file && file.artists) {
                file.artists.forEach(artist => {
                    artistSet.add(artist.name);
                });
            }
        });
        return Array.from(artistSet).sort();
    },

    // Process data for a specific artist
    processArtistData(artistName, timeRange = 'all') {
        const data = {
            dates: [],
            spotifyFollowers: [],
            youtubeSubscribers: [],
            youtubeTotalViews: [],
            youtubeVideoCount: [],
            popularityScore: [],
            monthlyListeners: [],
            hasYouTubeData: false,
            hasMonthlyListeners: false,
            latestMetrics: {},
            previousMetrics: {},
            topTracks: []
        };

        // Filter data by time range
        const now = new Date();
        const cutoffDate = new Date();
        
        switch(timeRange) {
            case '7':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            default:
                cutoffDate.setFullYear(2000); // Include all data
        }

        // Process each file
        this.cache.jsonFiles.forEach(file => {
            if (!file || !file.artists) return;

            const fileDate = new Date(file.date);
            if (fileDate < cutoffDate) return;

            const artist = file.artists.find(a => a.name === artistName);
            if (!artist) return;

            data.dates.push(file.date);

            // Spotify data
            if (artist.spotify) {
                data.spotifyFollowers.push(artist.spotify.followers || 0);
                data.popularityScore.push(artist.spotify.popularity_score || 0);
                
                if (artist.spotify.monthly_listeners !== undefined) {
                    data.monthlyListeners.push(parseInt(artist.spotify.monthly_listeners) || 0);
                    data.hasMonthlyListeners = true;
                }
            } else {
                data.spotifyFollowers.push(null);
                data.popularityScore.push(null);
                data.monthlyListeners.push(null);
            }

            // YouTube data
            if (artist.youtube) {
                const subs = artist.youtube.subscribers || 0;
                const views = artist.youtube.total_views || 0;
                const videos = artist.youtube.video_count || 0;

                data.youtubeSubscribers.push(subs);
                data.youtubeTotalViews.push(views);
                data.youtubeVideoCount.push(videos);

                if (subs > 0 || views > 0) {
                    data.hasYouTubeData = true;
                }
            } else {
                data.youtubeSubscribers.push(null);
                data.youtubeTotalViews.push(null);
                data.youtubeVideoCount.push(null);
            }
        });

        // Get latest metrics and calculate changes
        if (data.dates.length > 0) {
            const latestIndex = data.dates.length - 1;
            const previousIndex = Math.max(0, latestIndex - 7); // Compare with 7 days ago

            data.latestMetrics = {
                spotifyFollowers: data.spotifyFollowers[latestIndex] || 0,
                youtubeSubscribers: data.youtubeSubscribers[latestIndex] || 0,
                youtubeTotalViews: data.youtubeTotalViews[latestIndex] || 0,
                popularityScore: data.popularityScore[latestIndex] || 0,
                monthlyListeners: data.monthlyListeners[latestIndex] || 0
            };

            data.previousMetrics = {
                spotifyFollowers: data.spotifyFollowers[previousIndex] || 0,
                youtubeSubscribers: data.youtubeSubscribers[previousIndex] || 0,
                youtubeTotalViews: data.youtubeTotalViews[previousIndex] || 0,
                popularityScore: data.popularityScore[previousIndex] || 0,
                monthlyListeners: data.monthlyListeners[previousIndex] || 0
            };

            // Get latest top tracks
            const latestFile = this.cache.jsonFiles.find(f => f.date === data.dates[latestIndex]);
            if (latestFile) {
                const artist = latestFile.artists.find(a => a.name === artistName);
                if (artist && artist.spotify && artist.spotify.top_tracks) {
                    data.topTracks = artist.spotify.top_tracks.slice(0, 5);
                }
            }
        }

        return data;
    },

    // Calculate percentage change
    calculateChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
    },

    // Format numbers with K/M suffixes
    formatNumber(num) {
        if (num === null || num === undefined) return '--';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    // Get the latest update date
    getLatestUpdateDate() {
        if (this.cache.jsonFiles.length === 0) return null;
        
        const dates = this.cache.jsonFiles
            .filter(f => f && f.date)
            .map(f => new Date(f.date));
        
        return new Date(Math.max(...dates));
    }
};
