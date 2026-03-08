#!/usr/bin/env node
/**
 * Remove misplaced useTheme() lines that were incorrectly inserted inside
 * arrow function parameter destructuring blocks.
 * These lines should be removed (they're duplicates of correct ones in the function body).
 */
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

// Map of file -> error line numbers (1-indexed)
const fixes = {
  'app/cards/ai-import.tsx': [610],
  'app/study/[id].tsx': [621],
  'components/features/profile/ActivityHeatmap.tsx': [178],
  'components/features/profile/ReviewForecast.tsx': [205],
  'components/features/shared/FlashcardListItem.tsx': [66, 67, 128, 129, 183],
  'components/features/stats/CircularProgress.tsx': [33],
  'components/features/stats/WeeklyChart.tsx': [30, 31, 260],
};

for (const [relFile, errorLines] of Object.entries(fixes)) {
  const filePath = path.join(ROOT, relFile);
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');

  // We need to check each error line and its context
  // Lines with `const { colors: Theme` or `const styles = getStyles(Theme)` 
  // that appear BEFORE a closing }: SomeType) {  are misplaced
  
  // Collect line indices to remove (0-indexed)
  const linesToRemove = new Set();
  
  for (const lineNum of errorLines) {
    const idx = lineNum - 1;
    if (idx >= 0 && idx < lines.length) {
      const line = lines[idx].trim();
      if (line.startsWith('const { colors: Theme') || line.startsWith('const styles = getStyles')) {
        linesToRemove.add(idx);
      }
    }
  }
  
  if (linesToRemove.size > 0) {
    // Remove lines in reverse order to preserve indices
    const sortedIndices = [...linesToRemove].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      lines.splice(idx, 1);
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ Removed ${linesToRemove.size} misplaced line(s) from ${relFile}`);
  } else {
    console.log(`⏭️  No misplaced lines found in ${relFile}`);
  }
}

console.log('\nDone!');
