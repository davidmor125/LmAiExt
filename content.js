// Content script for extracting page content
console.log('Content script loaded');

// Global error handler for debugging
window.addEventListener('error', (e) => {
  console.error('🚨 Global JavaScript error:', e.error);
  console.error('🚨 Error message:', e.message);
  console.error('🚨 Error file:', e.filename);
  console.error('🚨 Error line:', e.lineno);
  console.error('🚨 Error stack:', e.error?.stack);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Unhandled promise rejection:', e.reason);
});

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
  } else if (request.action === 'updateSummaryStream') {
    // Handle streaming updates for selected text summary
    updateSummaryStream(request.content, request.isComplete);
    sendResponse({success: true});
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
  // First try to get current selection
  const selection = window.getSelection();
  let selectedText = selection.toString().trim();
  
  // If no current selection, use the stored selected text
  if (!selectedText && currentSelectedText) {
    selectedText = currentSelectedText;
    console.log('📝 Using stored selected text:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
  }
  
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
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('scroll', hideFloatingMenu);
  window.addEventListener('resize', hideFloatingMenu);
    console.log('✅ Floating menu event listeners added');
}

// Make function available globally
window.initFloatingMenu = initFloatingMenu;

// Create the floating menu element
function createFloatingMenu() {
  console.log('🔨 Creating floating menu...');
  
  if (document.getElementById('betterme-floating-menu')) {
    console.log('⚠️ Floating menu already exists');
    return; // Already exists
  }
  
  floatingMenu = document.createElement('div');
  floatingMenu.id = 'betterme-floating-menu';  floatingMenu.style.cssText = `
    position: absolute;
    background: white;
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 2px;
    z-index: 999999;
    display: none;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    direction: rtl;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `;
  // Create summary button
  const summaryButton = document.createElement('button');
  summaryButton.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; direction: rtl;">
      <span>סכם טקסט </span>
      <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 18px; height: 18px;" alt="Better Me">
    </div>
  `;summaryButton.style.cssText = `
    background: white;
    color: #1f295c;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    position: relative;
    overflow: hidden;
    text-transform: none;
    letter-spacing: 0.25px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  `;
    // Set permanent pulse animation and hover effects with enhanced glow
  summaryButton.style.animation = 'pulse 2s infinite, glow 3s infinite';
  summaryButton.style.boxShadow = '0 4px 15px rgba(31, 41, 92, 0.2), 0 0 10px rgba(31, 41, 92, 0.15)';
  summaryButton.style.position = 'relative';
  summaryButton.style.overflow = 'hidden';
  
  // Add permanent glow effect with shimmer
  summaryButton.style.background = `
    linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%),
    linear-gradient(
      90deg,
      transparent,
      rgba(31, 41, 92, 0.1),
      transparent
    )
  `;
  summaryButton.style.backgroundSize = '100% 100%, 200px 100%';
  summaryButton.style.border = '1px solid rgba(31, 41, 92, 0.3)';
  
  // Add shimmer animation
  const shimmerStyle = `
    background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%),
    linear-gradient(
      90deg,
      transparent,
      rgba(31, 41, 92, 0.15),
      transparent
    );
    background-size: 100% 100%, 200px 100%;
    animation: pulse 2s infinite, glow 3s infinite, shimmer 4s infinite linear;
  `;
  summaryButton.style.cssText += shimmerStyle;
  
  // Add Material Design hover and focus effects WITHOUT animations
  summaryButton.addEventListener('mouseenter', () => {
    summaryButton.style.background = '#f0f4ff';
    summaryButton.style.boxShadow = '0 8px 25px rgba(31, 41, 92, 0.35), 0 0 20px rgba(31, 41, 92, 0.2)';
    summaryButton.style.transform = 'translateY(-3px) scale(1.05)';
    summaryButton.style.borderRadius = '12px';
    
    // Remove all animations on hover - keep only static styling
  });
  
  summaryButton.addEventListener('mouseleave', () => {
    summaryButton.style.background = `
      linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%),
      linear-gradient(
        90deg,
        transparent,
        rgba(31, 41, 92, 0.15),
        transparent
      )
    `;
    summaryButton.style.backgroundSize = '100% 100%, 200px 100%';
    summaryButton.style.boxShadow = '0 4px 15px rgba(31, 41, 92, 0.2), 0 0 10px rgba(31, 41, 92, 0.15)';
    summaryButton.style.transform = 'translateY(0) scale(1)';
    summaryButton.style.borderRadius = '8px';
    
    // Return to normal state but WITHOUT animations
  });
  
  summaryButton.addEventListener('mousedown', () => {
    summaryButton.style.transform = 'translateY(-1px) scale(0.98)';
    summaryButton.style.boxShadow = '0 4px 12px rgba(31, 41, 92, 0.2)';
    // Removed animation - no more clickPulse animation
  });
  
  summaryButton.addEventListener('mouseup', () => {
    summaryButton.style.transform = 'translateY(-3px) scale(1.05)';
    summaryButton.style.boxShadow = '0 8px 25px rgba(31, 41, 92, 0.25)';
  });// Add click handler
  summaryButton.addEventListener('click', (e) => {
    console.log('🔥 Floating menu button clicked!');
    console.log('🔥 Event object:', e);
    console.log('🔥 Button element:', summaryButton);
    
    // CRITICAL: Stop all event propagation immediately
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Also prevent text selection changes
    window.getSelection().removeAllRanges();
    
    console.log('🛑 All events stopped, proceeding with summary...');
    
    // Debug: check if function exists
    console.log('🔍 Checking handleFloatingMenuSummary function...');
    console.log('🔍 Function type:', typeof handleFloatingMenuSummary);
    console.log('🔍 Function exists in window:', typeof window.handleFloatingMenuSummary);
    
    if (typeof handleFloatingMenuSummary === 'function') {
      console.log('✅ handleFloatingMenuSummary function exists, calling...');
      try {
        handleFloatingMenuSummary();
        console.log('✅ handleFloatingMenuSummary called successfully');
      } catch (error) {
        console.error('❌ Error calling handleFloatingMenuSummary:', error);
        console.error('❌ Error stack:', error.stack);
      }
    } else if (typeof window.handleFloatingMenuSummary === 'function') {
      console.log('✅ handleFloatingMenuSummary found in window scope, calling...');
      try {
        window.handleFloatingMenuSummary();
        console.log('✅ window.handleFloatingMenuSummary called successfully');
      } catch (error) {
        console.error('❌ Error calling window.handleFloatingMenuSummary:', error);
        console.error('❌ Error stack:', error.stack);
      }
    } else {
      console.error('❌ handleFloatingMenuSummary function does not exist!');
      console.error('❌ Available functions:');
      
      // List all available functions that start with 'handle' or contain 'summary'
      Object.getOwnPropertyNames(window).forEach(prop => {
        if ((prop.includes('handle') || prop.includes('summary') || prop.includes('floating')) && typeof window[prop] === 'function') {
          console.log(`  - ${prop}: ${typeof window[prop]}`);
        }
      });
      
      // Try to call function directly with stored text
      console.log('🔄 Trying to call openSummaryDialog directly...');
      if (typeof openSummaryDialog === 'function' && currentSelectedText) {
        console.log('✅ Found openSummaryDialog, calling with stored text...');
        openSummaryDialog(currentSelectedText);
      } else if (typeof window.openSummaryDialog === 'function' && currentSelectedText) {
        console.log('✅ Found window.openSummaryDialog, calling with stored text...');
        window.openSummaryDialog(currentSelectedText);
      } else {
        console.error('❌ No fallback function available');
        alert('שגיאה: פונקציית הסיכום לא נמצאה. אנא רענן את הדף ונסה שוב.');
      }
    }  });
  
  floatingMenu.appendChild(summaryButton);
  document.body.appendChild(floatingMenu);
  
  // Prevent text selection events on the floating menu
  floatingMenu.addEventListener('mouseup', (e) => {
    console.log('🛑 Mouseup on floating menu - preventing text selection');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  
  floatingMenu.addEventListener('mousedown', (e) => {
    console.log('🛑 Mousedown on floating menu - preventing text selection');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  
  console.log('✅ Floating menu created');
}

// Make function available globally
window.createFloatingMenu = createFloatingMenu;

// Add global click listener for floating menu (backup solution)
document.addEventListener('click', function(e) {
  // Check if click is on floating menu button
  if (e.target.closest('#betterme-floating-menu button')) {
    console.log('🔥 BACKUP: Global click handler caught floating menu button click!');
    e.preventDefault();
    e.stopPropagation();
    
    // Call the summary function directly
    if (typeof handleFloatingMenuSummary === 'function') {
      console.log('✅ BACKUP: Calling handleFloatingMenuSummary from global handler');
      handleFloatingMenuSummary();
    } else if (typeof window.handleFloatingMenuSummary === 'function') {
      console.log('✅ BACKUP: Calling window.handleFloatingMenuSummary from global handler');
      window.handleFloatingMenuSummary();
    } else {
      console.error('❌ BACKUP: No summary function found!');
    }
  }
}, true); // Use capture phase to catch events early

// Handle text selection
function handleTextSelection(e) {
  console.log('👆 Text selection event triggered');
  
  // Check if the event originated from the floating menu
  const floatingMenu = document.getElementById('betterme-floating-menu');
  if (floatingMenu && e.target && (e.target === floatingMenu || floatingMenu.contains(e.target))) {
    console.log('👆 Text selection event from floating menu - ignoring');
    return;
  }
  
  // Clear any existing timeout
  if (hideMenuTimeout) {
    clearTimeout(hideMenuTimeout);
    hideMenuTimeout = null;
  }
  
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('📝 Selection check - text length:', selectedText.length);
    console.log('📝 Selection preview:', selectedText.substring(0, 30) + '...');
    
    if (selectedText.length > 0) {
      console.log('✅ Text selected, showing floating menu');
      showFloatingMenu(e, selectedText);
    } else {
      console.log('❌ No text selected, hiding floating menu');
      hideFloatingMenu();
    }
  }, 100);
}

// Show floating menu near the selection
function showFloatingMenu(e, selectedText) {
  console.log('📍 showFloatingMenu called');
  
  // Update global selected text variable
  if (selectedText) {
    currentSelectedText = selectedText;
    console.log('📝 Updated currentSelectedText in showFloatingMenu:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
  }
  
  if (!floatingMenu) {
    console.log('❌ Floating menu element not found!');
    return;
  }
  
  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    console.log('❌ No selection range found');
    return;
  }
  
  console.log('🎯 Positioning floating menu...');
  
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
  
  console.log('📍 Menu positioned at:', finalX, finalY);
  console.log('✅ Floating menu is now visible');
  
  // Auto-hide after 5 seconds
  hideMenuTimeout = setTimeout(() => {
    console.log('⏰ Auto-hiding floating menu after 5 seconds');
    hideFloatingMenu();
  }, 5000);
    console.log('📍 Floating menu shown for selection:', selectedText.substring(0, 50) + '...');
}

// Handle mouse down - only hide menu if not clicking on it
function handleMouseDown(e) {
  console.log('👇 Mouse down detected');
  
  // Check if the click is on the floating menu or its children
  const floatingMenu = document.getElementById('betterme-floating-menu');
  if (floatingMenu && (e.target === floatingMenu || floatingMenu.contains(e.target))) {
    console.log('👇 Mouse down on floating menu - NOT hiding');
    return; // Don't hide the menu if clicking on it
  }
  
  console.log('👇 Mouse down outside floating menu - hiding');
  hideFloatingMenu();
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

// Make function available globally
window.hideFloatingMenu = hideFloatingMenu;

// Handle summary button click in floating menu
function handleFloatingMenuSummary() {
  console.log('🚀 handleFloatingMenuSummary called');
  
  // Use stored selected text first, fallback to current selection
  let selectedText = currentSelectedText;
  
  if (!selectedText) {
    console.log('🔄 No stored text, checking current selection...');
    // Debug: check selection immediately
    const selection = window.getSelection();
    console.log('📋 Selection object:', selection);
    console.log('📋 Selection type:', selection.type);
    console.log('📋 Selection rangeCount:', selection.rangeCount);
    
    selectedText = selection.toString().trim();
  }
  
  // If still no text, try to get from floating menu context
  if (!selectedText) {
    console.log('� Still no text, trying alternative methods...');
    // Check if there's any recently selected text in the page
    const allText = document.body.innerText || document.body.textContent || '';
    if (allText.length > 0) {
      // For demo purposes, use a portion of page text
      selectedText = allText.substring(0, 200).trim();
      console.log('📝 Using fallback text from page content');
    }
  }
  
  // Final fallback - use default text
  if (!selectedText) {
    selectedText = 'טקסט ברירת מחדל לבדיקת פונקציית הסיכום. זה טקסט שנוצר אוטומטית כשלא נמצא טקסט נבחר.';
    console.log('📝 Using default fallback text');
  }
  
  console.log('📝 Selected text length:', selectedText.length);
  console.log('📝 Selected text preview:', selectedText.substring(0, 50) + '...');
  
  console.log('📄 Summarizing selected text from floating menu:', selectedText.substring(0, 100) + '...');
  
  // Hide the floating menu
  console.log('🫥 Hiding floating menu...');
  hideFloatingMenu();
  
  // Open summary dialog with the selected text
  console.log('🔄 Calling openSummaryDialog...');
  try {
    openSummaryDialog(selectedText);
    console.log('✅ openSummaryDialog called successfully');
  } catch (error) {
    console.error('❌ Error calling openSummaryDialog:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Emergency fallback - show alert
    alert('שגיאה בפתיחת הדיאלוג: ' + error.message + '\n\nטקסט שנבחר: ' + selectedText.substring(0, 100));
  }
}

// Make function available globally
window.handleFloatingMenuSummary = handleFloatingMenuSummary;

// Open summary dialog
function openSummaryDialog(selectedText) {
  console.log('🎬 openSummaryDialog called with text length:', selectedText.length);
  console.log('🎬 Text preview:', selectedText.substring(0, 100) + '...');
  console.log('🎬 Document ready state:', document.readyState);
  console.log('🎬 Document body:', document.body);
  
  // Check if dialog already exists
  const existingDialog = document.getElementById('betterme-summary-dialog');
  const existingOverlay = document.getElementById('betterme-summary-overlay');
  
  if (existingDialog || existingOverlay) {
    console.log('⚠️ Dialog or overlay already exists, removing...');
    if (existingOverlay && existingOverlay.parentNode) {
      existingOverlay.parentNode.removeChild(existingOverlay);
      console.log('🗑️ Existing overlay removed');
    }
    if (existingDialog && existingDialog.parentNode) {
      existingDialog.parentNode.removeChild(existingDialog);
      console.log('🗑️ Existing dialog removed');
    }
  }
  
  console.log('🔨 Creating summary dialog...');
  
  try {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'betterme-summary-overlay';
    console.log('✅ Overlay element created:', overlay);
    
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
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
    overflow: auto;
    direction: rtl;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
  `;
  
  // Create dialog content
  dialog.innerHTML = `    <div style="background: white; color: #1f295c; padding: 20px; position: relative; border-bottom: 2px solid #e2e8f0; flex-shrink: 0;">
      <button id="betterme-summary-close" style="position: absolute; top: 15px; left: 15px; background: none; border: none; color: #1f295c; font-size: 24px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">✕</button>
      
      <!-- Logo section - absolute positioned to far right -->
      <div style="position: absolute; top: 15px; right: 15px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 32px; height: 32px;" alt="Better Me">
          <span style="font-size: 16px; font-weight: bold; color: #1f295c;">BETTER ME</span>
        </div>
      </div>
      
      <div style="margin: 40px 0 0 0;">
        <!-- Centered title section -->
        <div style="text-align: center;">
          <h2 style="margin: 0; font-size: 24px; color: #1f295c;">סיכום טקסט מסומן</h2>
        </div>
        
        <p style="margin: 10px 0 0 0; color: #4a5568; font-size: 14px; text-align: center;">Better Me מסכם עבורך את הטקסט שבחרת</p>
      </div>
    </div>
    
    <div style="padding: 30px; flex: 1; overflow-y: auto; min-height: 0;">
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f295c; margin: 0 0 10px 0;">הטקסט המסומן:</h3>
        <div style="background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #1f295c;" id="selected-text-display"></div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f295c; margin: 0 0 10px 0;">סיכום:</h3>
        <div id="betterme-summary-result" style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; min-height: 100px; max-height: 300px; overflow-y: auto; display: flex; align-items: center; justify-content: center; color: #4a5568; font-style: italic;">
          <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
            <div style="width: 20px; height: 20px;  border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            מסכם את הטקסט עם AI...
          </div>
        </div>
      </div>
      
      <!-- Action buttons section -->
      <div id="summary-action-buttons" style="margin-top: 20px; display: none;">
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button id="copy-summary-btn" style="
            background: white;
            color: #1f295c;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="color: #1f295c; font-size: 16px; font-weight: bold;">�</span> העתק סיכום
          </button>
          
          <button id="translate-summary-btn" style="
            background: white;
            color: #1f295c;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="color: #1f295c; font-size: 16px; font-weight: bold;">T</span> תרגם סיכום
          </button>
          
          <button id="rewrite-summary-btn" style="
            background: white;
            color: #1f295c;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;           
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
          ">
            <span style="color: #1f295c; font-size: 16px; font-weight: bold;">✎</span> נסח מחדש
          </button>
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
  setupSummaryDialogEventListeners(overlay, selectedText);  // Add to page
  document.body.appendChild(overlay);
  
  console.log('✅ Summary dialog added to page');
  console.log('🎬 Dialog element:', dialog);
  console.log('🎬 Overlay element:', overlay);
  console.log('🎬 Document body children count:', document.body.children.length);
  console.log('🎬 Overlay computed style:', window.getComputedStyle(overlay));
  console.log('🎬 Dialog computed style:', window.getComputedStyle(dialog));
  
  // Force visibility check
  setTimeout(() => {
    const overlayRect = overlay.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    console.log('🎬 Overlay rect:', overlayRect);
    console.log('🎬 Dialog rect:', dialogRect);
    console.log('🎬 Overlay visible:', overlayRect.width > 0 && overlayRect.height > 0);
    console.log('🎬 Dialog visible:', dialogRect.width > 0 && dialogRect.height > 0);
  }, 100);
  
  // Add animation
  overlay.style.opacity = '0';
  dialog.style.transform = 'scale(0.8)';
  
  requestAnimationFrame(() => {
    overlay.style.transition = 'opacity 0.3s ease';
    dialog.style.transition = 'transform 0.3s ease';
    overlay.style.opacity = '1';
    dialog.style.transform = 'scale(1)';
    console.log('🎨 Animation applied to dialog');
  });
    // Start summarization
  console.log('🤖 Starting AI summarization...');
  summarizeSelectedText(selectedText);
  
  console.log('📄 Summary dialog opened successfully');
  
  } catch (error) {
    console.error('❌ Error creating summary dialog:', error);
    console.error('❌ Error stack:', error.stack);
    alert('שגיאה ביצירת הדיאלוג: ' + error.message);
  }
}

// Make function available globally
window.openSummaryDialog = openSummaryDialog;

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
  
  // Close button hover effect  // Close button hover effect with animation
  const closeButton = dialog.querySelector('#betterme-summary-close');
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = '#f7fafc';
    closeButton.style.transform = 'scale(1.1) rotate(90deg)';
    closeButton.style.transition = 'all 0.3s ease';
    closeButton.style.color = '#e53e3e';
  });  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'none';
    closeButton.style.transform = 'scale(1) rotate(0deg)';
    closeButton.style.color = '#1f295c';
  });
  
  // Close button click animation
  closeButton.addEventListener('mousedown', () => {
    closeButton.style.transform = 'scale(0.9) rotate(180deg)';
    closeButton.style.transition = 'all 0.1s ease';
  });
  closeButton.addEventListener('mouseup', () => {
    closeButton.style.transform = 'scale(1.1) rotate(90deg)';
    closeButton.style.transition = 'all 0.2s ease';
  });
  
  // ESC key to close
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeSummaryDialog(overlay);
      document.removeEventListener('keydown', escHandler);
    }
  });
  
  // Action buttons event listeners
  setupActionButtonsListeners(dialog, selectedText);
}

// Setup action buttons listeners
function setupActionButtonsListeners(dialog, selectedText) {
  // Copy summary button
  const copyBtn = dialog.querySelector('#copy-summary-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copySummaryToClipboard();
    });
  }
  
  // Translate summary button
  const translateBtn = dialog.querySelector('#translate-summary-btn');
  if (translateBtn) {
    translateBtn.addEventListener('click', () => {
      translateSummary();
    });
  }
  
  // Rewrite summary button
  const rewriteBtn = dialog.querySelector('#rewrite-summary-btn');
  if (rewriteBtn) {
    rewriteBtn.addEventListener('click', () => {
      rewriteSummary(selectedText);
    });
  }
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

// Update summary with streaming content
function updateSummaryStream(content, isComplete) {
  const resultDiv = document.getElementById('betterme-summary-result');
  if (!resultDiv) return;
  
  let displayContent = content.replace(/\n/g, '<br>');
  
  // Add streaming cursor if not complete
  if (!isComplete) {
    displayContent += '<span id="streaming-cursor" style="animation: blink 1s infinite; color: #2c5282; font-weight: bold;">▊</span>';
    
    // Add blinking animation if not already added
    if (!document.getElementById('streaming-animation-style')) {
      const style = document.createElement('style');
      style.id = 'streaming-animation-style';
      style.textContent = `
        @keyframes blink { 
          0%, 50% { opacity: 1; } 
          51%, 100% { opacity: 0; } 
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    // Remove streaming cursor when complete
    const cursor = document.getElementById('streaming-cursor');
    if (cursor) {
      cursor.remove();
    }
  }
  
  resultDiv.innerHTML = `
    <div style="background: white; border: 2px solid #2c5282; padding: 15px; border-radius: 8px; color: #2c5282; text-align: right; line-height: 1.6;">
      ${displayContent}
    </div>
  `;
  
  // Show action buttons when streaming is complete
  if (isComplete) {
    const actionButtons = document.getElementById('summary-action-buttons');
    if (actionButtons) {
      actionButtons.style.display = 'flex';
    }
  }
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
  
  // Reset the div styling for content display
  resultDiv.style.display = 'block';
  resultDiv.style.alignItems = 'unset';
  resultDiv.style.justifyContent = 'unset';
  
  resultDiv.innerHTML = `
    <div style="color: #1f295c; text-align: right; line-height: 1.6; font-style: normal;">
      ${summary.replace(/\n/g, '<br>')}
    </div>
  `;
  
  // Show action buttons after summary is loaded
  const actionButtons = document.getElementById('summary-action-buttons');
  if (actionButtons) {
    actionButtons.style.display = 'block';
  }
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

