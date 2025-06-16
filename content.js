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
