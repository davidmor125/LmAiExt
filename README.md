# Better Me - Personal Improvement Assistant

תוסף Chrome המשתמש ב-AI לשיפור אישי באמצעות ניתוח וסיכום תוכן אינטרנט.

## תכונות

- 🌟 עוזר שיפור אישי מבוסס AI
- 📄 סיכום דף שלם או טקסט נבחר
- 🤔 שאלות ותשובות אינטראקטיביות
- 🌍 תמיכה במספר שפות (עברית, אנגלית, ערבית, ספרדית, צרפתית)
- ⚙️ הגדרות ניתנות להתאמה
- 🎨 ממשק משתמש מודרני ויפה

## דרישות

- Chrome או Chromium browser
- מודל AYA פועל מקומית (Ollama או LM Studio)
- חיבור לאינטרנט

## התקנה

1. הורד או שכפל את התיקיה
2. פתח Chrome ועבור ל: `chrome://extensions/`
3. הפעל "Developer mode" בפינה השמאלית העליונה
4. לחץ על "Load unpacked" ובחר את תיקיית התוסף
5. התוסף יופיע ברשימת התוספים

## הגדרה

1. לחץ על אייקון התוסף בסרגל הכלים
2. לחץ על "⚙️ הגדרות"
3. הגדר:
   - **API URL**: כתובת שרת AYA (ברירת מחדל: `http://localhost:11434/api/chat`)
   - **שם המודל**: בחר מודל AYA (aya, aya:8b, aya:35b, וכו')
   - **שפת הסיכום**: השפה הרצויה לסיכום

## שימוש

### סיכום דף שלם
1. היכנס לדף שברצונך לסכם
2. לחץ על אייקון התוסף
3. לחץ על "סכם דף שלם"

### סיכום טקסט נבחר
1. בחר טקסט בדף
2. לחץ על אייקון התוסף
3. לחץ על "סכם טקסט נבחר"

### תפריט הקשר (Context Menu)
- לחץ ימני על טקסט נבחר ובחר "סכם עם AYA"
- לחץ ימני על הדף ובחר "סכם דף זה עם AYA"

## הגדרת מודל AYA

### עם Ollama
```bash
# התקן Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# הורד מודל AYA
ollama pull aya

# הפעל שרת
ollama serve
```

### עם LM Studio
1. הורד LM Studio
2. חפש ואמתר מודל AYA
3. הפעל שרת מקומי

## קבצי התוסף

- `manifest.json` - הגדרות התוסף
- `popup.html` - ממשק המשתמש
- `popup.js` - לוגיקה עיקרית
- `content.js` - חילוץ תוכן מדפים
- `background.js` - סקריפט רקע

## פתרון בעיות

### התוסף לא עובד
- וודא שמודל AYA פועל ונגיש
- בדוק שכתובת ה-API נכונה
- פתח Developer Tools ובדוק הודעות שגיאה

### אין תגובה מהמודל
- וודא שהמודל נטען במלואו
- בדוק חיבור רשת למודל
- נסה מודל AYA אחר

### סיכום באיכות ירודה
- נסה מודל גדול יותר (aya:35b)
- שנה את הגדרות הטמפרטורה
- השתמש בטקסט קצר ומובן יותר

## רישיון

MIT License

## תרומה

ברוכים הבאים לתרום! פתח Issues או Pull Requests.
