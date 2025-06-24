// Background script for Better Me extension

// Install handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Better Me extension installed');
  if (details.reason === 'install') {
    // Set default settings on first install - LMStudio defaults
    chrome.storage.sync.set({
      apiUrl: 'http://localhost:1234/v1/chat/completions',
      modelName: 'lmstudio-model',
      apiType: 'lmstudio',
      summaryLanguage: 'hebrew'
    });
  }
});

// Handle extension updates
chrome.runtime.onStartup.addListener(() => {
  console.log('Better Me extension started');
});

// Function to inject overlay dialog into current page
function openExtensionOverlay() {
  // Get the current active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0];
      
      // Skip chrome:// pages and extension pages
      if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
        console.log('Cannot inject into chrome:// or extension pages');
        return;
      }
      
      // Inject the complete Better Me system
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: initBetterMe
      });
    }
  });
}

// Main initialization function - will be injected into pages
function initBetterMe() {
  // Check if already initialized
  if (document.getElementById('betterme-bubble')) {
    return;
  }
  
  console.log('🚀 Better Me initializing...');
    // Create floating bubble button
  const bubble = document.createElement('div');
  bubble.id = 'betterme-bubble';
  bubble.innerHTML = `
    <span style="font-size: 24px; font-weight: bold; color: #2c5282;">BM</span>
  `;bubble.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    background: white;
    border: 2px solid #2c5282;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 4px 20px rgba(44, 82, 130, 0.2);
    transition: all 0.3s ease;
  `;
    // Add hover effects
  bubble.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 25px rgba(44, 82, 130, 0.3)';
    this.style.background = '#2c5282';
  });
  
  bubble.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 20px rgba(44, 82, 130, 0.2)';
    this.style.background = 'white';
  });
    // Add click event to open dialog
  bubble.addEventListener('click', function() {
    openBetterMeDialog();
  });
  
  // Add to page
  document.body.appendChild(bubble);
  
  console.log('✅ Better Me bubble created successfully');
  
  // Add CSS animations for spinner if not already added
  if (!document.getElementById('betterme-floating-animations')) {
    const style = document.createElement('style');
    style.id = 'betterme-floating-animations';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDialog') {
      updateDialogResult(request);
    }
    return true;
  });
  
  // Update dialog with AI result or error
  function updateDialogResult(request) {
    const resultDiv = document.getElementById('betterme-result');
    if (!resultDiv) return;
      if (request.type === 'error') {
      resultDiv.innerHTML = `
        <div style="background: white; border: 2px solid #e53e3e; padding: 15px; border-radius: 8px; color: #e53e3e; text-align: right;">
          ❌ ${request.content}
        </div>
      `;
    } else if (request.type === 'result') {
      let html = '<div style="background: white; border: 2px solid #2c5282; padding: 15px; border-radius: 8px; color: #2c5282; text-align: right; line-height: 1.6;">';
      
      if (request.originalAction === 'ask' && request.question) {
        html += `<div style="background: #f7fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-right: 3px solid #2c5282;">`;
        html += `<strong style="color: #2c5282;">שאלה:</strong><br>${request.question.replace(/\n/g, '<br>')}`;
        html += `</div>`;
        html += `<strong style="color: #2c5282;">תשובה:</strong><br>`;
      } else {
        html += `<strong style="color: #2c5282;">סיכום:</strong><br>`;
      }
      
      html += `${request.content.replace(/\n/g, '<br>')}</div>`;
      resultDiv.innerHTML = html;
    }
  }
  
  // Function to create and show the modal dialog
  function openBetterMeDialog() {
    // Check if dialog already exists
    if (document.getElementById('betterme-dialog')) {
      return;
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'betterme-overlay';
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
    dialog.id = 'betterme-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow: hidden;
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
      // Create dialog content
    dialog.innerHTML = `      <div style="background: white; color: #2c5282; padding: 20px; position: relative; border-bottom: 2px solid #e2e8f0;">
        <button id="betterme-close" style="position: absolute; top: 15px; left: 15px; background: none; border: none; color: #2c5282; font-size: 24px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">✕</button>
        <div style="display: flex; align-items: center; gap: 15px; margin-right: 45px;">
          <div style="width: 40px; height: 40px; background: #2c5282; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">BM</div>
          <div>
            <h2 style="margin: 0; font-size: 24px; color: #2c5282;">Better Me</h2>
            <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 14px;">עוזר AI חכם לסיכום ושאלות</p>
          </div>
        </div>
      </div>
        <div style="padding: 30px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <button id="betterme-summarize-page" style="background: white; color: #2c5282; border: 2px solid #2c5282; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            📄 סכם את הדף
          </button>
          <button id="betterme-summarize-selection" style="background: white; color: #2c5282; border: 2px solid #2c5282; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            🔤 סכם טקסט נבחר
          </button>
          <button id="betterme-ask-page" style="background: white; color: #2c5282; border: 2px solid #2c5282; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            ❓ שאל על הדף
          </button>
          <button id="betterme-ask-selection" style="background: white; color: #2c5282; border: 2px solid #2c5282; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            💬 שאל על הטקסט
          </button>
        </div>
          <div id="betterme-question-area" style="display: none; margin-bottom: 20px;">
          <textarea id="betterme-question-input" placeholder="כתוב את השאלה שלך כאן..." style="width: 100%; height: 80px; padding: 12px; border: 2px solid #2c5282; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; direction: rtl; color: #2c5282;"></textarea>
          <div style="margin-top: 10px; text-align: left;">
            <button id="betterme-send-question" style="background: #2c5282; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-left: 10px;">שלח שאלה</button>
            <button id="betterme-cancel-question" style="background: white; color: #2c5282; border: 2px solid #e2e8f0; padding: 10px 20px; border-radius: 6px; cursor: pointer;">ביטול</button>
          </div>
        </div>
          <div id="betterme-result" style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; min-height: 50px; display: flex; align-items: center; justify-content: center; color: #4a5568; font-style: italic;">
          לחץ על אחד מהכפתורים למעלה כדי להתחיל
        </div>
      </div>
      
      <div style="padding: 15px 30px; background: white; border-top: 2px solid #e2e8f0; text-align: center;">
        <button id="betterme-settings" style="background: white; border: 2px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #2c5282; font-size: 14px;">הגדרות</button>
      </div>
    `;
    
    // Add dialog to overlay
    overlay.appendChild(dialog);
    
    // Add event listeners
    setupDialogEventListeners(overlay, dialog);
    
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
  }
  
  // Setup event listeners for dialog
  function setupDialogEventListeners(overlay, dialog) {    // Close button
    dialog.querySelector('#betterme-close').addEventListener('click', () => {
      closeBetterMeDialog(overlay);
    });
    
    // Close button hover effect
    const closeButton = dialog.querySelector('#betterme-close');
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = '#f7fafc';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'none';
    });
    
    // Close when clicking overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeBetterMeDialog(overlay);
      }
    });
    
    // Summarize buttons
    dialog.querySelector('#betterme-summarize-page').addEventListener('click', () => {
      handleSummarize('page');
    });
    
    dialog.querySelector('#betterme-summarize-selection').addEventListener('click', () => {
      handleSummarize('selection');
    });
    
    // Ask buttons
    dialog.querySelector('#betterme-ask-page').addEventListener('click', () => {
      showQuestionArea('page');
    });
    
    dialog.querySelector('#betterme-ask-selection').addEventListener('click', () => {
      showQuestionArea('selection');
    });
    
    // Question area buttons
    dialog.querySelector('#betterme-send-question').addEventListener('click', () => {
      sendQuestion();
    });
    
    dialog.querySelector('#betterme-cancel-question').addEventListener('click', () => {
      hideQuestionArea();
    });
    
    // Settings button
    dialog.querySelector('#betterme-settings').addEventListener('click', () => {
      // Open extension popup for settings
      chrome.runtime.sendMessage({action: 'openSettings'});
    });
      // Button hover effects
    const buttons = dialog.querySelectorAll('button[id^="betterme-"]');
    buttons.forEach(button => {
      if (button.id !== 'betterme-close') {
        button.addEventListener('mouseenter', () => {
          if (button.id === 'betterme-send-question') {
            button.style.background = '#1a365d';
          } else if (button.id === 'betterme-cancel-question' || button.id === 'betterme-settings') {
            button.style.background = '#f7fafc';
            button.style.borderColor = '#2c5282';
          } else {
            button.style.background = '#2c5282';
            button.style.color = 'white';
          }
          button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', () => {
          if (button.id === 'betterme-send-question') {
            button.style.background = '#2c5282';
          } else if (button.id === 'betterme-cancel-question' || button.id === 'betterme-settings') {
            button.style.background = 'white';
            button.style.borderColor = '#e2e8f0';
          } else {
            button.style.background = 'white';
            button.style.color = '#2c5282';
          }
          button.style.transform = 'translateY(0)';
        });
      }
    });
  }
  
  // Close dialog function
  function closeBetterMeDialog(overlay) {
    overlay.style.opacity = '0';
    overlay.querySelector('#betterme-dialog').style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }
  
  // Show question area
  function showQuestionArea(type) {
    const questionArea = document.getElementById('betterme-question-area');
    const questionInput = document.getElementById('betterme-question-input');
    
    questionArea.style.display = 'block';
    questionInput.dataset.type = type;
    questionInput.focus();
    
    // Update placeholder based on type
    if (type === 'page') {
      questionInput.placeholder = 'כתוב שאלה על תוכן הדף...';
    } else {
      questionInput.placeholder = 'כתוב שאלה על הטקסט המסומן...';
    }
  }
  
  // Hide question area
  function hideQuestionArea() {
    const questionArea = document.getElementById('betterme-question-area');
    const questionInput = document.getElementById('betterme-question-input');
    
    questionArea.style.display = 'none';
    questionInput.value = '';
  }
  
  // Handle summarize action
  function handleSummarize(type) {
    const resultDiv = document.getElementById('betterme-result');    resultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #2c5282;">
        <div style="width: 20px; height: 20px; border: 2px solid #2c5282; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        מסכם עם AI...
      </div>
    `;
    
    // Add CSS animation for spinner
    if (!document.getElementById('betterme-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'betterme-spinner-style';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Send message to background script to handle AI request
    chrome.runtime.sendMessage({
      action: 'summarize',
      type: type
    });
  }
  
  // Send question
  function sendQuestion() {
    const questionInput = document.getElementById('betterme-question-input');
    const question = questionInput.value.trim();
    const type = questionInput.dataset.type;
    
    if (!question) {
      alert('אנא כתוב שאלה');
      return;
    }
    
    const resultDiv = document.getElementById('betterme-result');    resultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #2c5282;">
        <div style="width: 20px; height: 20px; border: 2px solid #2c5282; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        מחפש תשובה...
      </div>
    `;
    
    // Hide question area and send message
    hideQuestionArea();
    
    chrome.runtime.sendMessage({
      action: 'ask',
      type: type,
      question: question
    });
  }
}


// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  openExtensionOverlay();
});

// Context menu for quick access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'summarize-selection',
    title: 'סכם עם Better Me',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarize-page',
    title: 'סכם דף זה עם Better Me', 
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  openExtensionOverlay();
});

// Error handling and message processing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logError') {
    console.error('Better Me Error:', request.error);
  } else if (request.action === 'summarize' || request.action === 'ask') {
    // Handle AI request from dialog
    handleAIRequest(request, sender);
  } else if (request.action === 'summarizeSelectedText') {
    // Handle floating menu summary request
    handleFloatingMenuSummary(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'openSettings') {
    // Open extension popup for settings
    chrome.action.openPopup();
  }
  return true;
});

console.log('✅ Better Me background script loaded');

// Handle AI requests from the modal dialog
async function handleAIRequest(request, sender) {
  try {
    // Get content from the page
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'getContent',
      type: request.type
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting content:', chrome.runtime.lastError);
        sendDialogMessage(sender.tab.id, 'error', 'שגיאה בקריאת תוכן הדף');
        return;
      }
      
      if (!response || !response.content || response.content.trim().length === 0) {
        const errorMsg = request.type === 'selection' ? 
          'לא נבחר טקסט. אנא בחר טקסט בדף ונסה שוב.' : 
          'לא נמצא תוכן בדף לסיכום';
        sendDialogMessage(sender.tab.id, 'error', errorMsg);
        return;
      }
      
      // Get AI settings
      chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage'], async (settings) => {
        try {
          const result = await callAI(response.content, request, settings);
          sendDialogMessage(sender.tab.id, 'result', result, request.action, request.question);
        } catch (error) {
          console.error('AI API Error:', error);
          sendDialogMessage(sender.tab.id, 'error', 'שגיאה בקריאה למודל AI: ' + error.message);
        }
      });
    });
  } catch (error) {
    console.error('Error handling AI request:', error);
    sendDialogMessage(sender.tab.id, 'error', 'שגיאה כללית: ' + error.message);
  }
}

// Call AI API
async function callAI(content, request, settings) {
  const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
  const modelName = settings.modelName || 'lmstudio-model';
  const apiType = settings.apiType || 'lmstudio';
  const summaryLanguage = settings.summaryLanguage || 'hebrew';
  
  if (!apiUrl) {
    throw new Error('נא להזין כתובת API בהגדרות');
  }
  
  let prompt;
  if (request.action === 'ask') {
    prompt = createAskPrompt(content, request.question, summaryLanguage);
  } else {
    prompt = createSummaryPrompt(content, summaryLanguage);
  }
  
  // Prepare request body based on API type
  let requestBody;
  if (apiType === 'ollama') {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000
      }
    };
  } else {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    };
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאת API: ${response.status} - ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different response formats
  if (data.message && data.message.content) {
    return data.message.content;
  } else if (data.response) {
    return data.response;
  } else if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error('פורמט תגובה לא צפוי מהמודל');
  }
}

// Create summary prompt
function createSummaryPrompt(content, language) {
  const isHebrew = language === 'hebrew';
  
  if (isHebrew) {
    return `אנא סכם את הטקסט הבא בעברית בצורה ברורה ותמציתית. התמקד בנקודות העיקריות והחשובות ביותר:

${content}

סיכום:`;
  } else {
    return `Please provide a clear and concise summary of the following text in English. Focus on the main and most important points:

${content}

Summary:`;
  }
}

// Create ask prompt
function createAskPrompt(content, question, language) {
  const isHebrew = language === 'hebrew';
  
  if (isHebrew) {
    return `בהסתמך על הטקסט הבא, אנא ענה על השאלה בעברית בצורה מדויקת ומפורטת:

טקסט:
${content}

שאלה: ${question}

תשובה:`;
  } else {
    return `Based on the following text, please answer the question in English accurately and in detail:

Text:
${content}

Question: ${question}

Answer:`;
  }
}

// Send message to dialog
function sendDialogMessage(tabId, type, content, action = null, question = null) {
  chrome.tabs.sendMessage(tabId, {
    action: 'updateDialog',
    type: type,
    content: content,
    originalAction: action,
    question: question
  });
}

// Handle floating menu summary request
async function handleFloatingMenuSummary(request, sender, sendResponse) {
  try {
    console.log('🎯 Handling floating menu summary request');
    
    if (!request.content || request.content.trim().length === 0) {
      sendResponse({
        success: false,
        error: 'לא נמצא טקסט לסיכום'
      });
      return;
    }
    
    // Get AI settings
    chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage'], async (settings) => {
      try {
        const result = await callAIForSummary(request.content, settings);
        sendResponse({
          success: true,
          result: result
        });
      } catch (error) {
        console.error('AI API Error for floating menu:', error);
        sendResponse({
          success: false,
          error: 'שגיאה בקריאה למודל AI: ' + error.message
        });
      }
    });
  } catch (error) {
    console.error('Error handling floating menu summary:', error);
    sendResponse({
      success: false,
      error: 'שגיאה כללית: ' + error.message
    });
  }
}

// Call AI API specifically for summary (simplified version)
async function callAIForSummary(content, settings) {
  const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
  const modelName = settings.modelName || 'lmstudio-model';
  const apiType = settings.apiType || 'lmstudio';
  const summaryLanguage = settings.summaryLanguage || 'hebrew';
  
  if (!apiUrl) {
    throw new Error('נא להזין כתובת API בהגדרות');
  }
  
  const prompt = createSummaryPrompt(content, summaryLanguage);
  
  // Prepare request body based on API type
  let requestBody;
  if (apiType === 'ollama') {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000
      }
    };
  } else {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    };
  }
  
  console.log('🤖 Sending floating menu request to AI:', apiUrl);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאת API: ${response.status} - ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different response formats
  if (data.message && data.message.content) {
    return data.message.content;
  } else if (data.response) {
    return data.response;
  } else if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error('פורמט תגובה לא צפוי מהמודל');
  }
}
