import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock Audio
window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = jest.fn();

describe('FlipScout App', () => {
  test('renders FlipScout header', () => {
    render(<App />);
    expect(screen.getByText('FlipScout')).toBeInTheDocument();
  });

  test('renders Pro badge', () => {
    render(<App />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  test('renders bottom navigation with all tabs', () => {
    render(<App />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Finds')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  test('renders Home tab by default with Scout button', () => {
    render(<App />);
    expect(screen.getByText('🔍 Scout')).toBeInTheDocument();
  });

  test('renders Ready to Scout placeholder', () => {
    render(<App />);
    expect(screen.getByText('Ready to Scout')).toBeInTheDocument();
  });

  test('renders ZIP code input with default value', () => {
    render(<App />);
    const zipInput = screen.getByDisplayValue('01602');
    expect(zipInput).toBeInTheDocument();
  });

  test('switches to Leads tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Leads'));
    expect(screen.getByText('🔥 Live Leads')).toBeInTheDocument();
  });

  test('switches to Finds tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Finds'));
    expect(screen.getByText(/My Finds/)).toBeInTheDocument();
  });

  test('switches to Settings tab and shows controls', () => {
    render(<App />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
    expect(screen.getByText(/Profit Target/)).toBeInTheDocument();
    expect(screen.getByText(/Store Discount/)).toBeInTheDocument();
  });

  test('shows subscription tiers on Settings', () => {
    render(<App />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('$1 First Month')).toBeInTheDocument();
    const starterElements = screen.getAllByText('Starter');
    expect(starterElements.length).toBeGreaterThanOrEqual(1);
    const proElements = screen.getAllByText('Pro');
    expect(proElements.length).toBeGreaterThanOrEqual(1);
    const enterpriseElements = screen.getAllByText('Enterprise');
    expect(enterpriseElements.length).toBeGreaterThanOrEqual(1);
  });

  test('renders community tab with community stats', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Social'));
    expect(screen.getByText('🏆 FlipScout Community')).toBeInTheDocument();
    expect(screen.getByText('🏆 Success Stories')).toBeInTheDocument();
    expect(screen.getByText('💬 Live Chat')).toBeInTheDocument();
  });

  test('renders category dropdown', () => {
    render(<App />);
    const catSelect = screen.getByDisplayValue('🔍 All Categories');
    expect(catSelect).toBeInTheDocument();
  });

  test('renders notification and viral demo on Settings', () => {
    render(<App />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText(/Test "RUN! DEAL DETECTED" Alert/)).toBeInTheDocument();
    expect(screen.getByText(/Test "Viral Sighting" Alert/)).toBeInTheDocument();
  });

  test('renders toggle controls on Settings', () => {
    render(<App />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText(/Sound Effects/)).toBeInTheDocument();
    expect(screen.getByText(/Haptic Vibration/)).toBeInTheDocument();
    expect(screen.getByText(/Viral Alerts/)).toBeInTheDocument();
  });
});
