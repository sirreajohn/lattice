const fs = require('fs');
const files = [
  'src/lib/ui/Navbar.svelte',
  'src/lib/ui/Toolbar.svelte',
  'src/lib/ui/SettingsOverlay.svelte'
];

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replacements
  content = content.replace(/#0a0a0a/g, 'var(--color-surface)');
  content = content.replace(/#222/g, 'var(--color-border)');
  content = content.replace(/bg-white\/10/g, 'bg-[var(--color-text-primary)]/10');
  content = content.replace(/bg-white\/5/g, 'bg-[var(--color-text-primary)]/5');
  content = content.replace(/ring-white/g, 'ring-[var(--color-text-primary)]');
  
  // Specific text replacements to avoid breaking legitimate color uses
  content = content.replace(/text-neutral-500/g, 'text-[var(--color-text-secondary)]');
  content = content.replace(/text-neutral-600/g, 'text-[var(--color-text-secondary)]');
  
  // Only replace text-white when it's heavily used in hover states 
  // and active states that aren't accent
  content = content.replace(/hover:text-white/g, 'hover:text-[var(--color-text-primary)]');
  content = content.replace(/text-white text-\[10px\]/g, 'text-[var(--color-text-primary)] text-[10px]');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed theme colors');
