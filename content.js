// Content script for extracting page content
console.log('Content script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request);
  
  if (request.action === 'getContent') {
    let content = '';
    
    try {
      if (request.type === 'selection') {
        // Get selected text
        content = getSelectedText();
        console.log('Selected text length:', content.length);
      } else if (request.type === 'page') {
        // Get full page text content
        content = getPageContent();
        console.log('Page content length:', content.length);
      }
      
      sendResponse({
        success: true,
        content: content
      });
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({
        success: false,
        error: error.message,
        content: ''
      });
    }  } else if (request.action === 'displayResult') {
    // Display AI result in the overlay
    displayAIResult(request.result, request.type, request.question);
    
    // Update button text after displaying result
    setTimeout(() => {
      updateSummaryButtonText();
    }, 100);
  } else if (request.action === 'displayError') {
    // Display error in the overlay
    displayAIError(request.error);
    
    // Update button text after displaying error
    setTimeout(() => {
      updateSummaryButtonText();
    }, 100);
  }
  
  return true; // Keep message channel open for async response
});

function getSelectedText() {
  const selection = window.getSelection();
  let selectedText = selection.toString().trim();
  
  if (!selectedText) {
    // Check if we're in an input or textarea
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text'))) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      selectedText = activeElement.value.substring(start, end).trim();
    }
  }
  
  return selectedText;
}

function getPageContent() {
  // Create a clone of the document to avoid modifying the original
  const content = extractMainContent();
  
  // Clean up the text
  const cleanedContent = cleanText(content);
  
  // Limit content length to avoid API limits (AYA can handle longer texts)
  const maxLength = 8000;
  if (cleanedContent.length > maxLength) {
    return cleanedContent.substring(0, maxLength) + '...';
  }
  
  return cleanedContent;
}

function extractMainContent() {
  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    '.ad', '.advertisement', '.ads', '.sidebar',
    '.cookie-banner', '.popup', '.modal',
    '.social-share', '.comments', '.related-posts',
    '[aria-hidden="true"]', '.screen-reader-only'
  ];
  
  // Try to find main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.page-content',
    '#content',
    '#main-content',
    '.container .content'
  ];
  
  let content = '';
  
  // First, try to find main content
  for (const selector of contentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      content = Array.from(elements)
        .map(el => el.innerText || el.textContent || '')
        .join('\n\n');
      
      if (content.trim().length > 100) {
        break;
      }
    }
  }
  
  // If no main content found, get body content and filter out unwanted parts
  if (!content || content.trim().length < 100) {
    const bodyClone = document.body.cloneNode(true);
    
    // Remove unwanted elements from clone
    unwantedSelectors.forEach(selector => {
      const elements = bodyClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    content = bodyClone.innerText || bodyClone.textContent || '';
  }
  
  return content;
}

function cleanText(text) {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim()
    // Remove common boilerplate text patterns
    .replace(/חזרה לתחילת העמוד|Back to top|עמוד הבית|Home page/gi, '')
    .replace(/שתף|Share|הדפס|Print|שמור|Save/gi, '')
    // Remove cookie notices
    .replace(/עוגיות|cookies|מדיניות פרטיות|privacy policy/gi, '')
    // Remove email subscription prompts
    .replace(/הירשם לניוזלטר|Subscribe|הצטרף|Join/gi, '');
}

// Helper function to get readable text from element
function getReadableText(element) {
  if (!element) return '';
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // Skip hidden elements
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip very small text (likely decorative)
        if (parseFloat(style.fontSize) < 10) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 0) {
      textNodes.push(text);
    }
  }
  
  return textNodes.join(' ');
}

// Display AI result in the Better Me overlay
function displayAIResult(result, type, question = null) {
  const resultDiv = document.getElementById('betterme-result');
  if (!resultDiv) return;
  
  let html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #18285f; direction: rtl; text-align: right;">';
  
  if (type === 'ask' && question) {
    html += `<strong>שאלה:</strong><br>${question.replace(/\n/g, '<br>')}<br><br>`;
    html += `<strong>תשובה:</strong><br>`;
  } else {
    html += `<strong> סיכום:</strong><br>`;
  }
  
  html += `${result.replace(/\n/g, '<br>')}</div>`;
  resultDiv.innerHTML = html;
}

// Display error in the Better Me overlay
function displayAIError(error) {
  const resultDiv = document.getElementById('betterme-result');
  if (!resultDiv) return;
  
  resultDiv.innerHTML = `<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 12px; border-radius: 6px; color: #721c24; direction: rtl; text-align: right;">❌ שגיאה: ${error}</div>`;
}

