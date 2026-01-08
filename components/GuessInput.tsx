
import React, { useState, useRef, useEffect } from 'react';
import { YEARS, GP_NAMES } from '../constants';

interface GuessInputProps {
  onGuess: (year: number, gpName: string) => void;
  disabled: boolean;
}

export const GuessInput: React.FC<GuessInputProps> = ({ onGuess, disabled }) => {
  const [year, setYear] = useState<number>(new Date().getFullYear() > 2025 ? 2025 : new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredGPs = GP_NAMES.filter(gp => 
    gp.toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmit = (gpName: string) => {
    if (!gpName) return;
    onGuess(year, gpName);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredGPs.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (highlightedIndex <= 0) {
        setHighlightedIndex(-1);
      } else {
        setHighlightedIndex(prev => prev - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredGPs.length) {
        handleSubmit(filteredGPs[highlightedIndex]);
      } else if (filteredGPs.length > 0) {
        // If no highlight, check for exact match or first result
        const exactMatch = filteredGPs.find(gp => gp.toLowerCase() === query.toLowerCase());
        handleSubmit(exactMatch || filteredGPs[0]);
      }
    } else if (e.key === 'ArrowLeft') {
      if (inputRef.current?.selectionStart === 0) {
        yearRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="flex gap-2">
        <select
          ref={yearRef}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          onKeyDown={handleYearKeyDown}
          disabled={disabled}
          className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all appearance-none cursor-pointer text-sm font-bold shadow-lg min-w-[100px]"
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="relative flex-1" ref={containerRef}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Grand Prix..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm font-medium shadow-lg"
          />
          
          {isOpen && query && filteredGPs.length > 0 && !disabled && (
            <div 
              ref={listRef}
              className="absolute z-[100] bottom-full mb-3 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] max-h-[40vh] overflow-y-auto overflow-x-hidden backdrop-blur-xl"
            >
              {filteredGPs.map((gp, idx) => (
                <button
                  key={gp}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSubmit(gp)}
                  className={`w-full text-left px-5 py-4 transition-colors border-b border-zinc-800/50 last:border-0 text-sm font-semibold ${
                    highlightedIndex === idx ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {gp}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
