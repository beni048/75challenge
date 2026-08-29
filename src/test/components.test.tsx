import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RuleCustomizer, { DEFAULT_75_HARD_RULES } from '@/components/RuleCustomizer';
import HypeButton from '@/components/HypeButton';
import HelpFeedback from '@/components/HelpFeedback';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('UI Components', () => {
  describe('RuleCustomizer', () => {
    it('renders the default rules and badges', () => {
      const handleChange = vi.fn();
      render(<RuleCustomizer rules={DEFAULT_75_HARD_RULES} onChange={handleChange} />);

      expect(screen.getByText(/Configure Your 75-Day Rule Set/i)).toBeInTheDocument();
      expect(screen.getByText(/5 Rules Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Drink 4 Liters of Water/i)).toBeInTheDocument();
    });

    it('shows a warning alert if fewer than 2 rules are active', () => {
      const handleChange = vi.fn();
      const singleRule = [DEFAULT_75_HARD_RULES[0]];
      render(<RuleCustomizer rules={singleRule} onChange={handleChange} />);

      expect(
        screen.getByText(/You must configure at least 2 active rules/i)
      ).toBeInTheDocument();
    });
  });

  describe('HypeButton', () => {
    it('renders all four positive-only reaction buttons', () => {
      const mockReactions = { fire: 5, beast: 3, launch: 2, hype: 8 };
      render(<HypeButton postId="test-post" reactions={mockReactions} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('increments count optimistically on reaction tap', () => {
      const mockReactions = { fire: 5, beast: 0, launch: 0, hype: 0 };
      const handleReact = vi.fn();
      render(<HypeButton postId="test-post" reactions={mockReactions} onReact={handleReact} />);

      const fireBtn = screen.getByTitle('Give Fire hype');
      fireEvent.click(fireBtn);

      expect(screen.getByText('6')).toBeInTheDocument();
      expect(handleReact).toHaveBeenCalledWith('fire');
    });
  });

  describe('HelpFeedback', () => {
    it('renders the floating action trigger button', () => {
      render(<HelpFeedback />);
      expect(screen.getByRole('button', { name: /Help & Feedback/i })).toBeInTheDocument();
    });
  });
});
