@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

@layer base {
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer components {
  .card-lift {
    @apply transition-all duration-200 ease-out;
  }
  .card-lift:hover {
    @apply -translate-y-1;
    box-shadow: 0 8px 30px rgba(124, 109, 240, 0.15);
  }
  .glass-border {
    @apply border border-white/[0.06];
  }
  .traffic-green { @apply bg-emerald-500/10 border-emerald-500/30 text-emerald-400; }
  .traffic-yellow { @apply bg-amber-500/10 border-amber-500/30 text-amber-400; }
  .traffic-red { @apply bg-red-500/10 border-red-500/30 text-red-400; }

  .gradient-text {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400;
  }
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,109,240,0.3); border-radius: 3px; }

/* Bottom nav safe area */
.pb-safe { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
