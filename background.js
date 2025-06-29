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
    <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 52px; height: 52px;" alt="Better Me">
  `;  bubble.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    background: white;
    border: 2px solid #1f295c;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 4px 20px rgba(44, 82, 130, 0.2);
    transition: all 0.3s ease;
    animation: bubbleFloat 3s ease-in-out infinite, bubblePulse 2s ease-in-out infinite;
  `;
  
  // Add hover effects - stop animations on hover
  bubble.addEventListener('mouseenter', function() {
    this.style.animation = 'none';
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 25px rgba(44, 82, 130, 0.3)';
    this.style.background = '#fff';
  });
  
  bubble.addEventListener('mouseleave', function() {
    this.style.animation = 'bubbleFloat 3s ease-in-out infinite, bubblePulse 2s ease-in-out infinite';
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 20px rgba(44, 82, 130, 0.2)';
    this.style.background = 'white';
  });
  // Add click event to open dialog with animation
  bubble.addEventListener('click', function() {
    // Stop animations during click
    this.style.animation = 'none';
    this.style.transform = 'scale(0.9)';
    this.style.transition = 'all 0.1s ease';
    
    // Reset after short delay
    setTimeout(() => {
      this.style.transform = 'scale(1.1)';
      this.style.transition = 'all 0.2s ease';
      
      // Open dialog
      openBetterMeDialog();
      
      // Resume animations after dialog opens
      setTimeout(() => {
        if (!this.matches(':hover')) {
          this.style.animation = 'bubbleFloat 3s ease-in-out infinite, bubblePulse 2s ease-in-out infinite';
        }
        this.style.transition = 'all 0.3s ease';
      }, 300);
    }, 100);
  });
  
  // Add to page with entrance animation
  document.body.appendChild(bubble);
  
  // Initial entrance animation
  bubble.style.transform = 'scale(0)';
  bubble.style.opacity = '0';
  
  setTimeout(() => {
    bubble.style.transform = 'scale(1)';
    bubble.style.opacity = '1';
    bubble.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // Start floating animations after entrance
    setTimeout(() => {
      bubble.style.animation = 'bubbleFloat 3s ease-in-out infinite, bubblePulse 2s ease-in-out infinite';
      bubble.style.transition = 'all 0.3s ease';
    }, 500);
  }, 100);
  
  console.log('✅ Better Me bubble created successfully');
  
  // Add CSS animations for bubble and spinner if not already added
  if (!document.getElementById('betterme-floating-animations')) {
    const style = document.createElement('style');
    style.id = 'betterme-floating-animations';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes bubbleFloat {
        0%, 100% { 
          transform: translateY(0px) scale(1); 
        }
        25% { 
          transform: translateY(-8px) scale(1.02); 
        }
        50% { 
          transform: translateY(-4px) scale(1.05); 
        }
        75% { 
          transform: translateY(-12px) scale(1.03); 
        }
      }
      
      @keyframes bubblePulse {
        0%, 100% { 
          box-shadow: 0 4px 20px rgba(44, 82, 130, 0.2);
          border-color: #1f295c;
        }
        25% { 
          box-shadow: 0 6px 25px rgba(44, 82, 130, 0.4);
          border-color: #2c5282;
        }
        50% { 
          box-shadow: 0 8px 30px rgba(44, 82, 130, 0.6);
          border-color: #3182ce;
        }
        75% { 
          box-shadow: 0 6px 25px rgba(44, 82, 130, 0.4);
          border-color: #2c5282;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDialog') {
      updateDialogResult(request);
    } else if (request.action === 'updateDialogStream') {
      updateDialogStreamResult(request);
    }
    return true;
  });
  
  // Update dialog with streaming AI result
  function updateDialogStreamResult(request) {
    const resultDiv = document.getElementById('betterme-result');
    const actionButtons = document.getElementById('betterme-action-buttons');
    if (!resultDiv) return;
    
    // Reset result div styling for content display
    resultDiv.style.display = 'block';
    resultDiv.style.alignItems = 'unset';
    resultDiv.style.justifyContent = 'unset';
    
    let html = '<div style="color: #1f295c; text-align: right; line-height: 1.6;">';
    html += `<strong style="color: #1f295c;">סיכום:</strong><br>`;
    html += request.content.replace(/\n/g, '<br>');
    
    // Add streaming indicator if not complete
    if (!request.isComplete) {
      html += '<span style="animation: blink 1s infinite; color: #1f295c;">▊</span>';
      
      // Add blinking animation if not already added
      if (!document.getElementById('betterme-streaming-style')) {
        const style = document.createElement('style');
        style.id = 'betterme-streaming-style';
        style.textContent = `
          @keyframes blink { 
            0%, 50% { opacity: 1; } 
            51%, 100% { opacity: 0; } 
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    html += '</div>';
    resultDiv.innerHTML = html;
    
    // Show action buttons when streaming is complete
    if (request.isComplete && actionButtons) {
      actionButtons.style.display = 'flex';
    } else if (actionButtons) {
      actionButtons.style.display = 'none';
    }
  }
  
  // Update dialog with AI result or error
  function updateDialogResult(request) {
    const resultDiv = document.getElementById('betterme-result');
    const actionButtons = document.getElementById('betterme-action-buttons');
    if (!resultDiv) return;
    
    if (request.type === 'error') {
      resultDiv.innerHTML = `
        <div style="background: white; border-radius: 8px; color: #e53e3e; text-align: right;">
          ❌ ${request.content}
        </div>
      `;
      // Hide action buttons on error
      if (actionButtons) {
        actionButtons.style.display = 'none';
      }
    } else if (request.type === 'result') {
      // Reset result div styling for content display
      resultDiv.style.display = 'block';
      resultDiv.style.alignItems = 'unset';
      resultDiv.style.justifyContent = 'unset';
      
      let html = '<div style="color: #1f295c; text-align: right; line-height: 1.6;">';
      
      if (request.originalAction === 'ask' && request.question) {
        html += `<div style="background: #f7fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-right: 3px solid #1f295c;">`;
        html += `<strong style="color: #1f295c;">שאלה:</strong><br>${request.question.replace(/\n/g, '<br>')}`;
        html += `</div>`;
        html += `<strong style="color: #1f295c;">תשובה:</strong><br>`;
      } else {
        html += `<strong style="color: #1f295c;">סיכום:</strong><br>`;
      }
      
      html += `${request.content.replace(/\n/g, '<br>')}</div>`;
      resultDiv.innerHTML = html;
      
      // Show action buttons after result is loaded
      if (actionButtons) {
        actionButtons.style.display = 'block';
      }
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
    dialog.innerHTML = `
      <div id="betterme-header" style="background: white; color: #1f295c; padding: 20px; position: relative; border-bottom: 2px solid #e2e8f0; cursor: move; user-select: none;">
        <button id="betterme-close" style="position: absolute; top: 15px; left: 15px; background: none; border: none; color: #1f295c; font-size: 24px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">✕</button>        <div style="display: flex; align-items: center; gap: 15px; pointer-events: none;">
          <div style="position: relative; display: inline-block; pointer-events: auto;">
            <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="
              width: 40px; 
              height: 40px; 
              cursor: pointer;
              border-radius: 8px;
              padding: 4px;
              transition: all 0.2s ease;
              border: 2px solid transparent;
            " alt="Better Me" id="betterme-logo-settings" title="⚙️ לחץ לפתיחת הגדרות">
            <span style="
              position: absolute;
              bottom: -2px;
              right: -2px;
              background: #1f295c;
              color: white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              pointer-events: none;
            ">⚙</span>
          </div>
          <div>
            <h2 style="margin: 0; font-size: 24px; color: #1f295c;">Better Me</h2>
            <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 14px;">עוזר AI חכם לסיכום ושאלות • גרור כדי להזיז • לחץ על הלוגו להגדרות</p>
          </div>
        </div>
      </div>
        <div style="padding: 30px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">          <button id="betterme-summarize-page" style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;background: white; color: #1f295c; border: none; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            סכם את הדף
          </button>          <button id="betterme-summarize-selection" style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;background: white; color: #1f295c; border: none; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            סכם טקסט נבחר
          </button>          <button id="betterme-ask-page" style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;background: white; color: #1f295c; border: none; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            שאל על הדף
          </button>          <button id="betterme-ask-selection" style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;background: white; color: #1f295c; border: none; padding: 15px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s;">
            שאל על הטקסט
          </button>
        </div>
          <div id="betterme-question-area" style="display: none; margin-bottom: 20px;">
          <textarea id="betterme-question-input" placeholder="כתוב את השאלה שלך כאן..." style="width: 94%; height: 80px; padding: 12px; border: 2px solid #1f295c; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; direction: rtl; color: #1f295c;"></textarea>
          <div style="margin-top: 10px; text-align: left;">
            <button id="betterme-send-question" style="background: #1f295c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-left: 10px;">שלח שאלה</button>
            <button id="betterme-cancel-question" style="background: white; color: #1f295c; border: 2px solid #e2e8f0; padding: 10px 20px; border-radius: 6px; cursor: pointer;">ביטול</button>
          </div>
        </div>          <div id="betterme-result" style="background: white; border: none; border-radius: 8px; padding: 15px; min-height: 50px; max-height: 300px; overflow-y: auto; display: flex; align-items: center; justify-content: center; color: #4a5568; font-style: italic;">
          לחץ על אחד מהכפתורים למעלה כדי להתחיל
        </div>
        
        <!-- Action buttons section for results -->
        <div id="betterme-action-buttons" style="margin-top: 20px; display: none;">
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="betterme-copy-result" style="
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
              <span style="color: #1f295c; font-size: 16px; font-weight: bold;">📄</span> העתק סיכום
            </button>
            
            <button id="betterme-translate-result" style="
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
            
            <button id="betterme-rewrite-result" style="
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
  function setupDialogEventListeners(overlay, dialog) {
    // Make dialog draggable
    makeDraggable(dialog);
    
    // Close button
    dialog.querySelector('#betterme-close').addEventListener('click', () => {
      closeBetterMeDialog(overlay);
    });
      // Close button hover effect with animation
    const closeButton = dialog.querySelector('#betterme-close');
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = '#f7fafc';
      closeButton.style.transform = 'scale(1.1) rotate(90deg)';
      closeButton.style.transition = 'all 0.3s ease';
      closeButton.style.color = '#e53e3e';
    });    closeButton.addEventListener('mouseleave', () => {
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
      sendQuestion();    });
    
    dialog.querySelector('#betterme-cancel-question').addEventListener('click', () => {
      hideQuestionArea();
    });
    
    // Action buttons for results
    dialog.querySelector('#betterme-copy-result').addEventListener('click', () => {
      copyResultToClipboard();
    });
    
    dialog.querySelector('#betterme-translate-result').addEventListener('click', () => {
      translateResult();
    });
    
    dialog.querySelector('#betterme-rewrite-result').addEventListener('click', () => {
      rewriteResult();
    });
      // Logo click for settings
    dialog.querySelector('#betterme-logo-settings').addEventListener('click', () => {
      console.log('🔧 Logo clicked, opening settings...');
      
      // Visual feedback
      const logoSettings = dialog.querySelector('#betterme-logo-settings');
      const originalTitle = logoSettings.title;
      logoSettings.title = '🔧 פותח הגדרות...';
      logoSettings.style.opacity = '0.5';
      
      // Show temporary message
      const resultDiv = document.getElementById('betterme-result');
      const originalContent = resultDiv.innerHTML;
      resultDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
          <div style="width: 20px; height: 20px; border: 2px solid #1f295c; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          פותח הגדרות בטאב חדש...
        </div>
      `;
      
      // Send message to background to open settings
      chrome.runtime.sendMessage({action: 'openSettings'});
      
      // Reset after delay
      setTimeout(() => {
        logoSettings.title = originalTitle;
        logoSettings.style.opacity = '1';
        resultDiv.innerHTML = originalContent;
      }, 2000);
      
      // Close current dialog after a brief delay
      setTimeout(() => {
        closeBetterMeDialog(overlay);
      }, 1000);
    });
    
    // Logo hover effect with tooltip
    const logoSettings = dialog.querySelector('#betterme-logo-settings');
    logoSettings.style.cursor = 'pointer';
    logoSettings.title = '⚙️ לחץ לפתיחת הגדרות';
    
    logoSettings.addEventListener('mouseenter', () => {
      logoSettings.style.opacity = '0.8';
      logoSettings.style.transform = 'scale(1.1)';
      logoSettings.style.transition = 'all 0.2s ease';
      logoSettings.style.filter = 'brightness(1.2)';
      logoSettings.style.borderColor = '#1f295c';
      logoSettings.style.backgroundColor = '#f7fafc';
    });
    logoSettings.addEventListener('mouseleave', () => {
      logoSettings.style.opacity = '1';
      logoSettings.style.transform = 'scale(1)';
      logoSettings.style.filter = 'brightness(1)';
      logoSettings.style.borderColor = 'transparent';
      logoSettings.style.backgroundColor = 'transparent';
    });
    
    // Logo click animation
    logoSettings.addEventListener('mousedown', () => {
      logoSettings.style.transform = 'scale(0.95)';
      logoSettings.style.transition = 'all 0.1s ease';
    });
    logoSettings.addEventListener('mouseup', () => {
      logoSettings.style.transform = 'scale(1.1)';
      logoSettings.style.transition = 'all 0.1s ease';
    });      // Button hover effects
    const buttons = dialog.querySelectorAll('button[id^="betterme-"]');
    buttons.forEach(button => {
      if (button.id !== 'betterme-close') {
        button.addEventListener('mouseenter', () => {
          if (button.id === 'betterme-send-question') {
            button.style.background = '#1a365d';
          } else if (button.id === 'betterme-cancel-question') {
            button.style.background = '#f7fafc';
            button.style.borderColor = '#1f295c';
          } else {
            button.style.background = '#1f295c';
            button.style.color = 'white';
          }
          button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', () => {
          if (button.id === 'betterme-send-question') {
            button.style.background = '#1f295c';
          } else if (button.id === 'betterme-cancel-question') {
            button.style.background = 'white';
            button.style.borderColor = '#e2e8f0';
          } else {
            button.style.background = 'white';
            button.style.color = '#1f295c';
          }
          button.style.transform = 'translateY(0)';
        });
      }
    });
  }
  
  // Make dialog draggable by header
  function makeDraggable(dialogElement) {
    const header = dialogElement.querySelector('#betterme-header');
    if (!header) return;
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    header.style.cursor = 'move';
    
    // Mouse events
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    
    // Touch events for mobile
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', dragMove);
    document.addEventListener('touchend', dragEnd);
    
    function dragStart(e) {
      // Don't drag if clicking on close button or logo
      if (e.target.id === 'betterme-close' || 
          e.target.id === 'betterme-logo-settings' || 
          e.target.closest('#betterme-close') || 
          e.target.closest('#betterme-logo-settings')) {
        return;
      }
      
      e.preventDefault();
      
      // Add visual feedback
      header.style.backgroundColor = '#f8f9fa';
      header.style.borderColor = '#1f295c';
      dialogElement.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
      
      if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
      } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      }
      
      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
      }
    }
    
    function dragMove(e) {
      if (isDragging) {
        e.preventDefault();
        
        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }
        
        xOffset = currentX;
        yOffset = currentY;
        
        // Keep dialog within viewport bounds
        const rect = dialogElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        // Constrain position
        xOffset = Math.max(-rect.width / 2, Math.min(maxX - rect.width / 2, xOffset));
        yOffset = Math.max(-rect.height / 2, Math.min(maxY - rect.height / 2, yOffset));
        
        dialogElement.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      }
    }
    
    function dragEnd(e) {
      if (isDragging) {
        // Remove visual feedback
        header.style.backgroundColor = 'white';
        header.style.borderColor = '#e2e8f0';
        dialogElement.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
        
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      }
    }
  }

  // Close dialog function
  function closeBetterMeDialog(overlay) {
    overlay.style.opacity = '0';
    overlay.querySelector('#betterme-dialog').style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      // Resume bubble animations after dialog closes
      const bubble = document.getElementById('betterme-bubble');
      if (bubble && !bubble.matches(':hover')) {
        bubble.style.animation = 'bubbleFloat 3s ease-in-out infinite, bubblePulse 2s ease-in-out infinite';
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
      <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
        <div style="width: 20px; height: 20px; border: 2px solid #1f295c; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
      <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
        <div style="width: 20px; height: 20px; border: 2px solid #1f295c; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
  
  // Copy result to clipboard
  function copyResultToClipboard() {
    const resultDiv = document.getElementById('betterme-result');
    const textContent = resultDiv.textContent || resultDiv.innerText;
    
    // Remove loading text and get clean result
    const cleanText = textContent.replace(/מסכם עם AI\.\.\.|מחפש תשובה\.\.\.|לחץ על אחד מהכפתורים למעלה כדי להתחיל/g, '').trim();
    
    if (cleanText) {
      navigator.clipboard.writeText(cleanText).then(() => {
        // Show temporary success message
        const copyBtn = document.getElementById('betterme-copy-result');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span style="color: #22c55e;">✓ הועתק!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('שגיאה בהעתקה');
      });
    }
  }
  
  // Translate result
  function translateResult() {
    const resultDiv = document.getElementById('betterme-result');
    const textContent = resultDiv.textContent || resultDiv.innerText;
    
    // Remove loading text and get clean result
    const cleanText = textContent.replace(/מסכם עם AI\.\.\.|מחפש תשובה\.\.\.|לחץ על אחד מהכפתורים למעלה כדי להתחיל/g, '').trim();
    
    if (!cleanText) {
      alert('אין תוכן לתרגום');
      return;
    }
    
    // Show loading state
    resultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
        <div style="width: 20px; height: 20px; border: 2px solid #1f295c; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        מתרגם...
      </div>
    `;
    
    // Send translation request
    chrome.runtime.sendMessage({
      action: 'translateText',
      text: cleanText,
      targetLanguage: 'english'
    }, (response) => {
      if (response && response.success) {
        resultDiv.innerHTML = `
          <div style="color: #1f295c; text-align: right; line-height: 1.6;">
            <strong style="color: #1f295c;">תרגום:</strong><br>
            ${response.translatedText.replace(/\n/g, '<br>')}
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div style="color: #e53e3e; text-align: right;">
            ❌ שגיאה בתרגום: ${response ? response.error : 'שגיאה לא ידועה'}
          </div>
        `;
      }
    });
  }
  
  // Rewrite result
  function rewriteResult() {
    const resultDiv = document.getElementById('betterme-result');
    const textContent = resultDiv.textContent || resultDiv.innerText;
    
    // Remove loading text and get clean result
    const cleanText = textContent.replace(/מסכם עם AI\.\.\.|מחפש תשובה\.\.\.|לחץ על אחד מהכפתורים למעלה כדי להתחיל/g, '').trim();
    
    if (!cleanText) {
      alert('אין תוכן לניסוח מחדש');
      return;
    }
    
    // Show loading state
    resultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #1f295c;">
        <div style="width: 20px; height: 20px; border: 2px solid #1f295c; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        מנסח מחדש...
      </div>
    `;
    
    // Send rewrite request
    chrome.runtime.sendMessage({
      action: 'rewriteSummary',
      originalText: '', // We don't have the original text in this context
      currentSummary: cleanText
    }, (response) => {
      if (response && response.success) {
        resultDiv.innerHTML = `
          <div style="color: #1f295c; text-align: right; line-height: 1.6;">
            <strong style="color: #1f295c;">ניסוח מחדש:</strong><br>
            ${response.rewrittenSummary.replace(/\n/g, '<br>')}
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div style="color: #e53e3e; text-align: right;">
            ❌ שגיאה בניסוח מחדש: ${response ? response.error : 'שגיאה לא ידועה'}
          </div>
        `;
      }
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
  } else if (request.action === 'translateText') {
    // Handle translation request
    handleTranslationRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'rewriteSummary') {
    // Handle rewrite summary request
    handleRewriteRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'openSettings') {
    // Open extension settings page
    console.log('🔧 Opening settings page...');
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
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
      chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage', 'enableStreaming'], async (settings) => {
        try {
          // Add tabId to request for streaming updates
          request.tabId = sender.tab.id;
          
          // Check if streaming is enabled
          const useStreaming = settings.enableStreaming || false;
          
          if (useStreaming) {
            // For streaming, we don't await the result but handle updates via streaming
            callAI(response.content, request, settings, true).catch(error => {
              console.error('Streaming AI API Error:', error);
              sendDialogMessage(sender.tab.id, 'error', 'שגיאה בקריאה למודל AI: ' + error.message);
            });
          } else {
            // Traditional non-streaming mode
            const result = await callAI(response.content, request, settings, false);
            sendDialogMessage(sender.tab.id, 'result', result, request.action, request.question);
          }
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

// Call AI API with streaming support
async function callAI(content, request, settings, isStreaming = false) {
  const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
  const modelName = settings.modelName || 'lmstudio-model';
  const apiType = settings.apiType || 'lmstudio';
  const summaryLanguage = settings.summaryLanguage || 'hebrew';
  const enableStreaming = settings.enableStreaming || false;
  
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
  const useStreaming = isStreaming && enableStreaming;
  
  if (apiType === 'ollama') {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: useStreaming,
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
      stream: useStreaming
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
  
  // Handle streaming response
  if (useStreaming && response.body) {
    return await handleStreamingResponse(response, apiType, request, settings);
  }
  
  // Handle non-streaming response
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

// Handle streaming response from AI API
async function handleStreamingResponse(response, apiType, request, settings) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.slice(6));
            let deltaContent = '';
            
            // Handle different API response formats
            if (apiType === 'ollama') {
              if (jsonData.response) {
                deltaContent = jsonData.response;
              }
            } else {
              // LMStudio/OpenAI format
              if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
                deltaContent = jsonData.choices[0].delta.content || '';
              }
            }
            
            if (deltaContent) {
              fullResponse += deltaContent;
              
              // Send partial update to dialog
              sendDialogStreamUpdate(request.tabId, fullResponse, false);
            }
            
            // Check if response is complete
            if (jsonData.done || (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].finish_reason)) {
              break;
            }
            
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError);
          }
        }
      }
    }
    
    // Send final complete response
    sendDialogStreamUpdate(request.tabId, fullResponse, true);
    return fullResponse;
    
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

// Send streaming update to dialog
function sendDialogStreamUpdate(tabId, content, isComplete) {
  chrome.tabs.sendMessage(tabId, {
    action: 'updateDialogStream',
    content: content,
    isComplete: isComplete
  });
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

// Handle floating menu summary request with streaming support
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
    chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage', 'enableStreaming'], async (settings) => {
      try {
        const useStreaming = settings.enableStreaming || false;
        
        if (useStreaming) {
          // Setup streaming callback
          const onStreamUpdate = (content, isComplete) => {
            // Send streaming update to content script
            chrome.tabs.sendMessage(sender.tab.id, {
              action: 'updateSummaryStream',
              content: content,
              isComplete: isComplete
            });
          };
          
          // Start streaming
          const result = await callAIForSummary(request.content, settings, true, onStreamUpdate);
          
          sendResponse({
            success: true,
            result: result,
            streaming: true
          });
        } else {
          // Traditional non-streaming mode
          const result = await callAIForSummary(request.content, settings, false);
          sendResponse({
            success: true,
            result: result,
            streaming: false
          });
        }
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

// Call AI API specifically for summary (simplified version) with streaming support
async function callAIForSummary(content, settings, useStreaming = false, onStreamUpdate = null) {
  const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
  const modelName = settings.modelName || 'lmstudio-model';
  const apiType = settings.apiType || 'lmstudio';
  const summaryLanguage = settings.summaryLanguage || 'hebrew';
  const enableStreaming = settings.enableStreaming || false;
  
  if (!apiUrl) {
    throw new Error('נא להזין כתובת API בהגדרות');
  }
  
  const prompt = createSummaryPrompt(content, summaryLanguage);
  
  // Prepare request body based on API type
  let requestBody;
  const streamingEnabled = useStreaming && enableStreaming;
  
  if (apiType === 'ollama') {
    requestBody = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: streamingEnabled,
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
      stream: streamingEnabled
    };
  }
  
  console.log('🤖 Sending floating menu request to AI:', apiUrl, 'Streaming:', streamingEnabled);
  
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
  
  // Handle streaming response
  if (streamingEnabled && response.body && onStreamUpdate) {
    return await handleStreamingResponseForSummary(response, apiType, onStreamUpdate);
  }
  
  // Handle non-streaming response
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

// Handle streaming response for floating menu summary
async function handleStreamingResponseForSummary(response, apiType, onStreamUpdate) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.slice(6));
            let deltaContent = '';
            
            // Handle different API response formats
            if (apiType === 'ollama') {
              if (jsonData.response) {
                deltaContent = jsonData.response;
              }
            } else {
              // LMStudio/OpenAI format
              if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
                deltaContent = jsonData.choices[0].delta.content || '';
              }
            }
            
            if (deltaContent) {
              fullResponse += deltaContent;
              
              // Call streaming update callback
              if (onStreamUpdate) {
                onStreamUpdate(fullResponse, false);
              }
            }
            
            // Check if response is complete
            if (jsonData.done || (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].finish_reason)) {
              break;
            }
            
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError);
          }
        }
      }
    }
    
    // Send final complete response
    if (onStreamUpdate) {
      onStreamUpdate(fullResponse, true);
    }
    
    return fullResponse;
    
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

// Handle translation request
async function handleTranslationRequest(request, sendResponse) {
  try {
    console.log('🌐 Translation request received:', request);
    
    // Get stored settings
    const settings = await getStoredSettings();
    
    // Create translation prompt
    const translationPrompt = createTranslationPrompt(request.text, request.targetLanguage);
    
    // Call AI for translation
    const translatedText = await callAIForSummary(translationPrompt, settings);
    
    console.log('🌐 Translation completed successfully');
    sendResponse({
      success: true,
      translatedText: translatedText
    });
    
  } catch (error) {
    console.error('🌐 Translation error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle rewrite summary request
async function handleRewriteRequest(request, sendResponse) {
  try {
    console.log('✏️ Rewrite request received:', request);
    
    // Get stored settings
    const settings = await getStoredSettings();
    
    // Create rewrite prompt
    const rewritePrompt = createRewritePrompt(request.originalText, request.currentSummary);
    
    // Call AI for rewriting
    const rewrittenSummary = await callAIForSummary(rewritePrompt, settings);
    
    console.log('✏️ Rewrite completed successfully');
    sendResponse({
      success: true,
      rewrittenSummary: rewrittenSummary
    });
    
  } catch (error) {
    console.error('✏️ Rewrite error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Create translation prompt
function createTranslationPrompt(text, targetLanguage) {
  const languageMap = {
    'hebrew': 'עברית',
    'english': 'אנגלית',
    'arabic': 'ערבית',
    'spanish': 'ספרדית',
    'french': 'צרפתית'
  };
  
  const targetLangHebrew = languageMap[targetLanguage] || 'אנגלית';
  
  return `תרגם את הטקסט הבא ל${targetLangHebrew}. השאר את המשמעות והטון המקוריים:

${text}

התרגום:`;
}

// Create rewrite prompt
function createRewritePrompt(originalText, currentSummary) {
  return `בהתבסס על הטקסט המוקרן הבא:

${originalText}

הסיכום הנוכחי הוא:
${currentSummary}

אנא נסח מחדש את הסיכום בצורה שונה, תוך שמירה על כל הנקודות החשובות אך במילים ובמבנה שונים. הפוך אותו לקריא יותר ובעל זרימה טובה יותר:

סיכום מנוסח מחדש:`;
}

// Get stored settings (helper function)
async function getStoredSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiUrl: 'http://localhost:1234/v1/chat/completions',
      modelName: 'aya',
      apiType: 'lmstudio',
      summaryLanguage: 'hebrew'
    }, resolve);
  });
}
