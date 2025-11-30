/**
 * Currency Exchange Rates App
 * Production Version v1.0.1 - With Real Change Calculations
 * Features: Real-time data, change calculations, offline support, auto-refresh
 */

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.frankfurter.app',
    TARGET_CURRENCIES: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'NZD', 'SEK'],
    REFRESH_INTERVAL: 30000, // 30 seconds
    TIMEOUT: 10000, // 10 seconds
    VERSION: '1.0.1'
};

// Application State with enhanced change tracking
const AppState = {
    previousRates: {},
    currentRates: {},
    currentBaseCurrency: 'EUR',
    isOnline: true,
    lastSuccessfulUpdate: null,
    autoRefreshInterval: null,
    changeHistory: {} // Store change data for each currency
};

// DOM Elements
const Elements = {
    currencyForm: document.getElementById('currencyForm'),
    baseCurrencySelect: document.getElementById('baseCurrency'),
    fetchButton: document.getElementById('fetchButton'),
    loadingElement: document.getElementById('loading'),
    errorElement: document.getElementById('error'),
    errorMessageElement: document.getElementById('errorMessage'),
    resultsElement: document.getElementById('results'),
    resultsTitleElement: document.getElementById('resultsTitle'),
    lastUpdateElement: document.getElementById('lastUpdate'),
    autoUpdateElement: document.getElementById('autoUpdate'),
    ratesTableBody: document.getElementById('ratesTableBody'),
    pageLoadTimeElement: document.getElementById('pageLoadTime'),
    appVersionElement: document.getElementById('appVersion'),
    fallbackDataElement: document.getElementById('fallbackData')
};

// Cache busting - Force refresh
const CACHE_BUSTER = 'v1.0.2-' + Date.now();
console.log('🔄 Cache buster:', CACHE_BUSTER);

// Clear any existing caches on load
if ('caches' in window) {
    caches.keys().then(function(names) {
        for (let name of names) {
            caches.delete(name);
            console.log('🗑️ Deleted cache:', name);
        }
    });
}

/**
 * Initialize the application
 */
function initApp() {
    // Set version
    Elements.appVersionElement.textContent = `v${CONFIG.VERSION} • Production`;
    
    // Set page load time
    const now = new Date();
    Elements.pageLoadTimeElement.textContent = `Page loaded: ${formatDateTime(now)}`;
    
    // Set up event listeners
    Elements.currencyForm.addEventListener('submit', handleFormSubmit);
    Elements.baseCurrencySelect.addEventListener('change', handleCurrencyChange);
    
    // Set up online/offline detection
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Check initial online status
    checkOnlineStatus();
    
    // Load initial data
    fetchExchangeRates();
    
    // Start auto-refresh after first load
    setTimeout(() => {
        startAutoRefresh();
    }, CONFIG.REFRESH_INTERVAL);
    
    console.log('💰 Currency Exchange Rates App initialized');
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();
    fetchExchangeRates();
}

/**
 * Handle currency change
 */
function handleCurrencyChange() {
    AppState.currentBaseCurrency = Elements.baseCurrencySelect.value;
    // Reset change history when base currency changes
    AppState.changeHistory[AppState.currentBaseCurrency] = {};
    fetchExchangeRates();
}

/**
 * Handle online/offline status changes
 */
function handleOnlineStatus() {
    checkOnlineStatus();
    if (AppState.isOnline) {
        fetchExchangeRates();
    }
}

/**
 * Check and update online status
 */
function checkOnlineStatus() {
    AppState.isOnline = navigator.onLine;
    updateOnlineStatusIndicator();
}

/**
 * Update online status indicator
 */
