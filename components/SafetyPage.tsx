
import React from 'react';

export const SafetyPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 sm:p-10 max-w-3xl my-8">
      <div className="bg-white dark:bg-dark-cardBg shadow-xl rounded-xl p-8 md:p-12 border border-neutral-DEFAULT dark:border-dark-border">
        <h2 className="text-2xl sm:text-3xl font-sans font-bold text-neutral-dark dark:text-dark-text mb-6 text-center">
          🛡️ เพื่อความปลอดภัย โปรดอ่าน
        </h2>

        <div className="space-y-5 font-serif text-neutral-dark dark:text-dark-textMuted leading-relaxed font-normal text-base sm:text-lg">
          <p>
            หาจ๊อบจ้าเป็นพื้นที่เปิดให้ทุกคนสามารถหางาน หรือประกาศหาคนช่วยงานได้อย่างอิสระ
            <br />
            เพื่อความปลอดภัยในการใช้งาน โปรดปฏิบัติตามคำแนะนำเหล่านี้:
          </p>
          
          <ul className="list-disc list-inside space-y-2 pl-4 bg-neutral-light/70 dark:bg-dark-inputBg p-4 rounded-lg border border-neutral-DEFAULT dark:border-dark-border">
            <li>
              <strong className="text-red-600 dark:text-red-400">ห้ามโอนเงินก่อนเริ่มงาน</strong> หรือก่อนเจอผู้ว่าจ้าง/ผู้ให้บริการจริง
            </li>
            <li>
              นัดเจอในสถานที่ปลอดภัย โดยเฉพาะหากเป็นการทำงานครั้งแรก
            </li>
            <li>
              หลีกเลี่ยงการให้ข้อมูลส่วนตัวที่สำคัญเกินความจำเป็น
            </li>
            <li>
              หากพบพฤติกรรมต้องสงสัย โปรดแจ้งทีมงานทันที
            </li>
          </ul>

          <p className="pt-2">
            <strong className="text-neutral-dark dark:text-dark-text">
              แพลตฟอร์มนี้ไม่ได้รับผิดชอบต่อความเสียหายที่เกิดจากการติดต่อหรือการทำงานระหว่างผู้ใช้
            </strong>
            <br />
            แต่เรายินดีรับฟังและช่วยเหลือหากพบการใช้งานที่ไม่เหมาะสม
          </p>

          <p className="text-xl sm:text-2xl font-sans font-semibold text-neutral-medium dark:text-dark-textMuted pt-5 text-center italic">
            🤝 หวังว่าแพลตฟอร์มนี้จะเป็นพื้นที่เล็ก ๆ ที่ให้โอกาสดี ๆ แก่ทุกคนอย่างปลอดภัย
          </p>
        </div>
      </div>
    </div>
  );
};