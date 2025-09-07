
import React from 'react';

export const SafetyPage: React.FC = () => {
  return (
    <main className="container mx-auto p-6 sm:p-10 max-w-3xl my-8">
      <article className="app-card p-8 md:p-12">
        <header className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-modern text-center" style={{ color: 'var(--primary-blue)' }}>
            โปรดอ่านเพื่อความปลอดภัยของท่าน
          </h1>
        </header>

        <div className="space-y-5 font-serif text-neutral-dark leading-relaxed font-normal text-base sm:text-lg">
          <p>
            เพื่อความปลอดภัยในการใช้งาน โปรดปฏิบัติตามคำแนะนำเหล่านี้:
          </p>

          <section>
            <h2 className="sr-only">คำแนะนำด้านความปลอดภัย</h2>
            <ul className="list-disc list-inside space-y-3 pl-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <li>
                <strong className="text-red-600">อย่าทำธุรกรรมใดๆเกี่ยวกับเงินหากยังไม่มั่นใจหรือมีหลักฐาน</strong>
              </li>
              <li>
                <strong>หากต้องเจอ ตรวจสอบว่าสถานที่ปลอดภัยเสมอ</strong>
              </li>
              <li>
                <strong>หลีกเลี่ยงการให้ข้อมูลส่วนตัว</strong>
              </li>
              <li>
                <strong>หากพบพฤติกรรมต้องสงสัย โปรดแจ้งทีมงานทันที</strong>
              </li>
            </ul>
          </section>

          <p className="pt-4 text-center font-medium" style={{ color: 'var(--primary-blue)' }}>
            แพลตฟอร์มนี้ไม่รับผิดชอบความเสียหายที่เกิดขึ้นจากการติดต่อหรือการทำงานระหว่างผู้ใช้ แต่เรายินดีรับฟังและช่วยเหลือหากพบการใช้งานที่ไม่เหมาะสม
          </p>
        </div>
      </article>
    </main>
  );
};
