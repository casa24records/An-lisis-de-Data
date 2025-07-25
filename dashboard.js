// Dashboard Module
const Dashboard = {
    // Chart instances
    charts: {
        followers: null,
        youtube: null,
        popularity: null,
        monthlyListeners: null
    },

    // Current state
    state: {
        currentArtist: null,
        currentTimeRange: 'all',
        data: null
    },

    // Chart.js default configuration
    chartDefaults: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                labels: {
                    color: '#b4b4b4',
                    padding: 15,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                borderColor: '#2a2a3e',
                borderWidth: 1,
                titleColor: '#ffffff',
                bodyColor: '#b4b4b4',
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += DataProcessor.formatNumber(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d'
                    }
                },
                grid: {
                    color: 'rgba(42, 42, 62, 0.5)',
                    drawBorder: false
                },
                ticks: {
                    color: '#b4b4b4',
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(42, 42, 62, 0.5)',
                    drawBorder: false
                },
                ticks: {
                    color: '#b4b4b4',
                    callback: function(value) {
                        return DataProcessor.formatNumber(value);
                    }
                }
            }
        }
    },

    // Initialize the dashboard
    async init() {
        try {
            // Show loading overlay
            this.showLoading(true);

            // Load data
            await DataProcessor.loadHistoricalData();
            await DataProcessor.loadCSVData();

            // Populate artist dropdown
            this.populateArtistDropdown();

            // Set up event listeners
            this.setupEventListeners();

            // Update last updated time
            this.updateLastUpdated();

            // Hide loading overlay
            this.showLoading(false);

            // Select first artist by default
            const artists = DataProcessor.getArtistNames();
            if (artists.length > 0) {
                document.getElementById('artistSelect').value = artists[0];
                this.selectArtist(artists[0]);
            }
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showLoading(false);
            alert('Failed to load dashboard data. Please refresh the page.');
        }
    },

    // Populate artist dropdown
    populateArtistDropdown() {
        const select = document.getElementById('artistSelect');
        const artists = DataProcessor.getArtistNames();

        select.innerHTML = '';
        artists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = artist;
            select.appendChild(option);
        });
    },

    // Set up event listeners
    setupEventListeners() {
        // Artist selection
        document.getElementById('artistSelect').addEventListener('change', (e) => {
            this.selectArtist(e.target.value);
        });

        // Time range buttons
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.selectTimeRange(range);
            });
        });
    },

    // Select artist
    selectArtist(artistName) {
        if (!artistName) return;

        this.state.currentArtist = artistName;
        this.state.data = DataProcessor.processArtistData(artistName, this.state.currentTimeRange);
        
        this.updateMetricsCards();
        this.updateCharts();
        this.updateTopTracks();
    },

    // Select time range
    selectTimeRange(range) {
        this.state.currentTimeRange = range;

        // Update button states
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-range="${range}"]`).classList.add('active');

        // Refresh data
        if (this.state.currentArtist) {
            this.selectArtist(this.state.currentArtist);
        }
    },

    // Update metrics cards
    updateMetricsCards() {
        const data = this.state.data;
        if (!data) return;

        // Spotify Followers
        const spotifyFollowers = document.getElementById('spotifyFollowers');
        const spotifyFollowersChange = document.getElementById('spotifyFollowersChange');
        spotifyFollowers.textContent = DataProcessor.formatNumber(data.latestMetrics.spotifyFollowers);
        
        const followerChange = DataProcessor.calculateChange(
            data.latestMetrics.spotifyFollowers,
            data.previousMetrics.spotifyFollowers
        );
        this.updateChangeElement(spotifyFollowersChange, followerChange);

        // YouTube Subscribers
        const youtubeSubscribers = document.getElementById('youtubeSubscribers');
        const youtubeSubscribersChange = document.getElementById('youtubeSubscribersChange');
        
        if (data.hasYouTubeData) {
            youtubeSubscribers.textContent = DataProcessor.formatNumber(data.latestMetrics.youtubeSubscribers);
            const subChange = DataProcessor.calculateChange(
                data.latestMetrics.youtubeSubscribers,
                data.previousMetrics.youtubeSubscribers
            );
            this.updateChangeElement(youtubeSubscribersChange, subChange);
        } else {
            youtubeSubscribers.textContent = 'N/A';
            youtubeSubscribersChange.textContent = 'No data';
            youtubeSubscribersChange.className = 'metric-change neutral';
        }

        // YouTube Total Views
        const youtubeTotalViews = document.getElementById('youtubeTotalViews');
        const youtubeTotalViewsChange = document.getElementById('youtubeTotalViewsChange');
        
        if (data.hasYouTubeData) {
            youtubeTotalViews.textContent = DataProcessor.formatNumber(data.latestMetrics.youtubeTotalViews);
            const viewChange = DataProcessor.calculateChange(
                data.latestMetrics.youtubeTotalViews,
                data.previousMetrics.youtubeTotalViews
            );
            this.updateChangeElement(youtubeTotalViewsChange, viewChange);
        } else {
            youtubeTotalViews.textContent = 'N/A';
            youtubeTotalViewsChange.textContent = 'No data';
            youtubeTotalViewsChange.className = 'metric-change neutral';
        }

        // Popularity Score
        const popularityScore = document.getElementById('popularityScore');
        const popularityScoreChange = document.getElementById('popularityScoreChange');
        popularityScore.textContent = data.latestMetrics.popularityScore;
        
        const popChange = data.latestMetrics.popularityScore - data.previousMetrics.popularityScore;
        if (popChange > 0) {
            popularityScoreChange.textContent = `+${popChange} pts`;
            popularityScoreChange.className = 'metric-change positive';
        } else if (popChange < 0) {
            popularityScoreChange.textContent = `${popChange} pts`;
            popularityScoreChange.className = 'metric-change negative';
        } else {
            popularityScoreChange.textContent = 'No change';
            popularityScoreChange.className = 'metric-change neutral';
        }
    },

    // Update change element
    updateChangeElement(element, changePercent) {
        if (changePercent > 0) {
            element.textContent = `+${changePercent}% vs 7 days ago`;
            element.className = 'metric-change positive';
        } else if (changePercent < 0) {
            element.textContent = `${changePercent}% vs 7 days ago`;
            element.className = 'metric-change negative';
        } else {
            element.textContent = 'No change';
            element.className = 'metric-change neutral';
        }
    },

    // Update all charts
    updateCharts() {
        this.updateFollowersChart();
        this.updateYouTubeChart();
        this.updatePopularityChart();
        this.updateMonthlyListenersChart();
    },

    // Update followers chart
    updateFollowersChart() {
        const ctx = document.getElementById('followersChart').getContext('2d');
        const data = this.state.data;

        if (this.charts.followers) {
            this.charts.followers.destroy();
        }

        this.charts.followers = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Spotify Followers',
                    data: data.spotifyFollowers,
                    borderColor: '#1DB954',
                    backgroundColor: 'rgba(29, 185, 84, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#1DB954',
                    spanGaps: true
                }]
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: false
                    }
                }
            }
        });
    },

    // Update YouTube chart
    updateYouTubeChart() {
        const data = this.state.data;
        const chartCard = document.getElementById('youtubeChartCard');
        const noDataMsg = document.getElementById('youtubeNoData');
        const canvas = document.getElementById('youtubeChart');

        if (!data.hasYouTubeData) {
            canvas.style.display = 'none';
            noDataMsg.style.display = 'block';
            if (this.charts.youtube) {
                this.charts.youtube.destroy();
                this.charts.youtube = null;
            }
            return;
        }

        canvas.style.display = 'block';
        noDataMsg.style.display = 'none';

        const ctx = canvas.getContext('2d');

        if (this.charts.youtube) {
            this.charts.youtube.destroy();
        }

        this.charts.youtube = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [
                    {
                        label: 'Subscribers',
                        data: data.youtubeSubscribers,
                        borderColor: '#FF0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#FF0000',
                        yAxisID: 'y',
                        spanGaps: true
                    },
                    {
                        label: 'Total Views',
                        data: data.youtubeTotalViews,
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#FF6B6B',
                        yAxisID: 'y1',
                        spanGaps: true
                    }
                ]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    ...this.chartDefaults.scales,
                    y: {
                        ...this.chartDefaults.scales.y,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Subscribers',
                            color: '#b4b4b4'
                        }
                    },
                    y1: {
                        ...this.chartDefaults.scales.y,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Total Views',
                            color: '#b4b4b4'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },

    // Update popularity chart
    updatePopularityChart() {
        const ctx = document.getElementById('popularityChart').getContext('2d');
        const data = this.state.data;

        if (this.charts.popularity) {
            this.charts.popularity.destroy();
        }

        this.charts.popularity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Popularity Score',
                    data: data.popularityScore,
                    borderColor: '#9B59B6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#9B59B6',
                    spanGaps: true
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    ...this.chartDefaults.scales,
                    y: {
                        ...this.chartDefaults.scales.y,
                        max: 100,
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            callback: function(value) {
                                return value;
                            }
                        }
                    }
                }
            }
        });
    },

    // Update monthly listeners chart
    updateMonthlyListenersChart() {
        const data = this.state.data;
        const chartCard = document.getElementById('monthlyListenersCard');

        if (!data.hasMonthlyListeners) {
            chartCard.style.display = 'none';
            if (this.charts.monthlyListeners) {
                this.charts.monthlyListeners.destroy();
                this.charts.monthlyListeners = null;
            }
            return;
        }

        chartCard.style.display = 'block';
        const ctx = document.getElementById('monthlyListenersChart').getContext('2d');

        if (this.charts.monthlyListeners) {
            this.charts.monthlyListeners.destroy();
        }

        this.charts.monthlyListeners = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Monthly Listeners',
                    data: data.monthlyListeners,
                    borderColor: '#3498DB',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3498DB',
                    spanGaps: true
                }]
            },
            options: this.chartDefaults
        });
    },

    // Update top tracks
    updateTopTracks() {
        const data = this.state.data;
        const tracksGrid = document.getElementById('tracksGrid');
        const tracksSection = document.getElementById('topTracksSection');

        if (!data.topTracks || data.topTracks.length === 0) {
            tracksSection.style.display = 'none';
            return;
        }

        tracksSection.style.display = 'block';
        tracksGrid.innerHTML = '';

        data.topTracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.innerHTML = `
                <span class="track-number">${index + 1}</span>
                <span class="track-name">${track.name}</span>
                <span class="track-popularity">${track.popularity}</span>
            `;
            tracksGrid.appendChild(trackElement);
        });
    },

    // Update last updated time
    updateLastUpdated() {
        const lastUpdated = document.getElementById('lastUpdated');
        const latestDate = DataProcessor.getLatestUpdateDate();
        
        if (latestDate) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            });
            lastUpdated.textContent = formatter.format(latestDate);
        } else {
            lastUpdated.textContent = 'Unknown';
        }
    },

    // Show/hide loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
