#!/usr/bin/env node
/**
 * Fix Script: Move `Theme.` references from StyleSheet.create to dynamic styles.
 * 
 * Strategy: Replace `const styles = StyleSheet.create({...})` with a function
 * `const getStyles = (Theme) => StyleSheet.create({...})` and add
 * `const styles = getStyles(Theme);` inside the component.
 */

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

// Find all files with Theme. in stylesheet
const { execSync } = require('child_process');
const files = execSync(
  `grep -rl "Theme\\." --include="*.tsx" --include="*.ts" app/ components/`,
  { cwd: ROOT }
).toString().trim().split('\n');

// Files already fixed manually
const SKIP = [
  'components/ui/Typography.tsx',
  'components/ui/GlassCard.tsx', 
  'components/ui/GradientBackground.tsx',
  'components/ui/Skeleton.tsx',
  'components/ui/LoadingScreen.tsx',
  'components/ui/FlashcardsIcon.tsx',
];

let fixedCount = 0;

for (const relFile of files) {
  if (SKIP.includes(relFile)) continue;
  
  const filePath = path.join(ROOT, relFile);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if there are Theme. refs inside StyleSheet.create
  const ssIndex = content.indexOf('StyleSheet.create(');
  if (ssIndex < 0) continue;
  
  const afterSS = content.slice(ssIndex);
  if (!afterSS.includes('Theme.')) continue;
  
  const original = content;
  
  // Strategy: Replace `const styles = StyleSheet.create({` with 
  // `const getStyles = (Theme: any) => StyleSheet.create({`
  // and add closing `)` - the pattern is already `StyleSheet.create({...});`
  
  // Find "const styles = StyleSheet.create({"
  const stylesDeclMatch = content.match(/^(const styles = )(StyleSheet\.create\()/m);
  if (!stylesDeclMatch) {
    console.log(`  SKIP: No standard styles declaration in ${relFile}`);
    continue;
  }
  
  // Replace the declaration
  content = content.replace(
    /^const styles = StyleSheet\.create\(/m,
    'const getStyles = (Theme: any) => StyleSheet.create('
  );
  
  // Add `const styles = getStyles(Theme);` after the useTheme() call
  const useThemeMatch = content.match(/const \{ colors: Theme.*\} = useTheme\(\);/);
  if (useThemeMatch) {
    const idx = content.indexOf(useThemeMatch[0]);
    const afterHook = idx + useThemeMatch[0].length;
    content = content.slice(0, afterHook) + '\n  const styles = getStyles(Theme);' + content.slice(afterHook);
  } else {
    console.log(`  SKIP: No useTheme() hook found in ${relFile}`);
    continue;
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`✅ Fixed: ${relFile}`);
  }
}

console.log(`\nDone! Fixed ${fixedCount} files.`);
