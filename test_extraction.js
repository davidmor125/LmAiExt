// Test script for content extraction - הכנס בקונסול של דף לבדיקה

console.log("🧪 מתחיל בדיקת חילוץ תוכן...");

// Test 1: בדיקת חילוץ דף שלם
console.log("\n📄 בדיקה 1: חילוץ תוכן דף שלם");
function testPageContent() {
  // Simulate the content script functions
  function getPageContent() {
    const content = extractMainContent();
    const cleanedContent = cleanText(content);
    const maxLength = 8000;
    if (cleanedContent.length > maxLength) {
      return cleanedContent.substring(0, maxLength) + '...';
    }
    return cleanedContent;
  }

  function extractMainContent() {
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.ad', '.advertisement', '.ads', '.sidebar',
      '.cookie-banner', '.popup', '.modal',
      '.social-share', '.comments', '.related-posts',
      '[aria-hidden="true"]', '.screen-reader-only'
    ];
    
    const contentSelectors = [
      'main', 'article', '[role="main"]',
      '.main-content', '.content', '.post-content',
      '.entry-content', '.article-content', '.page-content',
      '#content', '#main-content', '.container .content'
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        content = Array.from(elements)
          .map(el => el.innerText || el.textContent || '')
          .join('\n\n');
        
        if (content.trim().length > 100) {
          console.log(`✅ נמצא תוכן עיקרי עם סלקטור: ${selector}`);
          break;
        }
      }
    }
    
    if (!content || content.trim().length < 100) {
      console.log("⚠️ לא נמצא תוכן עיקרי, משתמש ב-body");
      const bodyClone = document.body.cloneNode(true);
      
      unwantedSelectors.forEach(selector => {
        const elements = bodyClone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      content = bodyClone.innerText || bodyClone.textContent || '';
    }
    
    return content;
  }

  function cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
      .replace(/חזרה לתחילת העמוד|Back to top|עמוד הבית|Home page/gi, '')
      .replace(/שתף|Share|הדפס|Print|שמור|Save/gi, '')
      .replace(/עוגיות|cookies|מדיניות פרטיות|privacy policy/gi, '')
      .replace(/הירשם לניוזלטר|Subscribe|הצטרף|Join/gi, '');
  }

  const result = getPageContent();
  console.log(`📊 אורך תוכן שחולץ: ${result.length} תווים`);
  console.log(`📝 תחילת התוכן: "${result.substring(0, 200)}..."`);
  
  return result;
}

// Test 2: בדיקת בחירת טקסט
console.log("\n✂️ בדיקה 2: בחירת טקסט");
function testSelectedText() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText) {
    console.log(`✅ נבחר טקסט: ${selectedText.length} תווים`);
    console.log(`📝 טקסט נבחר: "${selectedText.substring(0, 100)}..."`);
    return selectedText;
  } else {
    console.log("❌ לא נבחר טקסט");
    return '';
  }
}

// Test 3: בדיקת מבנה הדף
console.log("\n🏗️ בדיקה 3: מבנה הדף");
function analyzePageStructure() {
  const mainSelectors = [
    'main', 'article', '[role="main"]',
    '.main-content', '.content', '.post-content'
  ];
  
  console.log("🔍 חיפוש אלמנטים עיקריים:");
  mainSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`  ✅ ${selector}: ${elements.length} אלמנטים`);
      elements.forEach((el, index) => {
        const textLength = (el.innerText || '').length;
        console.log(`    - אלמנט ${index + 1}: ${textLength} תווים`);
      });
    } else {
      console.log(`  ❌ ${selector}: לא נמצא`);
    }
  });
  
  const unwantedSelectors = [
    'nav', 'header', 'footer', '.ad', '.advertisement', 
    '.sidebar', '.social-share', '.comments'
  ];
  
  console.log("\n🚫 בדיקת אלמנטים לא רצויים:");
  unwantedSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`  ⚠️ ${selector}: ${elements.length} אלמנטים (יוסרו)`);
    }
  });
}

// הפעלת הבדיקות
console.log("\n🚀 מתחיל בדיקות...");

analyzePageStructure();
const pageContent = testPageContent();
const selectedText = testSelectedText();

console.log("\n📋 סיכום בדיקה:");
console.log(`✅ תוכן דף: ${pageContent.length > 0 ? 'זמין' : 'לא זמין'}`);
console.log(`✅ טקסט נבחר: ${selectedText.length > 0 ? 'זמין' : 'לא זמין'}`);

if (pageContent.length > 0) {
  console.log(`📊 איכות התוכן:`);
  console.log(`  - אורך: ${pageContent.length} תווים`);
  console.log(`  - מכיל עברית: ${/[\u0590-\u05FF]/.test(pageContent) ? 'כן' : 'לא'}`);
  console.log(`  - נקי מפרסומות: ${!pageContent.includes('פרסומת') ? 'כן' : 'לא'}`);
}

console.log("\n✅ בדיקה הושלמה!");

// הוראות לבדיקה ידנית
console.log(`
📝 הוראות לבדיקה ידנית:
1. בחר טקסט בדף ואז הפעל: testSelectedText()
2. לבדיקת איכות התוכן: console.log(pageContent.substring(0, 1000))
3. לבדיקת הדף הנוכחי: analyzePageStructure()
`);

// Export למשתנים גלובליים לבדיקה נוספת
window.testPageContent = testPageContent;
window.testSelectedText = testSelectedText;
window.analyzePageStructure = analyzePageStructure;