function updateOnlineStatusIndicator() {
    const indicator = AppState.isOnline ? '🟢 Online' : '🔴 Offline';
    if (Elements.autoUpdateElement) {
        Elements.autoUpdateElement.textContent = `${indicator} • Auto-refresh every 30 seconds`;
    }
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh() {
    // Clear existing interval
    if (AppState.autoRefreshInterval) {
        clearInterval(AppState.autoRefreshInterval);
    }
    
    // Set new interval
    AppState.autoRefreshInterval = setInterval(() => {
        if (AppState.isOnline && !Elements.loadingElement.classList.contains('hidden')) {
            fetchExchangeRates();
        }
    }, CONFIG.REFRESH_INTERVAL);
    
    console.log('🔄 Auto-refresh started');
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates() {
    const baseCurrency = AppState.currentBaseCurrency;
    
    // Update UI state
    showLoading();
    hideError();
    hideResults();
    hideFallbackData();
    disableForm(true);

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        // Fetch data from API
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/latest?from=${baseCurrency}`,
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API_ERROR:${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate response
        if (!data.rates || typeof data.rates !== 'object') {
            throw new Error('INVALID_RESPONSE');
        }
        
        // Calculate changes before updating state
        const changes = calculateRealTimeChanges(data.rates, baseCurrency);
        
        // Update application state
        AppState.lastSuccessfulUpdate = new Date();
        AppState.isOnline = true;
        AppState.currentRates = data.rates;
        
        // Display results with calculated changes
        displayResults(data, baseCurrency, changes);
        
    } catch (error) {
        console.error('API fetch error:', error);
        handleFetchError(error);
    } finally {
        hideLoading();
        disableForm(false);
        updateOnlineStatusIndicator();
    }
}

/**
 * Calculate real-time changes compared to previous rates
 */
function calculateRealTimeChanges(currentRates, baseCurrency) {
    const changes = {};
    const previous = AppState.previousRates[baseCurrency];
    
    // If we have previous rates, calculate changes
    if (previous) {
        CONFIG.TARGET_CURRENCIES.forEach(currency => {
            if (currency !== baseCurrency && currentRates[currency] && previous[currency]) {
                const currentRate = currentRates[currency];
                const previousRate = previous[currency];
                const change = ((currentRate - previousRate) / previousRate) * 100;
                
                // Only show changes that are meaningful (more than 0.001%)
                if (Math.abs(change) > 0.001) {
                    changes[currency] = change;
                } else {
                    changes[currency] = 0;
                }
            }
        });
    }
    
    // Update previous rates for next calculation
    AppState.previousRates[baseCurrency] = { ...currentRates };
    
    return changes;
}

/**
 * Handle fetch errors
 */
function handleFetchError(error) {
    let errorMessage = 'An unexpected error occurred.';
    
    if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. Please check your internet connection.';
    } else if (error.message.startsWith('API_ERROR:')) {
        const statusCode = error.message.split(':')[1];
        errorMessage = `Service unavailable (Error ${statusCode}). Please try again later.`;
    } else if (error.message === 'INVALID_RESPONSE') {
        errorMessage = 'Invalid response from server. Please try again.';
    } else if (!AppState.isOnline) {
        errorMessage = 'No internet connection. Please check your network settings.';
    }
    
    showError(errorMessage);
    
    // Show fallback data if we have previous rates
    if (Object.keys(AppState.previousRates).length > 0) {
        showFallbackData();
    }
}

/**
 * Display results in the table with real changes
 */
function displayResults(data, baseCurrency, changes) {
    // Clear table
    Elements.ratesTableBody.innerHTML = '';
    
    // Update title
    Elements.resultsTitleElement.textContent = `Exchange Rates (Base: ${baseCurrency})`;
    
    // Update last update time
    const updateTime = new Date();
    Elements.lastUpdateElement.textContent = `Last update: ${formatDateTime(updateTime)}`;
    
    // Get current rates
    const currentRates = data.rates;
    
    // Filter and sort currencies
    const filteredRates = Object.entries(currentRates)
        .filter(([currency]) => CONFIG.TARGET_CURRENCIES.includes(currency) && currency !== baseCurrency)
        .sort(([a], [b]) => a.localeCompare(b));
    
    // Populate table with real change data
    filteredRates.forEach(([currency, rate]) => {
        const change = changes[currency] || 0;
        const row = createTableRow(currency, rate, change);
        Elements.ratesTableBody.appendChild(row);
    });
    
    // Show results
    showResults();
    
    // Log changes for debugging
    console.log('📈 Rate changes:', changes);
}

/**
 * Create a table row for a currency with enhanced change display
 */
function createTableRow(currency, rate, change) {
    const row = document.createElement('tr');
    
    // Currency cell
    const currencyCell = document.createElement('td');
    currencyCell.className = 'currency-code';
    currencyCell.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2em;">${getCurrencyFlag(currency)}</span>
            <div>
                <div style="font-weight: 700;">${currency}</div>
                <div style="font-size: 0.85em; color: #7f8c8d;">${getCurrencyName(currency)}</div>
            </div>
        </div>
    `;
    
    // Rate cell
    const rateCell = document.createElement('td');
    rateCell.className = 'exchange-rate';
    rateCell.textContent = rate.toFixed(4);
    
    // Change cell with enhanced visual indicators
    const changeCell = document.createElement('td');
    const changeInfo = getChangeDisplayInfo(change);
    changeCell.className = changeInfo.className;
    changeCell.innerHTML = changeInfo.html;
    changeCell.title = `Change: ${change > 0 ? '+' : ''}${change.toFixed(4)}%`;
    
    row.appendChild(currencyCell);
    row.appendChild(rateCell);
    row.appendChild(changeCell);
    
    return row;
}

/**
 * Get enhanced change display information
 */
function getChangeDisplayInfo(change) {
    const absChange = Math.abs(change);
    
    if (absChange < 0.001) {
        return {
            className: 'change-neutral',
            html: '<span style="opacity: 0.6;">→ Stable</span>'
        };
    }
    
    if (change > 0) {
        const intensity = Math.min(absChange / 2, 1); // Normalize for color intensity
        const color = `hsl(120, 70%, ${50 - (intensity * 20)}%)`; // Green scale
        return {
            className: 'change-positive',
            html: `↗ <span style="color: ${color}; font-weight: 800;">+${absChange.toFixed(2)}%</span>`
        };
    } else {
        const intensity = Math.min(absChange / 2, 1); // Normalize for color intensity
        const color = `hsl(0, 70%, ${50 - (intensity * 20)}%)`; // Red scale
        return {
            className: 'change-negative',
            html: `↘ <span style="color: ${color}; font-weight: 800;">-${absChange.toFixed(2)}%</span>`
        };
    }
}

/**
 * Get currency name
 */
function getCurrencyName(currencyCode) {
    const currencyNames = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'CHF': 'Swiss Franc',
        'CAD': 'Canadian Dollar',
        'AUD': 'Australian Dollar',
        'CNY': 'Chinese Yuan',
        'NZD': 'New Zealand Dollar',
        'SEK': 'Swedish Krona'
    };
    
    return currencyNames[currencyCode] || currencyCode;
}

/**
 * Get currency flag emoji
 */
function getCurrencyFlag(currencyCode) {
    const flagMap = {
        'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵',
        'CHF': '🇨🇭', 'CAD': '🇨🇦', 'AUD': '🇦🇺', 'CNY': '🇨🇳',
        'NZD': '🇳🇿', 'SEK': '🇸🇪'
    };
    
    return flagMap[currencyCode] || '💱';
}

/**
 * Format date and time
 */
function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// UI Control Functions
function showLoading() {
    Elements.loadingElement.classList.remove('hidden');
}

function hideLoading() {
    Elements.loadingElement.classList.add('hidden');
}

function showError(message) {
    Elements.errorMessageElement.textContent = message;
    Elements.errorElement.classList.remove('hidden');
}

function hideError() {
    Elements.errorElement.classList.add('hidden');
}

function showResults() {
    Elements.resultsElement.classList.remove('hidden');
}

function hideResults() {
    Elements.resultsElement.classList.add('hidden');
}

function showFallbackData() {
    Elements.fallbackDataElement.classList.remove('hidden');
}

function hideFallbackData() {
    Elements.fallbackDataElement.classList.add('hidden');
}

function disableForm(disabled) {
    Elements.baseCurrencySelect.disabled = disabled;
    Elements.fetchButton.disabled = disabled;
    Elements.fetchButton.textContent = disabled ? 'Loading...' : 'Get Exchange Rates';
}

/**
 * Load fallback sample data (for offline mode) with simulated changes
 */
function loadFallbackData() {
    const baseCurrency = AppState.currentBaseCurrency;
    const sampleData = {
        rates: {
            USD: 1.0854 + (Math.random() - 0.5) * 0.02,
            EUR: 1.0000,
            GBP: 0.8574 + (Math.random() - 0.5) * 0.01,
            JPY: 161.25 + (Math.random() - 0.5) * 0.5,
            CHF: 0.9456 + (Math.random() - 0.5) * 0.005,
            CAD: 1.4678 + (Math.random() - 0.5) * 0.01,
            AUD: 1.6523 + (Math.random() - 0.5) * 0.015,
            CNY: 7.8564 + (Math.random() - 0.5) * 0.05
        }
    };
    
    // Calculate changes for sample data
    const changes = calculateRealTimeChanges(sampleData.rates, baseCurrency);
    
    hideError();
    displayResults(sampleData, baseCurrency, changes);
    showFallbackData();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for global access
window.fetchExchangeRates = fetchExchangeRates;
window.loadFallbackData = loadFallbackData;