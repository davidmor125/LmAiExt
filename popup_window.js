document.addEventListener('DOMContentLoaded', function() {
  console.log('Better Me extension tab loaded');
  
  // Load saved settings
  loadSettings();
    // Close button functionality - close the tab
  document.getElementById('closeButton').addEventListener('click', function() {
    console.log('Close button clicked - closing tab');
    chrome.tabs.getCurrent((tab) => {
      if (tab) {
        chrome.tabs.remove(tab.id);
      }
    });
  });
    // Settings toggle via logo click
  document.getElementById('logoSettings').addEventListener('click', toggleSettings);
  
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
    
    console.log('Saving settings:', settings);
    chrome.storage.sync.set(settings, function() {
      console.log('Settings saved successfully');
    });
  }
  function toggleSettings() {
    const settingsSection = document.getElementById('settingsSection');
    
    if (settingsSection.classList.contains('show')) {
      settingsSection.classList.remove('show');
    } else {
      settingsSection.classList.add('show');
    }
  }

  async function summarize(type) {
    const summarizePageBtn = document.getElementById('summarizePage');
    const summarizeSelectionBtn = document.getElementById('summarizeSelection');
    
    // Disable buttons during processing
    summarizePageBtn.disabled = true;
    summarizeSelectionBtn.disabled = true;
    
    try {
      showLoading('מעבד תוכן...');
      
      // Get content from the active tab
      let content = '';
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      let activeTab = null;
      
      // Since we're in a popup window, we need to find the active tab differently
      const allTabs = await chrome.tabs.query({});
      for (let tab of allTabs) {
        if (tab.active && !tab.url.startsWith('chrome-extension://')) {
          activeTab = tab;
          break;
        }
      }
      
      if (!activeTab) {
        // Fallback: get the most recent non-extension tab
        for (let tab of allTabs) {
          if (!tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
            activeTab = tab;
            break;
          }
        }
      }
      
      if (!activeTab) {
        throw new Error('לא נמצא טאב פעיל לעיבוד');
      }
      
      console.log('Working with tab:', activeTab.url);
      
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
      
      console.log(`Content length: ${content.length}`);
      
      // Get API settings
      const settings = await getStoredSettings();
      const language = settings.summaryLanguage || 'hebrew';
      
      // Create summary prompt
      const prompt = createSummaryPrompt(content, language);
      
      // Call API
      const summary = await callAI(prompt, settings);
      showSummary(summary);
      
    } catch (error) {
      console.error('Summarization error:', error);
      showError(`שגיאה בסיכום: ${error.message}`);
    } finally {
      summarizePageBtn.disabled = false;
      summarizeSelectionBtn.disabled = false;
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
      
      // Get content from the active tab
      let content = '';
      const allTabs = await chrome.tabs.query({});
      let activeTab = null;
      
      // Find the active tab (not the popup window)
      for (let tab of allTabs) {
        if (tab.active && !tab.url.startsWith('chrome-extension://')) {
          activeTab = tab;
          break;
        }
      }
      
      if (!activeTab) {
        // Fallback: get the most recent non-extension tab
        for (let tab of allTabs) {
          if (!tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
            activeTab = tab;
            break;
          }
        }
      }
      
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

  function createSummaryPrompt(content, language) {
    const languageInstructions = {
      hebrew: 'סכם את התוכן הבא בעברית ב-3-5 נקודות מרכזיות',
      english: 'Summarize the following content in English in 3-5 key points',
      arabic: 'لخص المحتوى التالي باللغة العربية في 3-5 نقاط رئيسية',
      spanish: 'Resume el siguiente contenido en español en 3-5 puntos clave',
      french: 'Résumez le contenu suivant en français en 3-5 points clés'
    };
    
    const instruction = languageInstructions[language] || languageInstructions.hebrew;
    
    return `${instruction}:

${content}

סיכום:`;
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

  async function getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiUrl', 'modelName', 'apiType', 'summaryLanguage'], function(result) {
        resolve({
          apiUrl: result.apiUrl || 'http://localhost:1234/v1/chat/completions',
          modelName: result.modelName || 'lmstudio-model',
          apiType: result.apiType || 'lmstudio',
          summaryLanguage: result.summaryLanguage || 'hebrew'
        });
      });
    });
  }

  async function callAI(prompt, settings) {
    console.log('Calling AI API with settings:', settings);
    console.log('Prompt length:', prompt.length);

    const apiUrl = settings.apiUrl;
    const modelName = settings.modelName;
    const apiType = settings.apiType;

    let requestData;
    
    if (apiType === 'ollama') {
      requestData = {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      };
    } else {
      // LMStudio/OpenAI compatible format
      requestData = {
        model: modelName,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };
    }

    console.log('Request data:', requestData);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      let result;
      if (apiType === 'ollama') {
        result = data.response || 'לא התקבלה תשובה';
      } else {
        result = data.choices?.[0]?.message?.content || 'לא התקבלה תשובה';
      }

      return result.trim();

    } catch (error) {
      console.error('API call failed:', error);
      throw new Error(`שגיאת חיבור ל-API: ${error.message}`);
    }
  }

  function showLoading(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        ${message}
      </div>
    `;
  }

  function showSummary(summary) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="summary">
${summary.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }
  function showAnswer(question, answer) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="summary">
          <strong>שאלה:</strong><br>
          ${question.replace(/\n/g, '<br>')}<br><br>
          <strong>תשובה:</strong><br>
          ${answer.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
    
    // Clear the question input after showing answer
    document.getElementById('questionInput').value = '';
  }

  function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="summary-container">
        <div class="error">❌ ${message.replace(/\n/g, '<br>')}</div>
      </div>
    `;  }
});
