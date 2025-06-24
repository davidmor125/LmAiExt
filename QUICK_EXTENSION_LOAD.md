# 🚀 הוראות מהירות - טעינת תוסף Better Me

## ⚡ טעינה מהירה ב-Chrome

### 1. פתח Chrome Extensions
```
chrome://extensions/
```

### 2. הפעל Developer Mode
- לחץ על המתג "Developer mode" בצד הימני העליון

### 3. טען את התוסף
- לחץ על "Load unpacked"
- בחר את התיקייה: `c:\develop\bak\popupextenNew1`
- לחץ "Select Folder"

### 4. וודא שהתוסף פעיל
- ✅ וודא שהתוסף "Better Me" מופיע ברשימה
- ✅ וודא שהמתג כחול (מופעל)

### 5. בדוק את התוסף
1. פתח טאב חדש
2. נווט לקובץ: `file:///c:/develop/bak/popupextenNew1/test_basic_extension.html`
3. פתח Developer Tools (F12)
4. בחר טקסט בדף
5. בדוק אם מופיע תפריט צף

## 🔧 אם התוסף לא עובד

### בדיקת שגיאות:
1. ב-`chrome://extensions/` לחץ על "Details" ליד התוסף
2. לחץ על "Inspect views: service worker"
3. בדוק שגיאות בקונסול

### רענון התוסף:
1. לחץ על כפתור הרענון (🔄) ליד התוסף
2. רענן את הדף שאתה בודק

### בדיקת קבצים:
וודא שהקבצים הבאים קיימים:
- ✅ `manifest.json`
- ✅ `content.js`
- ✅ `background.js`
- ✅ `popup.html`

## 📞 עזרה נוספת
אם הבעיה נמשכת, ראה: `DIALOG_TROUBLESHOOTING_GUIDE.md`
