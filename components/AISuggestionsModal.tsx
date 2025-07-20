"use client";
import React from 'react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  title: string;
}

export const AISuggestionsModal: React.FC<AISuggestionsModalProps> = ({ isOpen, onClose, suggestions, onSelect, title }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`✨ ${title}`}>
      <div className="space-y-3">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 bg-neutral-light/50 rounded-lg cursor-pointer hover:bg-secondary/20 border border-transparent hover:border-secondary transition-colors"
              onClick={() => onSelect(suggestion)}
            >
              <p className="font-serif text-neutral-dark">{suggestion}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-neutral-medium">No suggestions available.</p>
        )}
      </div>
       <div className="text-center mt-6">
          <Button onClick={onClose} variant="outline" colorScheme="neutral" size="md">
            Close
          </Button>
        </div>
    </Modal>
  );
};