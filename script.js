/**
 * Currency Exchange Rates App
 * Production Version v1.0.4 - Fixed DOM Issues
 */

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.frankfurter.app',
    TARGET_CURRENCIES: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY'],
    REFRESH_INTERVAL: 30000,
    TIMEOUT: 10000,
    VERSION: '1.0.4'
};

// Application State
const AppState = {
    previousRates: {},
    currentRates: {},
    currentBaseCurrency: 'EUR',
    isOnline: true,
    lastSuccessfulUpdate: null,
    autoRefreshInterval: null,
    isFetching: false
};

// DOM Elements
let Elements = {};

/**
 * Initialize DOM Elements with debug info
 */
function initDOMElements() {
    console.log('🔍 Initializing DOM elements...');
    
    const elementSelectors = {
        currencyForm: 'currencyForm',
        baseCurrencySelect: 'baseCurrency',
        fetchButton: 'fetchButton',
        loadingElement: 'loading',
        errorElement: 'error',
        errorMessageElement: 'errorMessage',
        resultsElement: 'results',
        resultsTitleElement: 'resultsTitle',
        lastUpdateElement: 'lastUpdate',
        autoUpdateElement: 'autoUpdate',
        ratesTableBody: 'ratesTableBody',
        pageLoadTimeElement: 'pageLoadTime',
        appVersionElement: 'appVersion',
        fallbackDataElement: 'fallbackData'
    };

    // Initialize all elements
    Elements = {};
    for (const [key, id] of Object.entries(elementSelectors)) {
        Elements[key] = document.getElementById(id);
        console.log(`🔍 ${key}:`, Elements[key] ? '✅ Found' : '❌ NOT FOUND');
    }

    // Check for critical elements
    const criticalElements = ['fetchButton', 'baseCurrencySelect', 'ratesTableBody', 'resultsElement'];
    const missingCritical = criticalElements.filter(key => !Elements[key]);
    
    if (missingCritical.length > 0) {
        console.error('❌ Missing critical elements:', missingCritical);
        return false;
    }

    console.log('✅ DOM elements initialized successfully');
    return true;
}

/**
 * Initialize the application
 */
function initApp() {
    console.log('🚀 Initializing Currency Exchange App...');
    
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        // Initialize DOM elements
        if (!initDOMElements()) {
            console.error('❌ Failed to initialize DOM elements');
            // Don't show error immediately, try to work with what we have
            initializeMinimalApp();
            return;
        }
        
        // Set version
        if (Elements.appVersionElement) {
            Elements.appVersionElement.textContent = `v${CONFIG.VERSION} • Production`;
        }
        
        // Set page load time
        const now = new Date();
        if (Elements.pageLoadTimeElement) {
            Elements.pageLoadTimeElement.textContent = `Page loaded: ${formatDateTime(now)}`;
        }
        
        // Set up event listeners
        if (Elements.fetchButton) {
            Elements.fetchButton.addEventListener('click', handleFetchButtonClick);
        }
        
        if (Elements.baseCurrencySelect) {
            Elements.baseCurrencySelect.addEventListener('change', handleCurrencyChange);
        }
        
        // Prevent form submission
        if (Elements.currencyForm) {
            Elements.currencyForm.addEventListener('submit', function(e) {
                e.preventDefault();
            });
        }
        
        // Set up online/offline detection
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);
        
        // Check initial online status
        checkOnlineStatus();
        
        // Load initial data
        setTimeout(() => {
            fetchExchangeRates();
        }, 500);
        
        console.log('✅ Currency Exchange Rates App initialized successfully');
    }, 100);
}

/**
 * Minimal app initialization if some elements are missing
 */
