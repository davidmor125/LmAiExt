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

// Main initialization function
function initBetterMe() {
  // Check if already initialized
  if (document.getElementById('betterme-bubble')) {
    return;
  }
  
  // Function to create floating context menu for selected text
  function createFloatingContextMenu() {
    // Remove existing menu if any
    const existingMenu = document.getElementById('betterme-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'betterme-context-menu';    menu.innerHTML = `
      <div style="display: flex; gap: 8px;">
        <button id="betterme-context-ask-btn" style="
          background: rgba(255, 255, 255, 0.9);
          color: #182857;
          border: 1px solid rgba(233, 236, 239, 0.7);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          white-space: nowrap;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        ">
          <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 16px; height: 16px;" alt="Better Me">
          שאל Better Me
        </button>
        <button id="betterme-context-summary-btn" style="
          background: rgba(255, 255, 255, 0.9);
          color: #182857;
          border: 1px solid rgba(233, 236, 239, 0.7);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          white-space: nowrap;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        ">
          <img src="${chrome.runtime.getURL('icons/numbers.png')}" style="width: 16px; height: 16px;" alt="Summary">
          סכם
        </button>
      </div>
    `;menu.style.cssText = `
      position: absolute;
      z-index: 999997;
      display: none;
      pointer-events: all;
      animation: fadeInUp 0.3s ease;
      background: transparent;
      border-radius: 12px;
      padding: 8px;
    `;
    
    // Add CSS animation
    if (!document.getElementById('betterme-context-animations')) {
      const style = document.createElement('style');
      style.id = 'betterme-context-animations';
      style.textContent = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `;
      document.head.appendChild(style);
    }    // Add hover effects for both buttons
    const contextAskBtn = menu.querySelector('#betterme-context-ask-btn');
    const contextSummaryBtn = menu.querySelector('#betterme-context-summary-btn');
    
    // Hover effects for Ask button
    contextAskBtn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255, 255, 255, 0.95)';
      this.style.color = '#182857';
      this.style.transform = 'scale(1.05)';
      this.style.boxShadow = '0 8px 25px rgba(24, 40, 87, 0.25)';
      this.style.backdropFilter = 'blur(15px)';
      this.style.webkitBackdropFilter = 'blur(15px)';
    });
    
    contextAskBtn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(255, 255, 255, 0.9)';
      this.style.color = '#182857';
      this.style.transform = 'scale(1)';
      this.style.borderColor = 'rgba(233, 236, 239, 0.7)';
      this.style.backdropFilter = 'blur(10px)';
      this.style.webkitBackdropFilter = 'blur(10px)';
    });
    
    // Hover effects for Summary button
    contextSummaryBtn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255, 255, 255, 0.95)';
      this.style.color = '#182857';
      this.style.transform = 'scale(1.05)';
      this.style.boxShadow = '0 8px 25px rgba(24, 40, 87, 0.25)';
      this.style.backdropFilter = 'blur(15px)';
      this.style.webkitBackdropFilter = 'blur(15px)';
    });
    
    contextSummaryBtn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(255, 255, 255, 0.9)';
      this.style.color = '#182857';
      this.style.transform = 'scale(1)';
      this.style.borderColor = 'rgba(233, 236, 239, 0.7)';
      this.style.backdropFilter = 'blur(10px)';
      this.style.webkitBackdropFilter = 'blur(10px)';
    });    // Add click handlers
    contextAskBtn.addEventListener('click', function() {
      // Open the main dialog
      if (!document.getElementById('betterme-overlay')) {
        injectBetterMeDialog();
      } else {
        document.getElementById('betterme-overlay').style.display = 'flex';
      }
      
      // Hide the context menu
      menu.style.display = 'none';
    });
    
    contextSummaryBtn.addEventListener('click', function() {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        showQuickSummaryDialog(selectedText);
      }
      
      // Hide the context menu
      menu.style.display = 'none';
    });
    
    document.body.appendChild(menu);
    return menu;
  }
  
  // Function to show context menu at selection
  function showContextMenuAtSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim().length === 0) {
      return;
    }
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    
    const menu = document.getElementById('betterme-context-menu') || createFloatingContextMenu();
    
    // Position the menu above the selection
    const menuX = rect.left + (rect.width / 2);
    const menuY = rect.top - 10; // 10px above selection
      // Adjust position to keep menu within viewport
    const menuWidth = 280; // Approximate width for two buttons
    const adjustedX = Math.max(10, Math.min(menuX - menuWidth/2, window.innerWidth - menuWidth - 10));
    const adjustedY = Math.max(10, menuY);
    
    menu.style.left = adjustedX + 'px';
    menu.style.top = (adjustedY + window.scrollY) + 'px';
    menu.style.display = 'block';
    
    // Auto-hide after 5 seconds
    clearTimeout(menu.hideTimeout);
    menu.hideTimeout = setTimeout(() => {
      if (menu && menu.style.display === 'block') {
        menu.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          menu.style.display = 'none';
          menu.style.animation = '';
        }, 300);
      }
    }, 5000);
  }
  
  // Function to hide context menu
  function hideContextMenu() {
    const menu = document.getElementById('betterme-context-menu');
    if (menu) {
      menu.style.display = 'none';
    }
  }

  // Function to create floating bubble button
  function createFloatingBubble() {
    const bubble = document.createElement('div');
    bubble.id = 'betterme-bubble';
    bubble.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 53px; height: 52px;" alt="Better Me">
    `;
    bubble.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #182857, #152247);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999998;
      box-shadow: 0 4px 20px rgba(24, 40, 87, 0.3);
      transition: all 0.3s ease;
      
    `;
    
    // Add hover effects
    bubble.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 25px rgba(24, 40, 87, 0.4)';
    });
    
    bubble.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 20px rgba(24, 40, 87, 0.3)';
    });
      // Add click event to open dialog
    bubble.addEventListener('click', function() {
      // Open the dialog (keep bubble visible)
      if (!document.getElementById('betterme-overlay')) {
        injectBetterMeDialog();
      } else {
        document.getElementById('betterme-overlay').style.display = 'flex';
      }
    });
    
    // Add to page
    document.body.appendChild(bubble);
  }
    // Function to make dialog draggable
  function makeDraggable(element) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Create a drag handle area (the header area)
    const header = element.querySelector('#betterme-header');
    
    header.addEventListener('mousedown', function(e) {
      // Don't start dragging if clicking on close button
      if (e.target.id === 'betterme-close' || e.target.closest('#betterme-close')) {
        return;
      }
      
      isDragging = true;
      const rect = element.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      // Prevent text selection during drag
      e.preventDefault();
      document.body.style.userSelect = 'none';
      
      // Add visual feedback
      header.style.background = 'linear-gradient(135deg, #e9ecef, #f8f9fa)';
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      // Keep dialog within viewport bounds
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      
      const boundedX = Math.max(0, Math.min(x, maxX));
      const boundedY = Math.max(0, Math.min(y, maxY));
      
      element.style.left = boundedX + 'px';
      element.style.top = boundedY + 'px';
    });
    
    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';
        
        // Reset visual feedback
        const header = element.querySelector('#betterme-header');
        header.style.background = 'linear-gradient(135deg, #f8f9fa, #ffffff)';
      }
    });
  }

  // Function that will be injected into the page
  function injectBetterMeDialog() {
    // Check if dialog already exists
    if (document.getElementById('betterme-overlay')) {
      document.getElementById('betterme-overlay').style.display = 'flex';
      return;
    }    // Create floating bubble button if it doesn't exist
    if (!document.getElementById('betterme-bubble')) {
      createFloatingBubble();
    }    // Create overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'betterme-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 999999;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      box-sizing: border-box;
    `;
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = 'betterme-dialog';
  dialog.style.cssText = `
    background: white;
    border-radius: 16px;
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 2px solid #182857;
    position: fixed;
    top: 20px;
    right: 20px;
    cursor: move;
  `;
    // Create dialog content
  dialog.innerHTML = `
    <div id="betterme-header" style="color: #18285f; padding: 20px; position: relative; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #f8f9fa, #ffffff); cursor: move;">
      <button id="betterme-close" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 18px;
        cursor: pointer;
        color: #182857;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;      ">✕</button>
      <div style="position: absolute; top: 15px; left: 15px; color: #999; font-size: 16px; pointer-events: none;">⋮⋮</div>
      <h1 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 24px;">
        <span id="betterme-logo" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.3s; display: flex; align-items: center; gap: 8px; background: white;">
          <img src="${chrome.runtime.getURL('icons/chat_icon.png')}" style="width: 32px; height: 32px; vertical-align: middle;" alt="Better Me Icon">
          Better Me
        </span>
      </h1>
    </div>
    
    <div id="betterme-content" style="padding: 25px; max-height: 50vh; overflow-y: auto;">
      <div id="betterme-settings" style="display: none;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">API URL:</label>
          <input type="text" id="betterme-apiUrl" value="http://localhost:1234/v1/chat/completions" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 6px; box-sizing: border-box;">
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">שם המודל:</label>
          <select id="betterme-modelName" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 6px;">
            <option value="aya">AYA (Ollama)</option>
            <option value="aya:8b">AYA 8B (Ollama)</option>
            <option value="aya:35b">AYA 35B (Ollama)</option>
            <option value="lmstudio-model" selected>LMStudio Model</option>
          </select>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">שפת הסיכום:</label>
          <select id="betterme-language" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 6px;">
            <option value="hebrew" selected>עברית</option>
            <option value="english">English</option>
            <option value="arabic">العربية</option>
          </select>
        </div>
      </div>        <div style="margin-bottom: 15px;">
        <button id="betterme-summarize-smart" style="
          width: 100%;
          background: linear-gradient(135deg, #182857, #152247);
          color: white;
          padding: 16px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        ">
          <img src="${chrome.runtime.getURL('icons/numbers.png')}" style="width: 18px; height: 18px;" alt="Summary Icon">
          <span id="betterme-summary-text">סכם את הדף</span>
        </button>
      </div><div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="direction: rtl; text-align: right;">
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-weight: 600; justify-content: flex-start;">
          <img src="${chrome.runtime.getURL('icons/ask.png')}" style="width: 20px; height: 20px;" alt="Ask Icon">
          שאל שאלה על התוכן:
        </label>
        </div>
        <textarea id="betterme-question" placeholder="הקלד כאן את השאלה שלך..." style="
          width: 100%;
          min-height: 80px;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 6px;
          box-sizing: border-box;
          resize: vertical;
          direction: rtl;
          text-align: right;
        "></textarea>        <div style="display: flex; gap: 10px; margin-top: 12px;">
          <button id="betterme-ask-smart" style="
            width: 100%;
            background: #ffffff;
            color: #182857;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: center;
          ">
            <img src="${chrome.runtime.getURL('icons/ask.png')}" style="width: 16px; height: 16px;" alt="Ask Icon">
            <span id="betterme-ask-text">שאל על הדף</span>
          </button>
        </div>
      </div>
      
      <div id="betterme-result"></div>
    </div>
  `;
    // Add dialog to overlay
  overlay.appendChild(dialog);
  
  // Add overlay to page
  document.body.appendChild(overlay);
    // Make dialog draggable
  makeDraggable(dialog);
    // Function to update summary button text based on selection
  function updateSummaryButton() {
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
  }
  
  // Update button text initially
  updateSummaryButton();
  
  // Update button text when dialog is shown or selection changes
  const observer = new MutationObserver(() => {
    updateSummaryButton();
  });
  
  // Listen to selection changes
  document.addEventListener('selectionchange', updateSummaryButton);
  
  // Setup event listeners directly here
  // Close button
  document.getElementById('betterme-close').addEventListener('click', function() {
    document.getElementById('betterme-overlay').style.display = 'none';
  });
    // Close on backdrop click
  document.getElementById('betterme-overlay').addEventListener('click', function(e) {
    if (e.target.id === 'betterme-overlay') {
      document.getElementById('betterme-overlay').style.display = 'none';
    }
  });
  
  // Logo click for settings toggle
  document.getElementById('betterme-logo').addEventListener('click', function() {
    const settings = document.getElementById('betterme-settings');
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
  });
    // Smart summarize button - detects if text is selected
  document.getElementById('betterme-summarize-smart').addEventListener('click', function() {
    const selection = window.getSelection().toString().trim();
    const resultDiv = document.getElementById('betterme-result');
    
    if (selection.length > 0) {
      // Summarize selected text
      resultDiv.innerHTML = '<div style="text-align: center; color: #666;">מעבד טקסט נבחר...</div>';
      chrome.runtime.sendMessage({
        action: 'summarize',
        content: selection,
        type: 'selection'
      });
    } else {
      // Summarize entire page
      resultDiv.innerHTML = '<div style="text-align: center; color: #666;">מעבד תוכן הדף...</div>';
      const content = document.body.innerText.substring(0, 3000);
      chrome.runtime.sendMessage({
        action: 'summarize',
        content: content,
        type: 'page'
      });
    }
  });
  // Smart ask button - detects if text is selected
  document.getElementById('betterme-ask-smart').addEventListener('click', function() {
    const question = document.getElementById('betterme-question').value.trim();
    const selection = window.getSelection().toString().trim();
    const resultDiv = document.getElementById('betterme-result');
    
    if (!question) {
      resultDiv.innerHTML = '<div style="color: #dc3545;">אנא הקלד שאלה</div>';
      return;
    }
    
    if (selection.length > 0) {
      // Ask about selected text
      resultDiv.innerHTML = '<div style="text-align: center; color: #666;">מחפש תשובה על הטקסט המסומן...</div>';
      chrome.runtime.sendMessage({
        action: 'ask',
        question: question,
        content: selection,
        type: 'selection'
      });
    } else {
      // Ask about entire page
      const content = document.body.innerText.substring(0, 3000);
      resultDiv.innerHTML = '<div style="text-align: center; color: #666;">מחפש תשובה על הדף...</div>';
      chrome.runtime.sendMessage({
        action: 'ask',
        question: question,
        content: content,
        type: 'page'
      });
    }
    
    // Clear the question input after sending
    document.getElementById('betterme-question').value = '';
  });
  // Add hover effects for smart ask button
  const askSmartBtn = document.getElementById('betterme-ask-smart');
  askSmartBtn.addEventListener('mouseenter', function() {
    this.style.background = '#2b407d';
    this.style.color = '#ffffff';
  });
  
  askSmartBtn.addEventListener('mouseleave', function() {
    this.style.background = '#ffffff';
    this.style.color = '#182857';
  });
  
  // Add hover effects for smart summarize button
  const summarizeSmartBtn = document.getElementById('betterme-summarize-smart');
  summarizeSmartBtn.addEventListener('mouseenter', function() {
    this.style.background = 'linear-gradient(135deg, #2b407d, #1f3659)';
  });
  
  summarizeSmartBtn.addEventListener('mouseleave', function() {
    this.style.background = 'linear-gradient(135deg, #182857, #152247)';
  });
  }
  
  // Create floating context menu
  createFloatingContextMenu();
  
  // Add selection event listeners for context menu
  document.addEventListener('mouseup', function(e) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection.toString().trim().length > 0) {
        showContextMenuAtSelection();
      } else {
        hideContextMenu();
      }
    }, 10);
  });
  
  document.addEventListener('keyup', function(e) {
    // Handle keyboard selection (Shift+Arrow keys, Ctrl+A, etc.)
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection.toString().trim().length > 0) {
        showContextMenuAtSelection();
      } else {
        hideContextMenu();
      }
    }, 10);
  });
  
  // Hide context menu when clicking elsewhere
  document.addEventListener('mousedown', function(e) {
    const menu = document.getElementById('betterme-context-menu');
    if (menu && !menu.contains(e.target)) {
      hideContextMenu();
    }
  });
  
  // Hide context menu when scrolling
  document.addEventListener('scroll', function() {
    hideContextMenu();
  });  
  // Create floating bubble button
  createFloatingBubble();
  
  // Function to show quick summary dialog
  function showQuickSummaryDialog(selectedText) {
    // Remove any existing summary dialog
    const existingSummary = document.getElementById('betterme-quick-summary');
    if (existingSummary) {
      existingSummary.remove();
    }
    
    // Get the selection position
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Create summary dialog
    const summaryDialog = document.createElement('div');
    summaryDialog.id = 'betterme-quick-summary';
    summaryDialog.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(233, 236, 239, 0.8);
        border-radius: 12px;
        padding: 16px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        animation: fadeInUp 0.3s ease;
        direction: rtl;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(233, 236, 239, 0.5);
        ">
          <h3 style="
            margin: 0;
            color: #182857;
            font-size: 16px;
            font-weight: 600;
          ">סיכום מהיר</h3>
          <button id="summary-close-btn" style="
            background: none;
            border: none;
            font-size: 18px;
            color: #6c757d;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s ease;
          ">×</button>
        </div>
        <div id="summary-content" style="
          color: #495057;
          font-size: 14px;
          line-height: 1.5;
          max-height: 300px;
          overflow-y: auto;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: #6c757d;
            font-size: 13px;
          ">
            <div style="
              width: 16px;
              height: 16px;
              border: 2px solid #007bff;
              border-top-color: transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            מכין סיכום...
          </div>
        </div>
      </div>
    `;
    
    summaryDialog.style.cssText = `
      position: fixed;
      z-index: 999999;
      pointer-events: all;
    `;
    
    // Position the dialog near the selected text
    const dialogX = Math.max(10, Math.min(rect.left, window.innerWidth - 420));
    const dialogY = rect.bottom + 10;
    
    // If dialog would go below viewport, show it above the selection
    const finalY = (dialogY + 200 > window.innerHeight) 
      ? Math.max(10, rect.top - 220) 
      : dialogY;
    
    summaryDialog.style.left = dialogX + 'px';
    summaryDialog.style.top = finalY + 'px';
    
    // Add spinner animation
    if (!document.getElementById('betterme-spinner-style')) {
      const spinnerStyle = document.createElement('style');
      spinnerStyle.id = 'betterme-spinner-style';
      spinnerStyle.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(spinnerStyle);
    }
    
    document.body.appendChild(summaryDialog);
    
    // Add close button handler
    const closeBtn = summaryDialog.querySelector('#summary-close-btn');
    closeBtn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(108, 117, 125, 0.1)';
    });
    closeBtn.addEventListener('mouseleave', function() {
      this.style.background = 'none';
    });
    closeBtn.addEventListener('click', function() {
      summaryDialog.remove();
    });
    
    // Close on click outside
    setTimeout(() => {
      const closeOnOutside = (e) => {
        if (!summaryDialog.contains(e.target)) {
          summaryDialog.remove();
          document.removeEventListener('click', closeOnOutside);
        }
      };
      document.addEventListener('click', closeOnOutside);
    }, 100);
    
    // Get summary from AI
    getSummaryForText(selectedText, summaryDialog);
  }
    // Function to get AI summary
  async function getSummaryForText(text, dialogElement) {
    console.log('🎯 getSummaryForText started with text length:', text.length);
    
    try {
      const summaryContent = dialogElement.querySelector('#summary-content');
      
      // Get settings from storage
      console.log('⚙️ Getting settings from storage...');
      const settings = await chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage']);
      
      const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
      const modelName = settings.modelName || 'lmstudio-model';
      const apiType = settings.apiType || 'lmstudio';
      const language = settings.summaryLanguage || 'hebrew';
      
      console.log('⚙️ Using settings:', { apiUrl, modelName, apiType, language });
      
      // Create summary prompt
      console.log('📝 Creating summary prompt...');
      const prompt = createSummaryPrompt(text, language);
      console.log('📝 Prompt created, length:', prompt.length);
      
      // Call AI API using existing function
      console.log('🚀 Calling AI API...');
      const summary = await callAI(prompt, { apiUrl, modelName, apiType });
      console.log('✅ AI response received, length:', summary.length);
      
      summaryContent.innerHTML = `
        <div style="color: #495057; line-height: 1.6;">
          ${summary}
        </div>
      `;
      
      console.log('✅ Summary displayed successfully');        } catch (error) {
      console.error('❌ Error getting summary:', error);
      const summaryContent = dialogElement.querySelector('#summary-content');
      summaryContent.innerHTML = `
        <div style="color: #dc3545; font-size: 13px; line-height: 1.4;">
          <div style="margin-bottom: 10px;">
            <strong>⚠️ שגיאה בחיבור ל-AI</strong>
          </div>
          <div style="margin-bottom: 8px; font-size: 12px;">
            ${error.message.includes('fetch') ? 
              '🔴 אין חיבור לשרת AI' : 
              '🔧 בעיה בהגדרות API'}
          </div>
          <div style="margin-bottom: 10px; font-size: 12px; color: #6c757d;">
            <strong>שגיאה:</strong> ${error.message}
          </div>
          <button onclick="openSettings()" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            margin-top: 5px;
          ">פתח הגדרות</button>
        </div>
      `;
              '🔧 בעיה בהגדרות API'}
          </div>
          <div style="margin-bottom: 10px; font-size: 12px; color: #6c757d;">
            ${error.message.includes('fetch') ? 
              'וודא ש-LMStudio או Ollama פועלים' : 
              'בדוק הגדרות API בתוסף'}
          </div>
          <button onclick="openSettings()" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            margin-top: 5px;
          ">פתח הגדרות</button>
        </div>
      `;
      
      // Add click handler for settings button
      const settingsBtn = summaryContent.querySelector('button');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
          // Try to open the main extension dialog with settings
          if (!document.getElementById('betterme-overlay')) {
            injectBetterMeDialog();
          } else {
            document.getElementById('betterme-overlay').style.display = 'flex';
          }
          // Close summary dialog
          dialogElement.remove();
          // Auto-open settings in main dialog
          setTimeout(() => {
            const settingsToggle = document.querySelector('#betterme-settings-toggle');
            if (settingsToggle) settingsToggle.click();
          }, 500);
        });
      }
    }
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  openExtensionOverlay();
});

// Optional: Add context menu for quick access
chrome.runtime.onInstalled.addListener(() => {  chrome.contextMenus.create({
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
    // Process AI request
    processAIRequest(request, sender.tab.id);
  }
  return true;
});

// Process AI requests
async function processAIRequest(request, tabId) {
  try {
    // Get settings from storage
    const settings = await chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage']);
    const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
    const modelName = settings.modelName || 'lmstudio-model';
    const apiType = settings.apiType || 'lmstudio';
    const language = settings.summaryLanguage || 'hebrew';
    
    let prompt;
    if (request.action === 'summarize') {
      prompt = createSummaryPrompt(request.content, language);
    } else if (request.action === 'ask') {
      prompt = createQuestionPrompt(request.question, request.content, language);
    }
    
    // Call AI API
    const result = await callAI(prompt, { apiUrl, modelName, apiType });
    
    // Send result back to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'displayResult',
      result: result,
      type: request.action,
      question: request.question || null
    });
    
  } catch (error) {
    console.error('AI processing error:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'displayError',
      error: error.message
    });
  }
}

// Create summary prompt
function createSummaryPrompt(content, language) {
  const languageInstructions = {
    hebrew: 'סכם את התוכן הבא בעברית ב-3-5 נקודות מרכזיות',
    english: 'Summarize the following content in English in 3-5 key points',
    arabic: 'لخص المحتوى التالي باللغة العربية في 3-5 نقاط رئيسية'
  };
  
  const instruction = languageInstructions[language] || languageInstructions.hebrew;
  return `${instruction}:\n\n${content}\n\nסיכום:`;
}

// Create question prompt
function createQuestionPrompt(question, content, language) {
  const languageInstructions = {
    hebrew: 'ענה בעברית בצורה ברורה ומפורטת',
    english: 'Answer in English clearly and in detail',
    arabic: 'أجب باللغة العربية بوضوح وبالتفصيل'
  };
  
  const instruction = languageInstructions[language] || languageInstructions.hebrew;
  return `${instruction}.\n\nעל בסיס התוכן הבא:\n\n${content}\n\nשאלה: ${question}\n\nתשובה:`;
}

// Call AI API
async function callAI(prompt, settings) {
  console.log('🤖 callAI started with settings:', settings);
  console.log('📝 Prompt length:', prompt.length);
  
  try {
    let requestData;
    
    if (settings.apiType === 'ollama') {
      requestData = {
        model: settings.modelName,
        prompt: prompt,
        stream: false
      };
    } else {
      requestData = {
        model: settings.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };
    }
    
    console.log('📤 Sending request to:', settings.apiUrl);
    console.log('📦 Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch(settings.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    let result;
    if (settings.apiType === 'ollama') {
      result = data.response || 'לא התקבלה תשובה';
    } else {
      result = data.choices?.[0]?.message?.content || 'לא התקבלה תשובה';
    }
    
    console.log('✅ Final result length:', result.length);
    return result;
    
  } catch (error) {
    console.error('❌ callAI error:', error);
    
    // Enhanced error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`לא ניתן להתחבר לשרת AI. וודא ש-${settings.apiType === 'ollama' ? 'Ollama' : 'LMStudio'} פועל על ${settings.apiUrl}`);
    } else if (error.message.includes('404')) {
      throw new Error(`נתיב API שגוי: ${settings.apiUrl}. בדוק את כתובת ה-API בהגדרות`);
    } else if (error.message.includes('500')) {
      throw new Error(`שגיאת שרת AI: המודל "${settings.modelName}" אולי לא נטען או לא זמין`);
    } else {
      throw error;
    }
  }
}
