// Dashboard Module - Complete rewrite with dynamic section visibility
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
        data: null,
        platformAvailability: null
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
                    color: '#e0e0e0',
                    padding: 15,
                    font: {
                        family: "'Space Mono', monospace",
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                borderColor: '#00a651',
                borderWidth: 2,
                titleColor: '#ffffff',
                bodyColor: '#e0e0e0',
                padding: 12,
                displayColors: true,
                titleFont: {
                    family: "'VT323', monospace",
                    size: 16
                },
                bodyFont: {
                    family: "'Space Mono', monospace",
                    size: 12
                },
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
                    color: 'rgba(224, 224, 224, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#e0e0e0',
                    maxRotation: 45,
                    minRotation: 45,
                    font: {
                        family: "'Space Mono', monospace",
                        size: 10
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(224, 224, 224, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#e0e0e0',
                    font: {
                        family: "'Space Mono', monospace",
                        size: 10
                    },
                    callback: function(value) {
                        return DataProcessor.formatNumber(value);
                    }
                }
            }
        },
        // Handle null values properly
        spanGaps: true
    },

    // Initialize the dashboard
    async init() {
        try {
            // Show loading overlay
            this.showLoading(true);

            // Add animation styles
            this.injectAnimationStyles();

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

    // Inject custom animation styles
    injectAnimationStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            /* Smooth transitions for all interactive elements */
            .stat-box {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .stat-box:hover {
                transform: translateY(-2px);
                box-shadow: 6px 6px 0px #00a651 !important;
            }
            
            /* Consistent stat value styling */
            .stat-value {
                font-variant-numeric: tabular-nums;
                letter-spacing: -0.02em;
            }
            
            /* Fix alignment for all stat boxes */
            .stat-content {
                display: flex;
                align-items: center;
                height: 36px;
            }
            
            .stat-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
                flex-shrink: 0;
            }
            
            /* Section transitions */
            .fade-in {
                animation: fadeIn 0.4s ease-out;
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Hidden sections */
            .platform-section {
                transition: opacity 0.3s ease, max-height 0.3s ease;
            }
            
            .platform-section.hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    },

    // Format artist names with proper spacing
    formatArtistName(name) {
        if (name === 'Casa 24Beats') {
            return 'Casa 24 Beats';
        }
        return name;
    },

    // Populate artist dropdown
    populateArtistDropdown() {
        const select = document.getElementById('artistSelect');
        const artists = DataProcessor.getArtistNames();

        select.innerHTML = '';
        artists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = this.formatArtistName(artist);
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
        this.state.platformAvailability = this.state.data.platformAvailability;
        
        // Update UI visibility based on available data
        this.updateSectionVisibility();
        
        // Add fade-in animation
        const main = document.querySelector('.dashboard-main');
        main.classList.add('fade-in');
        setTimeout(() => main.classList.remove('fade-in'), 400);

        this.updateMetricsCards();
        this.updateCharts();
        this.updateTopTracks();
    },

    // Update section visibility based on platform availability
    updateSectionVisibility() {
        const availability = this.state.platformAvailability;
        
        // Update metric cards
        this.updateMetricCardVisibility();
        
        // Update chart visibility
        const followersChart = document.querySelector('[data-chart="followers"]');
        const youtubeChart = document.getElementById('youtubeChartCard');
        const popularityChart = document.querySelector('[data-chart="popularity"]');
        const monthlyListenersChart = document.getElementById('monthlyListenersCard');
        const topTracksSection = document.getElementById('topTracksSection');
        
        // Show/hide Spotify sections
        if (followersChart) {
            followersChart.style.display = availability.hasSpotify ? 'block' : 'none';
        }
        
        if (popularityChart) {
            popularityChart.style.display = availability.hasSpotify ? 'block' : 'none';
        }
        
        if (topTracksSection) {
            topTracksSection.style.display = availability.hasSpotify ? 'block' : 'none';
        }
        
        // Show/hide YouTube sections
        if (youtubeChart) {
            youtubeChart.style.display = availability.hasYouTube ? 'block' : 'none';
        }
        
        // Show/hide monthly listeners chart
        if (monthlyListenersChart) {
            monthlyListenersChart.style.display = availability.hasMonthlyListeners ? 'block' : 'none';
        }
        
        // Adjust grid layout based on visible items
        this.adjustGridLayout();
    },

    // Update metric card visibility
    updateMetricCardVisibility() {
        const availability = this.state.platformAvailability;
        const metricsGrid = document.getElementById('metricsGrid');
        
        // Clear existing cards
        metricsGrid.innerHTML = '';
        
        // Add Spotify followers card if available
        if (availability.hasSpotify) {
            metricsGrid.appendChild(this.createMetricCard(
                'Spotify Followers',
                'spotifyFollowers',
                '#1DB954'
            ));
        }
        
        // Add YouTube subscribers card if available
        if (availability.hasYouTube) {
            metricsGrid.appendChild(this.createMetricCard(
                'YouTube Subscribers',
                'youtubeSubscribers',
                '#FF0000'
            ));
            
            metricsGrid.appendChild(this.createMetricCard(
                'YouTube Total Views',
                'youtubeTotalViews',
                '#FF0000'
            ));
        }
        
        // Add popularity score if Spotify is available
        if (availability.hasSpotify) {
            metricsGrid.appendChild(this.createMetricCard(
                'Popularity Score',
                'popularityScore',
                '#9B59B6',
                true // isScore
            ));
        }
        
        // Add monthly listeners if available
        if (availability.hasMonthlyListeners) {
            metricsGrid.appendChild(this.createMetricCard(
                'Monthly Listeners',
                'monthlyListeners',
                '#1DB954'
            ));
        }
    },

    // Create a metric card element
    createMetricCard(title, metricId, dotColor, isScore = false) {
        const card = document.createElement('div');
        card.className = 'metric-card stat-box';
        
        card.innerHTML = `
            <h3>${title}</h3>
            <div class="stat-content">
                <div class="stat-dot" style="background: ${dotColor}"></div>
                <div class="metric-value stat-value">
                    <span id="${metricId}">--</span>
                    ${isScore ? '<span class="text-xl ml-1">/100</span>' : ''}
                </div>
            </div>
            <div class="metric-change" id="${metricId}Change">--</div>
        `;
        
        return card;
    },

    // Adjust grid layout based on visible items
    adjustGridLayout() {
        const chartsGrid = document.querySelector('.charts-grid');
        const visibleCharts = chartsGrid.querySelectorAll('.chart-card:not([style*="display: none"])');
        
        // Adjust grid columns based on number of visible charts
        if (visibleCharts.length === 1) {
            chartsGrid.style.gridTemplateColumns = '1fr';
        } else if (visibleCharts.length === 2) {
            chartsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            chartsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
        }
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

        const availability = this.state.platformAvailability;

        // Update Spotify Followers
        if (availability.hasSpotify) {
            const spotifyFollowers = document.getElementById('spotifyFollowers');
            const spotifyFollowersChange = document.getElementById('spotifyFollowersChange');
            
            if (spotifyFollowers) {
                spotifyFollowers.textContent = DataProcessor.formatNumber(data.latestMetrics.spotifyFollowers);
                
                const followerChange = DataProcessor.calculateChange(
                    data.latestMetrics.spotifyFollowers,
                    data.previousMetrics.spotifyFollowers
                );
                this.updateChangeElement(spotifyFollowersChange, followerChange);
            }
        }

        // Update YouTube metrics
        if (availability.hasYouTube) {
            const youtubeSubscribers = document.getElementById('youtubeSubscribers');
            const youtubeSubscribersChange = document.getElementById('youtubeSubscribersChange');
            
            if (youtubeSubscribers) {
                youtubeSubscribers.textContent = DataProcessor.formatNumber(data.latestMetrics.youtubeSubscribers);
                const subChange = DataProcessor.calculateChange(
                    data.latestMetrics.youtubeSubscribers,
                    data.previousMetrics.youtubeSubscribers
                );
                this.updateChangeElement(youtubeSubscribersChange, subChange);
            }

            const youtubeTotalViews = document.getElementById('youtubeTotalViews');
            const youtubeTotalViewsChange = document.getElementById('youtubeTotalViewsChange');
            
            if (youtubeTotalViews) {
                youtubeTotalViews.textContent = DataProcessor.formatNumber(data.latestMetrics.youtubeTotalViews);
                const viewChange = DataProcessor.calculateChange(
                    data.latestMetrics.youtubeTotalViews,
                    data.previousMetrics.youtubeTotalViews
                );
                this.updateChangeElement(youtubeTotalViewsChange, viewChange);
            }
        }

        // Update Popularity Score
        if (availability.hasSpotify) {
            const popularityScore = document.getElementById('popularityScore');
            const popularityScoreChange = document.getElementById('popularityScoreChange');
            
            if (popularityScore) {
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
            }
        }

        // Update Monthly Listeners
        if (availability.hasMonthlyListeners) {
            const monthlyListeners = document.getElementById('monthlyListeners');
            const monthlyListenersChange = document.getElementById('monthlyListenersChange');
            
            if (monthlyListeners) {
                monthlyListeners.textContent = DataProcessor.formatNumber(data.latestMetrics.monthlyListeners);
                
                const listenersChange = DataProcessor.calculateChange(
                    data.latestMetrics.monthlyListeners,
                    data.previousMetrics.monthlyListeners
                );
                this.updateChangeElement(monthlyListenersChange, listenersChange);
            }
        }
    },

    // Update change element
    updateChangeElement(element, changePercent) {
        if (!element) return;
        
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
        const availability = this.state.platformAvailability;
        
        if (availability.hasSpotify) {
            this.updateFollowersChart();
            this.updatePopularityChart();
        }
        
        if (availability.hasYouTube) {
            this.updateYouTubeChart();
        }
        
        if (availability.hasMonthlyListeners) {
            this.updateMonthlyListenersChart();
        }
    },

    // Update followers chart
    updateFollowersChart() {
        const canvas = document.getElementById('followersChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const data = this.state.data;

        if (this.charts.followers) {
            this.charts.followers.destroy();
        }

        // Filter out null values from the beginning
        const filteredData = this.filterChartData(data.dates, data.spotifyFollowers);

        this.charts.followers = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filteredData.dates,
                datasets: [{
                    label: 'Spotify Followers',
                    data: filteredData.values,
                    borderColor: '#1DB954',
                    backgroundColor: 'rgba(29, 185, 84, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#1DB954',
                    pointHoverBorderColor: '#1DB954',
                    pointHoverBorderWidth: 2,
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
        const canvas = document.getElementById('youtubeChart');

        if (!chartCard || !canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.youtube) {
            this.charts.youtube.destroy();
        }

        // Filter out null values from the beginning
        const subscribersData = this.filterChartData(data.dates, data.youtubeSubscribers);
        const viewsData = this.filterChartData(data.dates, data.youtubeTotalViews);

        this.charts.youtube = new Chart(ctx, {
            type: 'line',
            data: {
                labels: subscribersData.dates,
                datasets: [
                    {
                        label: 'Subscribers',
                        data: subscribersData.values,
                        borderColor: '#FF0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#FF0000',
                        pointHoverBorderColor: '#FF0000',
                        pointHoverBorderWidth: 2,
                        yAxisID: 'y',
                        spanGaps: true
                    },
                    {
                        label: 'Total Views',
                        data: viewsData.values,
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#FF6B6B',
                        pointHoverBorderColor: '#FF6B6B',
                        pointHoverBorderWidth: 2,
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
                            color: '#e0e0e0',
                            font: {
                                family: "'Space Mono', monospace",
                                size: 12
                            }
                        }
                    },
                    y1: {
                        ...this.chartDefaults.scales.y,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Total Views',
                            color: '#e0e0e0',
                            font: {
                                family: "'Space Mono', monospace",
                                size: 12
                            }
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
        const canvas = document.getElementById('popularityChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const data = this.state.data;

        if (this.charts.popularity) {
            this.charts.popularity.destroy();
        }

        // Filter out null values from the beginning
        const filteredData = this.filterChartData(data.dates, data.popularityScore);

        this.charts.popularity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filteredData.dates,
                datasets: [{
                    label: 'Popularity Score',
                    data: filteredData.values,
                    borderColor: '#9B59B6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#9B59B6',
                    pointHoverBorderColor: '#9B59B6',
                    pointHoverBorderWidth: 2,
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
        const canvas = document.getElementById('monthlyListenersChart');

        if (!chartCard || !canvas) return;

        chartCard.style.display = 'block';
        const ctx = canvas.getContext('2d');

        if (this.charts.monthlyListeners) {
            this.charts.monthlyListeners.destroy();
        }

        // Filter out null values from the beginning
        const filteredData = this.filterChartData(data.dates, data.monthlyListeners);

        this.charts.monthlyListeners = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filteredData.dates,
                datasets: [{
                    label: 'Monthly Listeners',
                    data: filteredData.values,
                    borderColor: '#3498DB',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3498DB',
                    pointHoverBorderColor: '#3498DB',
                    pointHoverBorderWidth: 2,
                    spanGaps: true
                }]
            },
            options: this.chartDefaults
        });
    },

    // Filter chart data to remove leading null values
    filterChartData(dates, values) {
        // Find first non-null index
        let firstValidIndex = -1;
        for (let i = 0; i < values.length; i++) {
            if (values[i] !== null && values[i] !== undefined) {
                firstValidIndex = i;
                break;
            }
        }

        // If no valid data, return empty arrays
        if (firstValidIndex === -1) {
            return { dates: [], values: [] };
        }

        // Return filtered data starting from first valid point
        return {
            dates: dates.slice(firstValidIndex),
            values: values.slice(firstValidIndex)
        };
    },

    // Update top tracks
    updateTopTracks() {
        const data = this.state.data;
        const tracksGrid = document.getElementById('tracksGrid');
        const tracksSection = document.getElementById('topTracksSection');

        if (!tracksSection || !this.state.platformAvailability.hasSpotify) return;

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
            // Update loading text to match main dashboard style
            const loadingText = overlay.querySelector('p');
            loadingText.innerHTML = `
                <div class="text-2xl font-bold mb-2" style="color: #00a651; font-family: 'VT323', monospace;">LOADING VIBES...</div>
                <div class="text-sm text-gray-400">Dusting off the vinyl records...</div>
            `;
        } else {
            overlay.classList.add('hidden');
        }
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