// Action button functions
function copySummaryToClipboard() {
  const summaryResult = document.getElementById('betterme-summary-result');
  if (!summaryResult || summaryResult.querySelector('.loading')) {
    showNotification('אין סיכום זמין להעתקה', 'warning');
    return;
  }
  
  const summaryText = summaryResult.textContent || summaryResult.innerText;
  
  // Try to use the Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(summaryText).then(() => {
      showNotification('הסיכום הועתק בהצלחה! 📋', 'success');
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      fallbackCopyTextToClipboard(summaryText);
    });
  } else {
    fallbackCopyTextToClipboard(summaryText);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showNotification('הסיכום הועתק בהצלחה! 📋', 'success');
    } else {
      showNotification('שגיאה בהעתקת הסיכום', 'error');
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showNotification('שגיאה בהעתקת הסיכום', 'error');
  }
  
  document.body.removeChild(textArea);
}

function translateSummary() {
  const summaryResult = document.getElementById('betterme-summary-result');
  if (!summaryResult || summaryResult.querySelector('.loading')) {
    showNotification('אין סיכום זמין לתרגום', 'warning');
    return;
  }
  
  const summaryText = summaryResult.textContent || summaryResult.innerText;
  
  // Show loading state
  const translateBtn = document.getElementById('translate-summary-btn');
  const originalText = translateBtn.innerHTML;
  translateBtn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> מתרגם...';
  translateBtn.disabled = true;
  
  // Send translation request to background script
  chrome.runtime.sendMessage({
    action: 'translateText',
    text: summaryText,
    targetLanguage: 'english' // Can be made configurable
  }, (response) => {
    translateBtn.innerHTML = originalText;
    translateBtn.disabled = false;
    
    if (response && response.success) {
      // Update the summary result with translated text
      summaryResult.innerHTML = `
        <div style="padding: 15px; line-height: 1.6; color: #1f295c;">
          <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
            <strong>הסיכום המקורי:</strong><br>
            ${summaryText}
          </div>
          <div>
            <strong>התרגום לאנגלית:</strong><br>
            ${response.translatedText}
          </div>
        </div>
      `;
      showNotification('הסיכום תורגם בהצלחה! 🌐', 'success');
    } else {
      showNotification('שגיאה בתרגום הסיכום: ' + (response?.error || 'שגיאה לא ידועה'), 'error');
    }
  });
}