// Function to update summary button text based on current selection
function updateSummaryButtonText() {
  const selection = window.getSelection();
  const summaryText = document.getElementById('betterme-summary-text');
  const askText = document.getElementById('betterme-ask-text');
  
  if (summaryText) {
    if (selection.toString().trim().length > 0) {
      summaryText.textContent = 'סכם טקסט נבחר';
    } else {
      summaryText.textContent = 'סכם את הדף';
    }
  }
  
  if (askText) {
    if (selection.toString().trim().length > 0) {
      askText.textContent = 'שאל על הטקסט המסומן';
    } else {
      askText.textContent = 'שאל על הדף';
    }
  }
  
  console.log('🔄 Button text updated in content script');
}

// Floating context menu for text selection
let floatingMenu = null;
let hideMenuTimeout = null;

// Initialize floating menu functionality
function initFloatingMenu() {
  console.log('🎯 Initializing floating selection menu...');
  
  // Create floating menu element
  createFloatingMenu();
  
  // Add event listeners
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('mousedown', hideFloatingMenu);
  document.addEventListener('scroll', hideFloatingMenu);
  window.addEventListener('resize', hideFloatingMenu);
}

// Create the floating menu element
function createFloatingMenu() {
  if (document.getElementById('betterme-floating-menu')) {
    return; // Already exists
  }
  
  floatingMenu = document.createElement('div');
  floatingMenu.id = 'betterme-floating-menu';
  floatingMenu.style.cssText = `
    position: absolute;
    background: white;
    border: 2px solid #2c5282;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(44, 82, 130, 0.15);
    padding: 8px;
    z-index: 999999;
    display: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    direction: rtl;
  `;
  
  // Create summary button
  const summaryButton = document.createElement('button');
  summaryButton.innerHTML = '📄 סכם טקסט מסומן';
  summaryButton.style.cssText = `
    background: white;
    color: #2c5282;
    border: 1px solid #2c5282;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
    white-space: nowrap;
  `;
  
  // Add hover effects
  summaryButton.addEventListener('mouseenter', () => {
    summaryButton.style.background = '#2c5282';
    summaryButton.style.color = 'white';
  });
  
  summaryButton.addEventListener('mouseleave', () => {
    summaryButton.style.background = 'white';
    summaryButton.style.color = '#2c5282';
  });
  
  // Add click handler
  summaryButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFloatingMenuSummary();
  });
  
  floatingMenu.appendChild(summaryButton);
  document.body.appendChild(floatingMenu);
  
  console.log('✅ Floating menu created');
}

// Handle text selection
function handleTextSelection(e) {
  // Clear any existing timeout
  if (hideMenuTimeout) {
    clearTimeout(hideMenuTimeout);
    hideMenuTimeout = null;
  }
  
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      showFloatingMenu(e, selectedText);
    } else {
      hideFloatingMenu();
    }
  }, 100);
}

// Show floating menu near the selection
function showFloatingMenu(e, selectedText) {
  if (!floatingMenu) return;
  
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Position the menu above the selection
  const menuX = rect.left + (rect.width / 2);
  const menuY = rect.top - 10;
  
  // Adjust position to stay within viewport
  const menuRect = floatingMenu.getBoundingClientRect();
  let finalX = menuX - (menuRect.width / 2);
  let finalY = menuY - menuRect.height;
  
  // Keep menu within viewport horizontally
  if (finalX < 10) finalX = 10;
  if (finalX + menuRect.width > window.innerWidth - 10) {
    finalX = window.innerWidth - menuRect.width - 10;
  }
  
  // Keep menu within viewport vertically
  if (finalY < 10) {
    finalY = rect.bottom + 10; // Show below selection if no space above
  }
  
  // Position relative to document
  finalX += window.scrollX;
  finalY += window.scrollY;
  
  floatingMenu.style.left = finalX + 'px';
  floatingMenu.style.top = finalY + 'px';
  floatingMenu.style.display = 'block';
  
  // Auto-hide after 5 seconds
  hideMenuTimeout = setTimeout(() => {
    hideFloatingMenu();
  }, 5000);
  
  console.log('📍 Floating menu shown for selection:', selectedText.substring(0, 50) + '...');
}

// Hide floating menu
function hideFloatingMenu() {
  if (floatingMenu) {
    floatingMenu.style.display = 'none';
  }
  
  if (hideMenuTimeout) {
    clearTimeout(hideMenuTimeout);
    hideMenuTimeout = null;
  }
}

// Handle summary button click in floating menu
function handleFloatingMenuSummary() {
  const selectedText = window.getSelection().toString().trim();
  
  if (!selectedText) {
    console.log('❌ No text selected for summary');
    return;
  }
  
  console.log('📄 Summarizing selected text from floating menu:', selectedText.substring(0, 100) + '...');
  
  // Hide the floating menu
  hideFloatingMenu();
  
  // Open summary dialog with the selected text
  openSummaryDialog(selectedText);
}

