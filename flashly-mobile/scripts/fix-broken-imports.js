#!/usr/bin/env node
/**
 * Fix broken import placements where useTheme import was spliced
 * inside multi-line import blocks.
 */
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

const filesToCheck = [
  'app/(auth)/register.tsx',
  'app/(tabs)/statistics.tsx',
  'app/cards/ai-import.tsx',
  'app/cards/generate.tsx',
  'app/collections/create.tsx',
  'app/quiz/[id].tsx',
  'app/study/[id].tsx',
  'components/features/dashboard/DeckActionSheet.tsx',
  'components/features/dashboard/GlobalBrainWidget.tsx',
  'components/features/profile/RetentionChart.tsx',
  'components/features/profile/ReviewForecast.tsx',
  'components/features/shared/FlashcardEditModal.tsx',
];

let fixedCount = 0;

for (const relFile of filesToCheck) {
  const filePath = path.join(ROOT, relFile);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern: the useTheme import is somewhere inside another import block
  // We need to:
  // 1. Remove the misplaced import line
  // 2. Add it after all imports are done
  
  const useThemeLine = "import { useTheme } from '@/hooks/useTheme';";
  
  if (content.includes(useThemeLine)) {
    // Remove ALL occurrences of the useTheme import line
    content = content.split('\n').filter(line => line.trim() !== useThemeLine).join('\n');
    
    // Now find the last proper import statement and add useTheme after it
    const lines = content.split('\n');
    let lastImportEnd = -1;
    let inImport = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('import ')) {
        inImport = true;
        // Check if it's a single-line import
        if (line.includes(' from ') && (line.endsWith(';') || line.endsWith("';"))) {
          lastImportEnd = i;
          inImport = false;
        }
      }
      
      if (inImport && line.includes(' from ')) {
        lastImportEnd = i;
        inImport = false;
      }
    }
    
    if (lastImportEnd >= 0) {
      lines.splice(lastImportEnd + 1, 0, useThemeLine);
      content = lines.join('\n');
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log('✅ Fixed: ' + relFile);
  } else {
    console.log('⏭️  No change: ' + relFile);
  }
}

console.log('\nFixed ' + fixedCount + ' files.');
