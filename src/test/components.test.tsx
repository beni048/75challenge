import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RuleCustomizer, { DEFAULT_75_HARD_RULES } from '@/components/RuleCustomizer';
import { MIN_RULES, MAX_RULES } from '@/lib/rules-policy';
import HypeButton from '@/components/HypeButton';
import HelpFeedback from '@/components/HelpFeedback';
import SiteHeader from '@/components/SiteHeader';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// SiteHeader navigates through the app router, which has no provider in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

describe('UI Components', () => {
  describe('RuleCustomizer', () => {
    it('renders the default rules and badges', () => {
      const handleChange = vi.fn();
      render(<RuleCustomizer rules={DEFAULT_75_HARD_RULES} onChange={handleChange} />);

      expect(screen.getByText(/Your habits/i)).toBeInTheDocument();
      expect(screen.getByText(/5 habits/i)).toBeInTheDocument();
      // Habit titles are editable inputs, not static text, so assert on value.
      expect(screen.getByDisplayValue(/Drink 4 Liters of Water/i)).toBeInTheDocument();
    });

    it(`shows a warning when fewer than the ${MIN_RULES}-habit minimum are set`, () => {
      const handleChange = vi.fn();
      const singleRule = [DEFAULT_75_HARD_RULES[0]];
      render(<RuleCustomizer rules={singleRule} onChange={handleChange} />);

      expect(
        screen.getByText(new RegExp(`at least ${MIN_RULES} habits`, 'i'))
      ).toBeInTheDocument();
    });

    it('lets a default habit be edited in place without deleting it first', () => {
      const handleChange = vi.fn();
      render(<RuleCustomizer rules={DEFAULT_75_HARD_RULES} onChange={handleChange} />);

      const firstHabit = screen.getByDisplayValue(DEFAULT_75_HARD_RULES[0].title);
      fireEvent.change(firstHabit, { target: { value: 'Swim 1km' } });

      expect(handleChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: 'Swim 1km' })])
      );
    });

    it(`stops offering the add field at the ${MAX_RULES}-habit maximum`, () => {
      const handleChange = vi.fn();
      const maxed = Array.from({ length: MAX_RULES }, (_, i) => ({
        id: `r${i}`,
        title: `Habit ${i}`,
        schedule_type: 'daily' as const,
      }));
      render(<RuleCustomizer rules={maxed} onChange={handleChange} />);

      expect(screen.queryByTestId('new-rule-input')).not.toBeInTheDocument();
      expect(screen.getByText(new RegExp(`maximum of ${MAX_RULES}`, 'i'))).toBeInTheDocument();
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

  describe('SiteHeader', () => {
    // The panel only renders while open; the CSS decides at which width the
    // burger itself is visible.
    const panel = () => document.getElementById('nav-mobile-panel');

    it('opens and closes the burger panel from the trigger', () => {
      render(<SiteHeader />);
      expect(panel()).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
      expect(panel()).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /close menu/i }));
      expect(panel()).toBeNull();
    });

    it('offers the signed-out actions inside the panel', () => {
      render(<SiteHeader />);
      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

      const inPanel = within(panel()!);
      expect(inPanel.getByRole('link', { name: /log in/i })).toBeInTheDocument();
      expect(inPanel.getByRole('link', { name: /join 75 challenge/i })).toBeInTheDocument();
      // The ids stay on the desktop copy, so they are never duplicated.
      expect(document.querySelectorAll('#nav-login')).toHaveLength(1);
    });

    it('closes the panel on Escape', () => {
      render(<SiteHeader />);
      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(panel()).toBeNull();
    });
  });
});
