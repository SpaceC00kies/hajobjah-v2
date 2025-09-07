import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  onOpenFeedbackModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenFeedbackModal }) => {
  const navigate = useNavigate();

  return (
    <footer className="w-full p-6 sm:p-8 mt-auto bg-transparent">
      <div className="container mx-auto text-primary-dark">
        <div className="grid place-items-center gap-3 max-w-sm mx-auto">

          <div className="text-center">
            <div className="flex items-center justify-center gap-x-1 font-sans text-sm">
              <button onClick={() => navigate('/about')} className="hover:text-primary transition-colors px-2 py-1">
                เกี่ยวกับเรา
              </button>
              <span className="text-neutral-gray">|</span>
              <button onClick={() => navigate('/safety')} className="hover:text-primary transition-colors px-2 py-1">
                ความปลอดภัย
              </button>
              <span className="text-neutral-gray">|</span>
              <button onClick={onOpenFeedbackModal} className="hover:text-primary transition-colors px-2 py-1">
                ส่ง Feedback
              </button>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center text-xs">
              <span className="font-sans">Created by </span>
              <a href="https://www.facebook.com/bluecathousestudio/" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary-dark hover:text-primary font-medium font-sans ml-1 transition-colors">
                <img alt="Blue Cat House Logo" src="https://i.postimg.cc/wxrcQPHV/449834128-122096458958403535-3024125841409891827-n-1-removebg-preview.png" className="h-4 w-auto mr-1" />
                <span>Blue Cat House</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};