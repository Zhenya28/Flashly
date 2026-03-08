#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

const files = [
  'components/features/explore/CategoryCard.tsx',
  'components/features/explore/PublicCollectionCard.tsx',
  'components/features/explore/FeaturedCollectionCard.tsx',
  'components/features/dashboard/SmartHeroWidget.tsx',
  'components/features/dashboard/DeckActionSheet.tsx',
  'components/features/dashboard/GlobalBrainWidget.tsx',
  'components/features/dashboard/TrainingModesScroll.tsx',
];

for (const f of files) {
  const filePath = path.join(ROOT, f);
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;

  // Step 1: Ensure useTheme is called inside the component
  if (!content.includes('colors: Theme')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('=> {') && 
          (lines[i].includes('export const') || (i > 0 && lines[i-1].includes('export const')))) {
        lines.splice(i + 1, 0, '  const { colors: Theme, isDark, shadows } = useTheme();');
        break;
      }
    }
    content = lines.join('\n');
  }

  // Step 2: Convert StyleSheet.create to getStyles if Theme is referenced in it
  const ssIdx = content.indexOf('StyleSheet.create(');
  if (ssIdx >= 0 && content.slice(ssIdx).includes('Theme.')) {
    if (!content.includes('getStyles')) {
      content = content.replace(
        'const styles = StyleSheet.create(',
        'const getStyles = (Theme: any) => StyleSheet.create('
      );

      content = content.replace(
        'const { colors: Theme, isDark, shadows } = useTheme();',
        'const { colors: Theme, isDark, shadows } = useTheme();\n  const styles = getStyles(Theme);'
      );
    }
  }

  if (content !== orig) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + path.basename(f));
  } else {
    console.log('No change: ' + path.basename(f));
  }
}

console.log('Done!');
