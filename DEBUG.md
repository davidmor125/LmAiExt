# בדיקת התוסף עם Chrome DevTools

## פתיחת DevTools לתוסף

### שיטה 1: דרך דף התוספים
1. עבור ל: `chrome://extensions/`
2. מצא את "AYA Page Summarizer"
3. לחץ על "Details"
4. לחץ על "Inspect views: popup.html"

### שיטה 2: דרך הפופאפ
1. לחץ על אייקון התוסף (פתח את הפופאפ)
2. לחץ F12 או Ctrl+Shift+I
3. אם זה לא עובד, לחץ ימני על הפופאפ ובחר "Inspect"

## בדיקות Console

### בדיקה 1: טעינת הפופאפ
```javascript
// צריך להופיע:
"AYA Page Summarizer loaded"
```

### בדיקה 2: בדיקת הגדרות
1. לחץ על "הגדרות" בפופאפ
2. ב-Console צריך להופיע:
```javascript
"Settings loaded: {apiUrl: '...', modelName: '...', ...}"
```

### בדיקה 3: בדיקת סיכום (ללא AYA)
1. לחץ על "סכם דף שלם"
2. ב-Console צריך להופיע:
```javascript
"Getting content from page..."
"Content received: ..."
"Calling AYA API..."
"Error calling AYA: TypeError: Failed to fetch"
```

## בדיקת Network

1. פתח את לשונית **Network** ב-DevTools
2. לחץ על "סכם דף שלם"
3. צריך להופיע בקשת POST ל-API עם:
   - **URL**: `http://localhost:11434/api/chat`
   - **Method**: POST
   - **Status**: Failed (אם AYA לא פועל)

## בדיקת Content Script

### בחלון הדף הרגיל:
1. פתח דף אינטרנט כלשהו
2. פתח DevTools (F12)
3. ב-Console הקלד:
```javascript
// בדיקה שה-content script נטען
console.log('Content script test');
```

### בדיקת חילוץ תוכן:
```javascript
// בדיקה ידנית של חילוץ תוכן
chrome.runtime.sendMessage({action: 'getContent', type: 'page'}, 
  response => console.log('Page content:', response));
```

## שגיאות נפוצות וזיהוי

### שגיאה: "Cannot read property of undefined"
**זיהוי**: ב-Console יופיע stack trace
**פתרון**: בדוק שכל האלמנטים HTML קיימים

### שגיאה: "Failed to fetch"
**זיהוי**: בלשונית Network תראה בקשה failed
**פתרון**: בדוק שה-API server פועל

### שגיאה: "Extension context invalidated"
**זיהוי**: הפופאפ לא מגיב לקליקים
**פתרון**: טען מחדש את התוסף

## הוספת קוד Debug

הוסף את הקוד הבא ל-`popup.js` לבדיקה:

```javascript
// בתחילת הקובץ
console.log('Popup script loaded');

// בפונקציה loadSettings
console.log('Loading settings...');

// בפונקציה sendToAYA
console.log('Sending to AYA:', {apiUrl, modelName, content: content.substring(0, 100)});
```

## בדיקה מלאה - צ'קליסט

- [ ] DevTools נפתח בהצלחה
- [ ] אין שגיאות JavaScript באדום
- [ ] הגדרות נטענות נכון
- [ ] Content script עובד
- [ ] בקשות Network נשלחות
- [ ] הודעות שגיאה ברורות
- [ ] הכל עובד גם לאחר refresh
