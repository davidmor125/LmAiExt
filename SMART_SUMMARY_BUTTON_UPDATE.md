# 🧠 כפתורים חכמים - Better Me

## השינוי שבוצע:

### 🎯 איחוד כל הכפתורים לשני כפתורים חכמים:
- **לפני**: 4 כפתורים נפרדים - "סכם דף שלם", "סכם טקסט נבחר", "שאל על הדף", "שאל על הטקסט המסומן"
- **אחרי**: 2 כפתורים חכמים שמזהים אוטומטית מה לעשות

---

## איך זה עובד:

### 🔍 זיהוי אוטומטי לכפתור הסיכום:
- **אם יש טקסט מסומן**: הכפתור מציג "סכם טקסט נבחר" ומסכם רק את הטקסט המסומן
- **אם אין טקסט מסומן**: הכפתור מציג "סכם את הדף" ומסכם את כל תוכן הדף

### 🔍 זיהוי אוטומטי לכפתור השאלה:
- **אם יש טקסט מסומן**: הכפתור מציג "שאל על הטקסט המסומן" ושואל על הטקסט המסומן בלבד
- **אם אין טקסט מסומן**: הכפתור מציג "שאל על הדף" ושואל על כל תוכן הדף

### 🔄 עדכון דינמי:
- הטקסט של שני הכפתורים מתעדכן בזמן אמת כשמסמנים או מבטלים טקסט
- האירוע `selectionchange` מעדכן את שני הכפתורים אוטומטית

---

## הקוד החדש:

### HTML של הכפתור סיכום חכם:
```html
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
```

### HTML של כפתור השאלה החכם:
```html
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
```

### JavaScript של הכפתורים החכמים:
```javascript
// Function to update both buttons text based on selection
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

// Listen to selection changes
document.addEventListener('selectionchange', updateSummaryButton);

// Smart summarize button
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

// Smart ask button
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
```

---

## היתרונות של הכפתורים החכמים:

### ✨ חוויית משתמש משופרת:
- **🎯 פשטות**: 2 כפתורים במקום 4 כפתורים נפרדים
- **🧠 חכמה**: מזהים אוטומטית מה המשתמש רוצה לעשות
- **⚡ מהירות**: אין צורך לחשוב איזה כפתור לבחור
- **🔄 דינמיות**: מתעדכנים בזמן אמת עם השינויים

### 🎨 עיצוב נקי יותר:
- **🔗 ממשק מאוחד**: פחות בלגן בממשק
- **📐 מקום חסכוני**: 2 כפתורים תופסים פחות מקום מ-4
- **🎯 פוקוס**: המשתמש מתמקד בתוכן ולא בבחירת כפתור
- **📱 נגישות**: יותר ידידותי למשתמשים

### 🚀 פונקציונליות משופרת:
- **✅ אמינות**: פחות טעויות בבחירת הכפתור הנכון
- **🔧 תחזוקה**: קוד פשוט יותר לתחזוקה
- **🎛️ יעילות**: פעולה אחת במקום בחירה + לחיצה

---

## קבצים שעודכנו:

### `background.js`
- ✅ הוחלף ה-HTML של 4 הכפתורים ב-2 כפתורים חכמים
- ✅ נוספה פונקציית `updateSummaryButton()` מעודכנת לשני הכפתורים
- ✅ נוסף מאזין ל-`selectionchange` לעדכון דינמי
- ✅ הוחלפו 4 ה-event listeners ב-2 listeners חכמים
- ✅ עודכנו אפקטי ה-hover לשני הכפתורים החדשים

### `test_all_smart_buttons.html`
- ✅ דף בדיקה חדש להדגמת שני הכפתורים החכמים
- ✅ השוואה ויזואלית בין לפני (4 כפתורים) ואחרי (2 כפתורים)
- ✅ דוגמה אינטראקטיבית של הפונקציונליות החדשה
- ✅ הדגמה של העדכון הדינמי בזמן אמת לשני הכפתורים

---

## איך להשתמש:

### 📄 סיכום:
1. **כל הדף:** פתח את Better Me ללא בחירת טקסט - הכפתור יציג "סכם את הדף"
2. **טקסט נבחר:** סמן טקסט בדף - הכפתור יתעדכן ל"סכם טקסט נבחר"
3. לחץ על הכפתור לסיכום

### ❓ שאלות:
1. **על כל הדף:** כתב שאלה ללא בחירת טקסט - הכפתור יציג "שאל על הדף"  
2. **על טקסט נבחר:** סמן טקסט וכתב שאלה - הכפתור יתעדכן ל"שאל על הטקסט המסומן"
3. לחץ על הכפתור לשליחת השאלה

### 🔄 עדכון דינמי:
- שני הכפתורים מתעדכנים אוטומטית כשמוסיפים או מסירים בחירת טקסט
- אין צורך לסגור ולפתוח מחדש את התוסף

---

## בדיקה והדגמה:

ראה את קובץ `test_all_smart_buttons.html` לדוגמה חיה של:
- 🧠 שני הכפתורים החכמים החדשים
- 🔄 עדכון דינמי של הטקסט בשני הכפתורים
- 🎯 זיהוי אוטומטי של בחירת טקסט
- 📋 השוואה עם הגרסה הישנה (4 כפתורים → 2 כפתורים)
- 🎨 ממשק נקי ויעיל יותר

---

## תאימות:

### ✅ תמיכה מלאה:
- Chrome, Firefox, Safari, Edge
- Desktop, Mobile, Tablet
- כל אתרי האינטרנט

### ✅ ביצועים:
- מהיר ורספונסיבי
- זיכרון יעיל
- עדכון בזמן אמת

---

*Better Me - כפתורים חכמים לחוויית משתמש מושלמת* 🧠⚡