function rewriteSummary(originalText) {
  const summaryResult = document.getElementById('betterme-summary-result');
  if (!summaryResult || summaryResult.querySelector('.loading')) {
    showNotification('אין סיכום זמין לניסוח מחדש', 'warning');
    return;
  }
  
  // Show loading state
  const rewriteBtn = document.getElementById('rewrite-summary-btn');
  const originalBtnText = rewriteBtn.innerHTML;
  rewriteBtn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> מנסח מחדש...';
  rewriteBtn.disabled = true;
  
  // Send rewrite request to background script
  chrome.runtime.sendMessage({
    action: 'rewriteSummary',
    originalText: originalText,
    currentSummary: summaryResult.textContent || summaryResult.innerText
  }, (response) => {
    rewriteBtn.innerHTML = originalBtnText;
    rewriteBtn.disabled = false;
    
    if (response && response.success) {
      // Update the summary result with rewritten summary
      summaryResult.innerHTML = `
        <div style="padding: 15px; line-height: 1.6; color: #1f295c;">
          ${response.rewrittenSummary}
        </div>
      `;
      showNotification('הסיכום נוסח מחדש בהצלחה! ✏️', 'success');
    } else {
      showNotification('שגיאה בניסוח מחדש של הסיכום: ' + (response?.error || 'שגיאה לא ידועה'), 'error');
    }
  });
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#b6d4db'};
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add CSS animations for notifications and floating menu
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 8px 25px rgba(31, 41, 92, 0.25), 0 0 0 0 rgba(31, 41, 92, 0.2);
    }
    50% {
      box-shadow: 0 12px 35px rgba(31, 41, 92, 0.35), 0 0 20px rgba(31, 41, 92, 0.3), 0 0 0 8px rgba(31, 41, 92, 0.1);
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(31, 41, 92, 0.3), 0 0 10px rgba(31, 41, 92, 0.2), 0 0 15px rgba(31, 41, 92, 0.1);
    }
    50% {
      box-shadow: 0 0 10px rgba(31, 41, 92, 0.4), 0 0 20px rgba(31, 41, 92, 0.3), 0 0 30px rgba(31, 41, 92, 0.2);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }
  
  @keyframes clickPulse {
    0% {
      transform: translateY(-1px) scale(0.98);
    }
    50% {
      transform: translateY(-1px) scale(0.95);
    }
    100% {
      transform: translateY(-3px) scale(1.05);
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);

// Global variable to store currently selected text
let currentSelectedText = '';

// Update selected text when selection changes
document.addEventListener('selectionchange', function() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText) {
    currentSelectedText = selectedText;
    console.log('📝 Selected text updated:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
  }
});

// Initialize floating menu when content script loads
console.log('🏁 Content script initialization - document.readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initFloatingMenu);
} else {
  console.log('✅ Document already loaded, initializing floating menu immediately');
  initFloatingMenu();
}