function initializeMinimalApp() {
    console.log('🔄 Starting minimal app initialization...');
    
    // Try to get essential elements directly
    Elements.fetchButton = document.getElementById('fetchButton');
    Elements.baseCurrencySelect = document.getElementById('baseCurrency');
    Elements.ratesTableBody = document.getElementById('ratesTableBody');
    
    if (Elements.fetchButton && Elements.baseCurrencySelect) {
        console.log('✅ Found minimal required elements');
        
        Elements.fetchButton.addEventListener('click', handleFetchButtonClick);
        Elements.baseCurrencySelect.addEventListener('change', handleCurrencyChange);
        
        // Load initial data
        setTimeout(() => {
            fetchExchangeRates();
        }, 500);
    } else {
        console.error('❌ Cannot initialize app - missing essential elements');
        alert('Application failed to load. Please refresh the page.');
    }
}

/**
 * Handle fetch button click
 */
function handleFetchButtonClick(e) {
    e.preventDefault();
    console.log('🔄 Fetch button clicked');
    fetchExchangeRates();
}

/**
 * Handle currency change
 */
function handleCurrencyChange() {
    const newBaseCurrency = Elements.baseCurrencySelect.value;
    console.log('🔄 Currency changed to:', newBaseCurrency);
    
    AppState.currentBaseCurrency = newBaseCurrency;
    fetchExchangeRates();
}

/**
 * Handle online/offline status changes
 */