// Open summary dialog
function openSummaryDialog(selectedText) {
  // Check if dialog already exists
  if (document.getElementById('betterme-summary-dialog')) {
    return;
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'betterme-summary-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'betterme-summary-dialog';
  dialog.style.cssText = `
    background: white;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    direction: rtl;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Create dialog content
  dialog.innerHTML = `
    <div style="background: white; color: #2c5282; padding: 20px; position: relative; border-bottom: 2px solid #e2e8f0;">
      <button id="betterme-summary-close" style="position: absolute; top: 15px; left: 15px; background: none; border: none; color: #2c5282; font-size: 24px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">✕</button>
      <div style="margin-right: 45px;">
        <h2 style="margin: 0; font-size: 24px; color: #2c5282;">📄 סיכום טקסט מסומן</h2>
        <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 14px;">Better Me מסכם עבורך את הטקסט שבחרת</p>
      </div>
    </div>
    
    <div style="padding: 30px;">
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c5282; margin: 0 0 10px 0;">הטקסט המסומן:</h3>
        <div style="background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #2c5282;" id="selected-text-display"></div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c5282; margin: 0 0 10px 0;">סיכום:</h3>
        <div id="betterme-summary-result" style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; min-height: 100px; display: flex; align-items: center; justify-content: center; color: #4a5568; font-style: italic;">
          <div style="display: flex; align-items: center; gap: 10px; color: #2c5282;">
            <div style="width: 20px; height: 20px; border: 2px solid #2c5282; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            מסכם את הטקסט עם AI...
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add dialog to overlay
  overlay.appendChild(dialog);
  
  // Display selected text
  const selectedTextDisplay = dialog.querySelector('#selected-text-display');
  selectedTextDisplay.textContent = selectedText;
  
  // Add event listeners
  setupSummaryDialogEventListeners(overlay, selectedText);
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Add animation
  overlay.style.opacity = '0';
  dialog.style.transform = 'scale(0.8)';
  
  requestAnimationFrame(() => {
    overlay.style.transition = 'opacity 0.3s ease';
    dialog.style.transition = 'transform 0.3s ease';
    overlay.style.opacity = '1';
    dialog.style.transform = 'scale(1)';
  });
  
  // Start summarization
  summarizeSelectedText(selectedText);
  
  console.log('📄 Summary dialog opened');
}

// Setup event listeners for summary dialog
function setupSummaryDialogEventListeners(overlay, selectedText) {
  const dialog = overlay.querySelector('#betterme-summary-dialog');
  
  // Close button
  dialog.querySelector('#betterme-summary-close').addEventListener('click', () => {
    closeSummaryDialog(overlay);
  });
  
  // Close when clicking overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeSummaryDialog(overlay);
    }
  });
  
  // Close button hover effect
  const closeButton = dialog.querySelector('#betterme-summary-close');
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = '#f7fafc';
  });
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'none';
  });
  
  // ESC key to close
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeSummaryDialog(overlay);
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// Close summary dialog
function closeSummaryDialog(overlay) {
  overlay.style.opacity = '0';
  overlay.querySelector('#betterme-summary-dialog').style.transform = 'scale(0.8)';
  
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 300);
  
  console.log('📄 Summary dialog closed');
}

// Summarize selected text using AI
function summarizeSelectedText(selectedText) {
  const resultDiv = document.getElementById('betterme-summary-result');
  if (!resultDiv) return;
  
  // Send message to background script for AI processing
  chrome.runtime.sendMessage({
    action: 'summarizeSelectedText',
    content: selectedText
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
      showSummaryError('שגיאה בתקשורת עם התוסף');
      return;
    }
    
    if (response && response.success) {
      showSummaryResult(response.result);
    } else {
      showSummaryError(response ? response.error : 'שגיאה לא ידועה');
    }
  });
}

// Show summary result
function showSummaryResult(summary) {
  const resultDiv = document.getElementById('betterme-summary-result');
  if (!resultDiv) return;
  
  resultDiv.innerHTML = `
    <div style="background: white; border: 2px solid #2c5282; padding: 15px; border-radius: 8px; color: #2c5282; text-align: right; line-height: 1.6;">
      ${summary.replace(/\n/g, '<br>')}
    </div>
  `;
}

// Show summary error
function showSummaryError(error) {
  const resultDiv = document.getElementById('betterme-summary-result');
  if (!resultDiv) return;
  
  resultDiv.innerHTML = `
    <div style="background: white; border: 2px solid #e53e3e; padding: 15px; border-radius: 8px; color: #e53e3e; text-align: right;">
      ❌ ${error}
    </div>
  `;
}

// Initialize floating menu when content script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingMenu);
} else {
  initFloatingMenu();
}
