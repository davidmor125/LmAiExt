document.addEventListener('DOMContentLoaded', function() {
  console.log('Better Me popup script loaded');
  
  // Load saved settings
  loadSettings();
  
  // Initialize drag functionality
  initializeDragFunctionality();
  
  // Close button functionality - enhanced for Chrome extension
  document.getElementById('closeButton').addEventListener('click', function() {
    console.log('Close button clicked');
    // For Chrome extensions, window.close() works for popups
    if (typeof chrome !== 'undefined' && chrome.extension) {
      window.close();
    } else {
      // Fallback for testing
      window.close();
    }
  });
  
  // Settings toggle
  document.getElementById('settingsToggle').addEventListener('click', toggleSettings);
  
  // Save settings when changed
  document.getElementById('apiUrl').addEventListener('change', saveSettings);
  document.getElementById('modelName').addEventListener('change', saveSettings);
  document.getElementById('apiType').addEventListener('change', saveSettings);
  document.getElementById('summaryLanguage').addEventListener('change', saveSettings);

  // Summarize buttons
  document.getElementById('summarizePage').addEventListener('click', () => summarize('page'));
  document.getElementById('summarizeSelection').addEventListener('click', () => summarize('selection'));
  
  // Q&A buttons
  document.getElementById('askAboutPage').addEventListener('click', () => askQuestion('page'));
  document.getElementById('askAboutSelection').addEventListener('click', () => askQuestion('selection'));

  function loadSettings() {
    console.log('Loading AI settings...');
    chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage'], function(result) {
      console.log('Settings loaded:', result);
      document.getElementById('apiUrl').value = result.apiUrl || 'http://localhost:1234/v1/chat/completions';
      document.getElementById('modelName').value = result.modelName || 'lmstudio-model';
      document.getElementById('apiType').value = result.apiType || 'lmstudio';
      document.getElementById('summaryLanguage').value = result.summaryLanguage || 'hebrew';
    });
  }

  function saveSettings() {
    const settings = {
      apiUrl: document.getElementById('apiUrl').value,
      modelName: document.getElementById('modelName').value,
      apiType: document.getElementById('apiType').value,
      summaryLanguage: document.getElementById('summaryLanguage').value
    };
    chrome.storage.sync.set(settings);
    console.log('Settings saved:', settings);
  }

  function toggleSettings() {
    const settingsSection = document.getElementById('settingsSection');
    const isVisible = settingsSection.classList.contains('show');
    
    if (isVisible) {
      settingsSection.classList.remove('show');
      document.getElementById('settingsToggle').textContent = '⚙️ הגדרות';
    } else {
      settingsSection.classList.add('show');
      document.getElementById('settingsToggle').textContent = '✕ סגור הגדרות';
    }
  }

  function summarize(type) {
    console.log('Starting summarization:', type);
    const resultDiv = document.getElementById('result');
    const summarizePageBtn = document.getElementById('summarizePage');
    const summarizeSelectionBtn = document.getElementById('summarizeSelection');
    
    // Disable buttons during processing
    summarizePageBtn.disabled = true;
    summarizeSelectionBtn.disabled = true;
    
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="loading">
          <div class="spinner"></div>
          מסכם עם AI...
        </div>
      </div>
    `;

    // Get current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tabId = tabs[0].id;
      console.log('Sending message to tab:', tabId);
      
      // First try to send message directly
      chrome.tabs.sendMessage(tabId, {action: 'getContent', type: type}, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Direct message failed, trying to inject content script');
          
          // Try to inject content script if it's not already there
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Script injection failed:', chrome.runtime.lastError);
              showError('שגיאה בטעינת סקריפט התוכן: ' + chrome.runtime.lastError.message);
              enableButtons();
              return;
            }
            
            // Wait a bit then try again
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {action: 'getContent', type: type}, function(response) {
                handleContentResponse(response, type, resultDiv);
              });
            }, 100);
          });
        } else {
          handleContentResponse(response, type, resultDiv);
        }
      });
    });
  }

  function handleContentResponse(response, type, resultDiv) {
    if (chrome.runtime.lastError) {
      console.error('Chrome runtime error:', chrome.runtime.lastError);
      showError('שגיאה בקריאת התוכן: ' + chrome.runtime.lastError.message);
      enableButtons();
      return;
    }

    if (!response || !response.content || response.content.trim().length === 0) {
      showError(type === 'selection' ? 
        'לא נבחר טקסט. אנא בחר טקסט בדף ונסה שוב.' : 
        'לא נמצא תוכן בדף לסיכום');
      enableButtons();
      return;
    }

    console.log('Content received, length:', response.content.length);
    // Send to AI model
    sendToAI(response.content, resultDiv);
  }

  async function sendToAI(content, resultDiv) {
    console.log('Sending to AI model, content length:', content.length);
    try {
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage'], resolve);
      });

      const apiUrl = settings.apiUrl || 'http://localhost:1234/v1/chat/completions';
      const modelName = settings.modelName || 'lmstudio-model';
      const apiType = settings.apiType || 'lmstudio';
      const summaryLanguage = settings.summaryLanguage || 'hebrew';
      
      console.log('AI settings:', {apiUrl, modelName, apiType, summaryLanguage});

      if (!apiUrl) {
        throw new Error('נא להזין כתובת API');
      }

      const prompt = createPrompt(content, summaryLanguage);
      
      // Detect API type based on settings
      let requestBody;
      
      if (apiType === 'ollama') {
        // Ollama format
        requestBody = {
          model: modelName,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000
          }
        };
      } else {
        // LMStudio/OpenAI format
        requestBody = {
          model: modelName,
          messages: [
            {
              role: "user", 
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        };
      }
      
      console.log('Sending request to:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`שגיאת API: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      let summary = '';
      
      // Handle different response formats
      if (data.message && data.message.content) {
        summary = data.message.content;
      } else if (data.response) {
        summary = data.response;
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        summary = data.choices[0].message.content;
      } else {
        throw new Error('פורמט תגובה לא צפוי מהמודל');
      }

      showSummary(summary);
      
    } catch (error) {
      console.error('Error calling AI model:', error);
      
      let errorMessage = 'שגיאה בקריאה למודל AI: ';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'לא ניתן להתחבר לשרת AI. וודא ש:';
        errorMessage += '\n• השרת פועל על הכתובת שהוגדרה';
        errorMessage += '\n• המודל נטען ופעיל';
        errorMessage += '\n• אין חסימה של Firewall';
      } else if (error.message.includes('404')) {
        errorMessage += 'נתיב API שגוי. בדוק את כתובת ה-API בהגדרות';
      } else if (error.message.includes('500')) {
        errorMessage += 'שגיאה בשרת המודל. בדוק את לוגי השרת';
      } else {
        errorMessage += error.message;
      }
      
      showError(errorMessage);
    } finally {
      enableButtons();
    }
  }

  function createPrompt(content, language) {
    const prompts = {
      hebrew: `סכם את הטקסט הבא בעברית באופן קצר, ברור ומובן. התמקד בנקודות העיקריות והחשובות:

${content}

סיכום:`,
      english: `Summarize the following text in English concisely and clearly. Focus on the main and important points:

${content}

Summary:`,
      arabic: `لخص النص التالي بالعربية بشكل مختصر وواضح. ركز على النقاط الرئيسية والمهمة:

${content}

الملخص:`,
      spanish: `Resume el siguiente texto en español de forma concisa y clara. Enfócate en los puntos principales e importantes:

${content}

Resumen:`,
      french: `Résumez le texte suivant en français de manière concise et claire. Concentrez-vous sur les points principaux et importants:

${content}

Résumé:`
    };

    return prompts[language] || prompts.hebrew;
  }

  function showSummary(summary) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="summary">
          <strong> סיכום:</strong><br><br>
          ${summary.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }

  function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="error">❌ ${message.replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  function enableButtons() {
    document.getElementById('summarizePage').disabled = false;
    document.getElementById('summarizeSelection').disabled = false;
  }

  // Drag functionality for moving the popup window
  function initializeDragFunctionality() {
    const dragHeader = document.getElementById('dragHeader');
    const popupContainer = document.querySelector('.popup-container');
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    dragHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
      // Only allow dragging if clicking on header, not buttons
      if (e.target.closest('.settings-toggle') || e.target.closest('.close-button')) {
        return;
      }
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === dragHeader || e.target.closest('.drag-indicator') || e.target.closest('h1')) {
        isDragging = true;
        dragHeader.style.cursor = 'grabbing';
      }
    }
    
    function dragMove(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        // Apply transform to move the popup
        popupContainer.style.transform = `translate(${currentX}px, ${currentY}px)`;
        popupContainer.style.transition = 'none';
      }
    }
    
    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      dragHeader.style.cursor = 'move';
      popupContainer.style.transition = 'all 0.3s ease';
    }
  }
  
  // Q&A functionality
  async function askQuestion(type) {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();
    
    if (!question) {
      showError('אנא הקלד שאלה');
      return;
    }
    
    const askPageBtn = document.getElementById('askAboutPage');
    const askSelectionBtn = document.getElementById('askAboutSelection');
    
    // Disable buttons during processing
    askPageBtn.disabled = true;
    askSelectionBtn.disabled = true;
    
    try {
      showLoading('מחפש תשובה לשאלה...');
      
      // Get content based on type
      let content = '';
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const activeTab = tabs[0];
      
      if (!activeTab) {
        throw new Error('לא נמצא טאב פעיל');
      }
      
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'getContent',
          type: type
        });
        
        if (response && response.success) {
          content = response.content;
        } else {
          throw new Error(response ? response.error : 'שגיאה בקבלת התוכן');
        }
      } catch (error) {
        console.log('Direct message failed, trying content script injection');
        
        await chrome.scripting.executeScript({
          target: {tabId: activeTab.id},
          files: ['content.js']
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'getContent',
          type: type
        });
        
        if (response && response.success) {
          content = response.content;
        } else {
          throw new Error(response ? response.error : 'שגיאה בקבלת התוכן');
        }
      }
      
      if (!content || content.trim().length === 0) {
        throw new Error(type === 'selection' ? 'לא נמצא טקסט מסומן' : 'לא נמצא תוכן בדף');
      }
      
      console.log(`Content length for Q&A: ${content.length}`);
      
      // Get API settings
      const settings = await getStoredSettings();
      const language = settings.summaryLanguage || 'hebrew';
      
      // Create Q&A prompt
      const prompt = createQuestionPrompt(question, content, language);
      
      // Call API for answer
      const answer = await callAI(prompt, settings);
      showAnswer(question, answer);
      
    } catch (error) {
      console.error('Q&A error:', error);
      showError(`שגיאה בחיפוש תשובה: ${error.message}`);
    } finally {
      askPageBtn.disabled = false;
      askSelectionBtn.disabled = false;
    }
  }
  
  function createQuestionPrompt(question, content, language) {
    const languageInstructions = {
      hebrew: 'ענה בעברית בצורה ברורה ומפורטת',
      english: 'Answer in English clearly and in detail',
      arabic: 'أجب باللغة العربية بوضوح وبالتفصيل',
      spanish: 'Responde en español de manera clara y detallada',
      french: 'Répondez en français de manière claire et détaillée'
    };
    
    const instruction = languageInstructions[language] || languageInstructions.hebrew;
    
    return `${instruction}.
    
על בסיס התוכן הבא, ${instruction.toLowerCase()}:

שאלה: ${question}

תוכן:
${content}

תשובה:`;
  }
    function showAnswer(question, answer) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="summary">
          <strong>🤔 שאלה:</strong><br>
          ${question.replace(/\n/g, '<br>')}<br><br>
          <strong>💡 תשובה:</strong><br>
          ${answer.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
    
    // Clear the question input after showing answer
    document.getElementById('questionInput').value = '';
  }
});
