
import React from 'react';

export const AboutUsPage: React.FC = () => {
  return (
    <main className="container mx-auto p-6 sm:p-10 max-w-3xl my-8">
      <article className="app-card p-8 md:p-12">
        <header className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-modern text-center" style={{ color: 'var(--primary-blue)' }}>
            เกี่ยวกับเรา
          </h1>
        </header>

        <div className="space-y-5 font-serif text-neutral-dark leading-relaxed font-normal text-base sm:text-lg">
          <blockquote className="text-xl sm:text-2xl font-modern font-semibold pt-5 text-center italic" style={{ color: 'var(--primary-blue)' }}>
            เราเชื่อมั่นว่า "โอกาสใหม่ ๆ มักเริ่มจากสิ่งเล็ก ๆ"
          </blockquote>
          
          <p>
            ทุกคนมีของดีซ่อนอยู่ มีทักษะบางอย่างที่อาจไม่ได้ใช้เต็มที่ เพียงเพราะไม่มีโอกาสหรือบริหารเวลาไม่ได้ HAJOBJA.COM (หาจ๊อบจ้า) อยากเป็น "พื้นที่แห่งโอกาส" เพื่อเชื่อมโยงผู้คนเข้าหากันในยุคที่ทุกอย่างหมุนไวและงานก็ไม่ได้จำกัดอยู่แค่ในออฟฟิศหรือเวลางาน
          </p>

          <h2 className="text-xl sm:text-2xl font-modern font-semibold pt-4" style={{ color: 'var(--primary-blue)' }}>
            สำหรับผู้ที่มองหาโอกาส:
          </h2>
          <p>
            คุณอาจเป็นพนักงานประจำที่มี "ไฟในใจ" อยากใช้เวลาช่วงเย็นไปเป็นโค้ชฟิตเนสที่ปลุกพลังให้คนอื่นได้แข็งแรง หรือเป็นพนักงานขายในห้างที่หลังเลิกงานแล้วมือไม่ว่าง เพราะมีทักษะการทำขนมอร่อยล้ำ พร้อมส่งตรงถึงบ้านตามออเดอร์
          </p>

          <h2 className="text-xl sm:text-2xl font-modern font-semibold pt-4" style={{ color: 'var(--primary-blue)' }}>
            สำหรับผู้ที่มองหาคนเก่ง:
          </h2>
          <p>
            คุณอาจเป็นเจ้าของธุรกิจที่ต้องการ "มือฉับไว" มาช่วยงานเฉพาะกิจ หรืองานเร่งด่วนที่ประกาศหาในช่องทางปกติไม่ทันการแถมยังคุณภาพต่ำ งานช่วยจัดบูธเพียงไม่กี่ชั่วโมง หรืองานช่วยแพ็คของจำนวนมากในช่วงเทศกาล
          </p>

          <p className="pt-2">
            เราขอแค่คุณมี "ทักษะ" "ความตั้งใจที่เต็มเปี่ยม" และ "เบอร์ติดต่อที่พร้อม" โอกาสดีๆ ก็จะเป็นของคุณ! (แต่ต้องซื่อสัตย์และไม่โกงด้วย)
          </p>
        </div>
      </article>
    </main>
  );
};