function handleOnlineStatus() {
    checkOnlineStatus();
    if (AppState.isOnline && !AppState.isFetching) {
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
    if (Elements.autoUpdateElement) {
        const indicator = AppState.isOnline ? '🟢 Online' : '🔴 Offline';
        Elements.autoUpdateElement.textContent = `${indicator} • Auto-refresh every 30 seconds`;
    }
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh() {
    if (AppState.autoRefreshInterval) {
        clearInterval(AppState.autoRefreshInterval);
    }
    
    AppState.autoRefreshInterval = setInterval(() => {
        if (AppState.isOnline && !AppState.isFetching) {
            console.log('🔄 Auto-refresh fetching rates...');
            fetchExchangeRates();
        }
    }, CONFIG.REFRESH_INTERVAL);
    
    console.log('🔄 Auto-refresh started');
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates() {
    if (AppState.isFetching) {
        console.log('⏳ Fetch already in progress, skipping...');
        return;
    }
    
    const baseCurrency = AppState.currentBaseCurrency;
    console.log('📡 Fetching rates for:', baseCurrency);
    
    AppState.isFetching = true;
    showLoading();
    hideError();
    hideResults();
    hideFallbackData();
    disableForm(true);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/latest?from=${baseCurrency}`,
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API_ERROR:${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.rates || typeof data.rates !== 'object') {
            throw new Error('INVALID_RESPONSE');
        }
        
        console.log('✅ API response received for:', baseCurrency);
        
        const changes = calculateRealTimeChanges(data.rates, baseCurrency);
        
        AppState.lastSuccessfulUpdate = new Date();
        AppState.isOnline = true;
        AppState.currentRates = data.rates;
        
        displayResults(data, baseCurrency, changes);
        
        if (!AppState.autoRefreshInterval) {
            startAutoRefresh();
        }
        
    } catch (error) {
        console.error('❌ API fetch error:', error);
        handleFetchError(error);
    } finally {
        AppState.isFetching = false;
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
    
    if (previous) {
        CONFIG.TARGET_CURRENCIES.forEach(currency => {
            if (currency !== baseCurrency && currentRates[currency] && previous[currency]) {
                const currentRate = currentRates[currency];
                const previousRate = previous[currency];
                const change = ((currentRate - previousRate) / previousRate) * 100;
                
                if (Math.abs(change) > 0.001) {
                    changes[currency] = change;
                } else {
                    changes[currency] = 0;
                }
            }
        });
    }
    
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
    
    if (Object.keys(AppState.previousRates).length > 0) {
        showFallbackData();
    }
}

/**
 * Display results in the table with real changes
 */
function displayResults(data, baseCurrency, changes) {
    if (!Elements.ratesTableBody) {
        console.error('❌ ratesTableBody not found');
        return;
    }
    
    Elements.ratesTableBody.innerHTML = '';
    
    if (Elements.resultsTitleElement) {
        Elements.resultsTitleElement.textContent = `Exchange Rates (Base: ${baseCurrency})`;
    }
    
    if (Elements.lastUpdateElement) {
        const updateTime = new Date();
        Elements.lastUpdateElement.textContent = `Last update: ${formatDateTime(updateTime)}`;
    }
    
    const currentRates = data.rates;
    const filteredRates = Object.entries(currentRates)
        .filter(([currency]) => CONFIG.TARGET_CURRENCIES.includes(currency) && currency !== baseCurrency)
        .sort(([a], [b]) => a.localeCompare(b));
    
    filteredRates.forEach(([currency, rate]) => {
        const change = changes[currency] || 0;
        const row = createTableRow(currency, rate, change);
        Elements.ratesTableBody.appendChild(row);
    });
    
    showResults();
    console.log('✅ Results displayed for:', baseCurrency);
}

/**
 * Create a table row for a currency with enhanced change display
 */
function createTableRow(currency, rate, change) {
    const row = document.createElement('tr');
    
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
    
    const rateCell = document.createElement('td');
    rateCell.className = 'exchange-rate';
    rateCell.textContent = rate.toFixed(4);
    
    const changeCell = document.createElement('td');
    const changeInfo = getChangeDisplayInfo(change);
    changeCell.className = changeInfo.className;
    changeCell.innerHTML = changeInfo.html;
    
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
        return {
            className: 'change-positive',
            html: `↗ +${absChange.toFixed(2)}%`
        };
    } else {
        return {
            className: 'change-negative',
            html: `↘ -${absChange.toFixed(2)}%`
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
        'CNY': 'Chinese Yuan'
    };
    
    return currencyNames[currencyCode] || currencyCode;
}

/**
 * Get currency flag emoji
 */
function getCurrencyFlag(currencyCode) {
    const flagMap = {
        'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵',
        'CHF': '🇨🇭', 'CAD': '🇨🇦', 'AUD': '🇦🇺', 'CNY': '🇨🇳'
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
    if (Elements.loadingElement) {
        Elements.loadingElement.classList.remove('hidden');
    }
}

function hideLoading() {
    if (Elements.loadingElement) {
        Elements.loadingElement.classList.add('hidden');
    }
}

function showError(message) {
    if (Elements.errorMessageElement && Elements.errorElement) {
        Elements.errorMessageElement.textContent = message;
        Elements.errorElement.classList.remove('hidden');
    }
}

function hideError() {
    if (Elements.errorElement) {
        Elements.errorElement.classList.add('hidden');
    }
}

function showResults() {
    if (Elements.resultsElement) {
        Elements.resultsElement.classList.remove('hidden');
    }
}

function hideResults() {
    if (Elements.resultsElement) {
        Elements.resultsElement.classList.add('hidden');
    }
}

function showFallbackData() {
    if (Elements.fallbackDataElement) {
        Elements.fallbackDataElement.classList.remove('hidden');
    }
}

function hideFallbackData() {
    if (Elements.fallbackDataElement) {
        Elements.fallbackDataElement.classList.add('hidden');
    }
}

function disableForm(disabled) {
    if (Elements.baseCurrencySelect && Elements.fetchButton) {
        Elements.baseCurrencySelect.disabled = disabled;
        Elements.fetchButton.disabled = disabled;
        Elements.fetchButton.textContent = disabled ? 'Loading...' : 'Get Exchange Rates';
    }
}

/**
 * Load fallback sample data
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
    
    const changes = calculateRealTimeChanges(sampleData.rates, baseCurrency);
    
    hideError();
    displayResults(sampleData, baseCurrency, changes);
    showFallbackData();
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for global access
window.fetchExchangeRates = fetchExchangeRates;
window.loadFallbackData = loadFallbackData;