
import React from 'react';

export const AboutUsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 sm:p-10 max-w-3xl my-8">
      <div className="bg-white dark:bg-dark-cardBg shadow-xl rounded-xl p-8 md:p-12 border border-neutral-DEFAULT dark:border-dark-border">
        <h2 className="text-2xl sm:text-3xl font-sans font-bold text-neutral-dark dark:text-dark-text mb-6 text-center whitespace-nowrap">
          ✨ เกี่ยวกับหาจ๊อบจ้า ✨
        </h2>

        <div className="space-y-5 font-serif text-neutral-dark dark:text-dark-textMuted leading-relaxed font-normal text-base sm:text-lg">
          <p>
            หาจ๊อบจ้า คือพื้นที่เล็ก ๆ สำหรับคนที่อยากใช้เวลาและทักษะที่มี ให้เกิดประโยชน์มากขึ้น
          </p>
          <p>
            บางคนเป็นพนักงานประจำ แต่มีเวลาว่างช่วงเย็น อยากหารายได้เพิ่มด้วยการเป็นโค้ชฟิตเนส
            <br />
            บางคนเป็นพนักงานขายในห้าง แต่จริง ๆ ทำขนมอร่อยมาก และพร้อมส่งตามออเดอร์
            <br />
            บางคนมีรถยนต์ และสามารถขับของไปส่งต่างจังหวัดได้เป็นครั้งคราว
          </p>
          <p>
            หลายคนมีทักษะที่โลกออนไลน์ไม่เคยเห็น และงานด่วนที่อาจจะไม่ทันได้ประกาศบนโซเชียลฯ
          </p>

          <h3 className="text-xl sm:text-2xl font-sans font-semibold text-neutral-dark dark:text-dark-text pt-4">
            เราสร้างแพลตฟอร์มนี้ขึ้นเพื่อรวบรวม:
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>งานเฉพาะกิจ งานเร่ง งานพาร์ทไทม์</li>
            <li>คนที่มีทักษะ หรือแค่พร้อมช่วยเหลือในช่วงเวลาสั้น ๆ</li>
            <li>และพื้นที่ให้คนเจอกันโดยไม่ต้องกลัวว่าจะเลื่อนโพสต์ไม่ทัน</li>
          </ul>

          <p className="pt-2">
            ไม่ต้องเป็นบริษัท ไม่ต้องมีประวัติยืดยาว
            <br />
            แค่มีทักษะ ความตั้งใจ และเบอร์ติดต่อ
          </p>

          <p className="text-xl sm:text-2xl font-sans font-semibold text-neutral-medium dark:text-dark-textMuted pt-5 text-center italic">
            “เราเชื่อว่าโอกาสใหม่ ๆ มักเริ่มจากสิ่งเล็ก ๆ เสมอ”
          </p>
        </div>
      </div>
    </div>
  );
};