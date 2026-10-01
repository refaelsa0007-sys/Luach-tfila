import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="app-shell" dir="rtl">
      <article className="info-page">
        <span className="eyebrow">בית כנסת אברך שלום</span>
        <h1>מדיניות פרטיות</h1>
        <p>עורך הלוחות מעבד את המלל והשעות בדפדפן כדי ליצור תמונה. אין צורך בחשבון והאתר אינו מבקש מידע אישי.</p>
        <h2>קישורי שיתוף</h2>
        <p>פרטי הלוח מקודדים בתוך הקישור. כל מי שמקבל אותו יכול לראות את התוכן, ולכן אין להזין מידע שאינו מיועד לפרסום.</p>
        <h2>GPT Actions</h2>
        <p>הפעולה מקבלת רק את תוכן הלוח שהתבקש ומחזירה קישור לעריכה ולהורדה. התוכן אינו נשמר במסד נתונים של האתר.</p>
        <Link className="back-link" href="/">חזרה לעורך</Link>
      </article>
    </main>
  );
}