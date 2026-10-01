"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const instructions = `אתה עוזר ליצירת לוחות זמני תפילה בעברית עבור בית הכנסת אהבת שלום.
אסוף את הפרשה או האירוע, ההפטרה, התפילות, השעות והודעות נוספות.
אפשר להחליף, להוסיף, למחוק ולמקם מחדש כל מלל בלוח, כולל כותרות.
האתר מתאים את גודל הכתב אוטומטית לגודל התמונה ולשטח הפנוי, לכן שמור בדיוק על הניסוח שביקש המשתמש.
אם חסר פרט מהותי, שאל שאלה קצרה אחת.
כשיש מספיק מידע, קרא לפעולה createPrayerPoster.
שלח את כל תוכן הלוח במערך items, בדיוק לפי הסדר שבו המשתמש ביקש שיופיע מלמעלה למטה. לעולם אל תשנה את הסדר לפי משמעות המילים. אם המשתמש מוסיף משהו אחרי הבדלה, מקם אותו אחרי הבדלה.
לכל פריט יש kind: הערך heading מיועד לכותרת, text לשורה רגילה ממורכזת, ו-timed לשורה עם שם ושעה. בשורה timed שים את שם התפילה ב-text ואת השעה ב-time.
בתוך פריט heading אפשר לבחור headingVariant: הערך title הוא כותרת רגילה, divider הוא קו מפריד, ו-spacer הוא רווח ריק. קו או רווח נשארים פריטי heading ואינם סוג רביעי של שורה.
שמור את השעות בדיוק כפי שנמסרו. כל כותרת, כולל "יום שבת", היא פריט רגיל מסוג heading שאפשר להשמיט אם המשתמש אינו רוצה אותה.
במצב ברירת המחדל אל תמציא שם לפרשה או להפטרה: צור את השורות "פרשת השבוע" ו"הפטרה" בלי שם. אחרי "הבדלה" הוסף קו מפריד, אחריו כותרת "זמני תפילות ביום חול", ואחריה שורות עם שעה עבור "מנחה" ו"ערבית" עם שעות ריקות לעריכה. אם המשתמש מבקש סדר או תוכן אחר, הבקשה שלו קובעת.
אם המשתמש מבקש פונט או הדגשה, השתמש ב-style של הפריט. ערכי הפונט האפשריים הם: arial, david, assistant, frank, noto, heebo, rubik, alef.
אם לא התבקש עיצוב מיוחד, ברירת המחדל היא פונט david וכתב מודגש לכל המלל. המשתמש יכול לבקש פונט אחר או לבטל הדגשה בכל שורה.
המילים "דוד ומשה" מודגשות תמיד בתוצאה, גם אם שאר שורת ההקדשה רגילה.
לאחר הפעולה החזר את preview_url והסבר שבקישור אפשר לבדוק את התוצאה ולהוריד PNG.
אל תמציא שעות או שמות.`;

export default function GptPage() {
  const [schemaUrl, setSchemaUrl] = useState("/api/openapi");
  const [copied, setCopied] = useState<"instructions" | "schema" | null>(null);

  useEffect(() => setSchemaUrl(`${window.location.origin}/api/openapi`), []);

  const copy = async (kind: "instructions" | "schema", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <main className="app-shell" dir="rtl">
      <article className="info-page">
        <span className="eyebrow">חיבור מוכן</span>
        <h1>GPT ללוחות זמני תפילה</h1>
        <p>האתר כולל Action מוכן. אחרי החיבור אפשר לומר ל־GPT את הפרשה, התפילות והשעות ולקבל קישור ללוח שאפשר לערוך ולהוריד.</p>
        <h2>שם מומלץ</h2><p>יוצר לוחות — אהבת שלום</p>
        <h2>הוראות להדבקה ב־GPT</h2>
        <div className="schema-box preserve-lines">{instructions}</div>
        <button className="secondary setup-button" onClick={() => copy("instructions", instructions)}>
          {copied === "instructions" ? "ההוראות הועתקו" : "העתקת ההוראות"}
        </button>
        <h2>סכמת ה־Action</h2>
        <p>בעורך ה־GPT, באזור Actions, בוחרים ייבוא מכתובת URL ומדביקים:</p>
        <div className="schema-box ltr">{schemaUrl}</div>
        <button className="secondary setup-button" onClick={() => copy("schema", schemaUrl)}>
          {copied === "schema" ? "הכתובת הועתקה" : "העתקת כתובת הסכמה"}
        </button>
        <p>סוג האימות הוא None. אחרי בדיקה ב־Preview אפשר לבחור Share ואז Anyone with the link. בניית GPT מתבצעת בגרסת הדפדפן של ChatGPT.</p>
        <Link className="back-link" href="/">חזרה לעורך</Link>
      </article>
    </main>
  );
}