# 🔧 Button Text Update Issue - Summary & Solution

## ❌ Problem Description
After using the summary button ("סכם") or ask button, the button text remains showing the last action instead of updating based on current text selection state.

**Example Issue:**
1. User selects text → Button shows "סכם טקסט נבחר" ✅
2. User clicks summary button → AI processes and shows result ✅  
3. Text is still selected BUT button now shows "סכם את הדף" ❌
4. Should show "סכם טקסט נבחר" again ✅

## 🎯 Root Cause
The `updateSummaryButton()` function is not being called after AI results are displayed.

## ✅ Solution Applied
Added button text update mechanism in `content.js`:

### 1. Added Function to content.js
```javascript
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
```

### 2. Updated Message Handlers in content.js
```javascript
} else if (request.action === 'displayResult') {
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
```

## 🧪 Testing
1. ✅ Select text on page
2. ✅ Click summary button - should show "סכם טקסט נבחר" 
3. ✅ AI processes and displays result
4. ✅ **Button text should update back to "סכם טקסט נבחר"** (This is the fix!)
5. ✅ Clear selection - button should show "סכם את הדף"
6. ✅ Select different text - button should show "סכם טקסט נבחר" again

## 📁 Files Modified
- ✅ **content.js** - Added `updateSummaryButtonText()` function and calls after AI results

## 🔍 Current Status
- ✅ Solution implemented in content.js
- ❌ Need to restore working background.js (currently corrupted)
- ✅ Ready for testing once background.js is fixed

## 📋 Next Steps
1. Restore working background.js file
2. Test button text updates
3. Verify both summary and ask button behaviors
