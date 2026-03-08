#!/usr/bin/env node
/**
 * Fix sub-components that use Theme/styles without their own useTheme() hook.
 * Strategy: Find arrow/function component declarations that use Theme or styles
 * but don't have their own useTheme() call, and add one.
 */
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

const filesToFix = [
  'app/cards/ai-import.tsx',
  'app/cards/generate.tsx',
  'app/collections/create.tsx',
  'app/study/[id].tsx',
  'components/features/profile/ActivityHeatmap.tsx',
  'components/features/profile/ReviewForecast.tsx',
  'components/features/shared/FlashcardListItem.tsx',
  'components/features/stats/AnimatedCounter.tsx',
  'components/features/stats/CircularProgress.tsx',
  'components/features/stats/WeeklyChart.tsx',
];

for (const relFile of filesToFix) {
  const filePath = path.join(ROOT, relFile);
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let modified = false;

  // Find all function/arrow-function component declarations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect component declarations
    let isComponentStart = false;
    
    // Pattern: function ComponentName(...) {
    if (line.match(/^(?:export\s+)?(?:default\s+)?function\s+\w+\s*\(/)) {
      isComponentStart = line.includes('{');
    }
    // Pattern: const ComponentName = (...) => {
    if (line.match(/^(?:export\s+)?const\s+\w+\s*=\s*\(/) && line.includes('=>')) {
      isComponentStart = line.includes('{');
    }
    // Pattern: const ComponentName = ({ ... multi-line on next lines...
    if (line.match(/^(?:export\s+)?const\s+\w+\s*=\s*\(/)) {
      // Look ahead for => {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('=> {')) {
          isComponentStart = true;
          i = j; // move to the brace line
          break;
        }
      }
    }
    
    if (!isComponentStart) continue;
    
    // Check if next line already has useTheme
    if (i + 1 < lines.length && lines[i + 1].includes('useTheme')) continue;
    if (i + 2 < lines.length && lines[i + 2].includes('useTheme')) continue;

    // Check if this component body uses Theme or styles (scan until the end)
    let braceCount = 0;
    let usesTheme = false;
    let usesStyles = false;
    let startedCounting = false;

    for (let j = i; j < lines.length && j < i + 200; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { braceCount++; startedCounting = true; }
        if (ch === '}') braceCount--;
      }
      if (lines[j].match(/\bTheme\./)) usesTheme = true;
      if (lines[j].match(/\bstyles\./)) usesStyles = true;
      if (startedCounting && braceCount === 0) break;
    }

    if (!usesTheme && !usesStyles) continue;

    // This component needs useTheme
    const indent = lines[i].match(/^\s*/)?.[0] || '  ';
    const hookLine = indent + "  const { colors: Theme, isDark, shadows } = useTheme();";
    const styleLine = indent + "  const styles = getStyles(Theme);";

    const insertions = [];
    if (usesTheme) insertions.push(hookLine);
    if (usesStyles && lines.some(l => l.includes('getStyles'))) insertions.push(styleLine);

    if (insertions.length > 0) {
      lines.splice(i + 1, 0, ...insertions);
      modified = true;
      console.log(`  Added useTheme to component at line ${i + 1} in ${relFile}`);
      i += insertions.length; // skip inserted lines
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('✅ Fixed: ' + relFile);
  } else {
    console.log('⏭️  No change: ' + relFile);
  }
}

console.log('\nDone!');
