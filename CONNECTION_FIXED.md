# 🔧 תיקון שגיאת "Could not establish connection"

## מה היה הבעיה:
❌ **"Could not establish connection. Receiving end does not exist"**
- Content script לא היה זמין בדף
- בעיית תזמון בין popup לcontent script

## מה תוקן:

### 1. שיפור חיבור ל-Content Script
```javascript
✅ ניסיון ישיר לשלוח הודעה
✅ אם נכשל - הזרקת content script אוטומטית
✅ המתנה קצרה ואז ניסיון נוסף
✅ טיפול משופר בשגיאות
```

### 2. הוספת הרשאות נדרשות
```json
✅ הוספת "scripting" להרשאות במניפסט
✅ אפשרות להזריק content script דינמית
```

### 3. שיפור Logging
```javascript
✅ הודעות debug מפורטות
✅ בדיקת תוכן שהתקבל
✅ טיפול בשגיאות ספציפיות
```

## עכשיו נסה שוב:

### 1. רענן התוסף
```
chrome://extensions/ → 🔄 ליד התוסף
```

### 2. נסה לסכם
```
1. עבור לדף אינטרנט כלשהו
2. לחץ על התוסף
3. לחץ "סכם דף שלם"
4. צריך לעבוד ללא שגיאת חיבור!
```

### 3. בדוק Console (אופציונלי)
```
F12 → Console → הודעות debug:
✅ "AI Popup script loaded"
✅ "Content script loaded"  
✅ "Sending message to tab: X"
✅ "Content received, length: X"
```

## אם עדיין יש בעיות:

### בדיקות נוספות:
1. **נסה דף אחר** - אולי הדף הנוכחי חוסם scripts
2. **בדוק Console** - F12 לבדיקת שגיאות JavaScript
3. **נסה Incognito** - לפעמים עוזר עם הרשאות

### מקרים מיוחדים:
- **chrome://pages**: לא יעבוד (הגבלת Chrome)
- **file:// pages**: צריך הרשאה נוספת
- **HTTPS pages**: יעבוד נורמלית

## התוסף צריך לעבוד עכשיו! 🎉

**השגיאה "Could not establish connection" תוקנה!**
