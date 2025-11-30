// Frankfurter.app API - Free and no API key required
const API_BASE_URL = 'https://api.frankfurter.app';

// Target currencies
const TARGET_CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CAD', 'AUD', 'CHF'];

// Store previous rates for change calculation
let previousRates = {};

// DOM elements
const currencyForm = document.getElementById('currencyForm');
const baseCurrencySelect = document.getElementById('baseCurrency');
const fetchButton = document.getElementById('fetchButton');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const errorMessageElement = document.getElementById('errorMessage');
const resultsElement = document.getElementById('results');
const resultsTitleElement = document.getElementById('resultsTitle');
const lastUpdateElement = document.getElementById('lastUpdate');
const ratesTableBody = document.getElementById('ratesTableBody');
const pageLoadTimeElement = document.getElementById('pageLoadTime');

// When page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show page load time
    const now = new Date();
    pageLoadTimeElement.textContent = `Page loaded at: ${now.toLocaleString('en-US')}`;
    
    // Automatically fetch data
    fetchExchangeRates();
});

// Listen for form submission
currencyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    fetchExchangeRates();
});

// Fetch exchange rates
async function fetchExchangeRates() {
    const baseCurrency = baseCurrencySelect.value;
    
    // Update UI state
    showLoading();
    hideError();
    hideResults();
    disableForm(true);

    try {
        // Fetch current data from API
        const response = await fetch(`${API_BASE_URL}/latest?from=${baseCurrency}`);
        
        if (!response.ok) {
            throw new Error(`API error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display results
        displayResults(data, baseCurrency);
        
    } catch (error) {
        console.error('API error:', error);
        showError(getErrorMessage(error));
    } finally {
        hideLoading();
        disableForm(false);
    }
}

// Handle error messages
function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'No internet connection or API is unreachable. Please check your connection.';
    } else if (error.message.includes('API error')) {
        return 'API is temporarily unavailable. Please try again later.';
    } else {
        return 'An unexpected error occurred. Please refresh the page.';
    }
}

// Show loading state
function showLoading() {
    loadingElement.classList.remove('hidden');
}

// Hide loading state
function hideLoading() {
    loadingElement.classList.add('hidden');
}

// Show error message
function showError(message) {
    errorMessageElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorElement.classList.add('hidden');
}

// Display results
function displayResults(data, baseCurrency) {
    // Clear table
    ratesTableBody.innerHTML = '';
    
    // Update title
    resultsTitleElement.textContent = `Exchange Rates Based on ${baseCurrency}`;
    
    // Show last update time
    const updateTime = new Date().toLocaleString('en-US');
    lastUpdateElement.textContent = `Last update: ${updateTime}`;
    
    // Get current rates
    const currentRates = data.rates;
    
    // Process filtered currencies
    const filteredRates = Object.entries(currentRates)
        .filter(([currency]) => TARGET_CURRENCIES.includes(currency) && currency !== baseCurrency)
        .sort(([a], [b]) => a.localeCompare(b));
    
    // Calculate change data
    const changes = calculateChanges(currentRates, baseCurrency);
    
    // Populate table
    filteredRates.forEach(([currency, rate]) => {
        const row = document.createElement('tr');
        
        // Currency cell
        const currencyCell = document.createElement('td');
        currencyCell.className = 'currency-code';
        currencyCell.textContent = `${getCurrencyName(currency)} (${currency})`;
        
        // Rate cell
        const rateCell = document.createElement('td');
        rateCell.className = 'exchange-rate';
        rateCell.textContent = rate.toFixed(4);
        
        // Change cell
        const changeCell = document.createElement('td');
        const change = changes[currency];
        changeCell.className = getChangeClass(change);
        changeCell.textContent = formatChange(change);
        
        row.appendChild(currencyCell);
        row.appendChild(rateCell);
        row.appendChild(changeCell);
        ratesTableBody.appendChild(row);
    });
    
    // Update previous rates
    previousRates[baseCurrency] = currentRates;
    
    // Show results
    resultsElement.classList.remove('hidden');
}

// Calculate percentage change
function calculateChanges(currentRates, baseCurrency) {
    const changes = {};
    const previous = previousRates[baseCurrency];
    
    if (!previous) return changes;
    
    TARGET_CURRENCIES.forEach(currency => {
        if (currency !== baseCurrency && currentRates[currency] && previous[currency]) {
            const current = currentRates[currency];
            const prev = previous[currency];
            const change = ((current - prev) / prev) * 100;
            changes[currency] = change;
        }
    });
    
    return changes;
}

// Determine change class
function getChangeClass(change) {
    if (change > 0) return 'change-positive';
    if (change < 0) return 'change-negative';
    return 'change-neutral';
}

// Format change
function formatChange(change) {
    if (change === undefined) return '-';
    return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
}

// Hide results
function hideResults() {
    resultsElement.classList.add('hidden');
}

// Disable/enable form
function disableForm(disabled) {
    baseCurrencySelect.disabled = disabled;
    fetchButton.disabled = disabled;
    fetchButton.textContent = disabled ? 'Loading...' : 'Get Exchange Rates';
}

// Get currency names
function getCurrencyName(currencyCode) {
    const currencyNames = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'TRY': 'Turkish Lira',
        'JPY': 'Japanese Yen',
        'CAD': 'Canadian Dollar',
        'AUD': 'Australian Dollar',
        'CHF': 'Swiss Franc',
        'CNY': 'Chinese Yuan'
    };
    
    return currencyNames[currencyCode] || currencyCode;
}

// Global function for retry button
window.fetchExchangeRates = fetchExchangeRates;

// Auto-update every 30 seconds
setInterval(() => {
    if (!loadingElement.classList.contains('hidden')) return;
    fetchExchangeRates();
}, 30000);