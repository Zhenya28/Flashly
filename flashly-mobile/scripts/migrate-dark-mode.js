#!/usr/bin/env node
/**
 * Dark Mode Migration Script
 * 
 * For each .tsx file that uses Colors.light:
 * 1. Add `import { useTheme } from '@/hooks/useTheme';` if not present
 * 2. Add `const { colors: Theme, isDark, shadows } = useTheme();` after function component declaration
 * 3. Replace `Colors.light.X` with `Theme.X` in JSX (NOT in StyleSheet.create)
 * 4. Replace `<StatusBar style="dark" />` with `<StatusBar style={isDark ? 'light' : 'dark'} />`
 */

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

// Files to skip (already handled manually)
const SKIP_FILES = [
  'app/_layout.tsx',
  'app/(tabs)/_layout.tsx',
  'components/ui/Typography.tsx',
  'components/ui/GlassCard.tsx',
  'components/ui/GradientBackground.tsx',
  'components/ui/Skeleton.tsx',
];

// Get all files with Colors.light
const files = require('child_process')
  .execSync(`grep -rl "Colors\\.light" --include="*.tsx" --include="*.ts" app/ components/`, { cwd: ROOT })
  .toString()
  .trim()
  .split('\n')
  .filter(f => !SKIP_FILES.includes(f));

let updatedCount = 0;
let skippedCount = 0;

for (const relFile of files) {
  const filePath = path.join(ROOT, relFile);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has useTheme
  if (content.includes("from '@/hooks/useTheme'")) {
    // Still need to replace Colors.light references
  }
  
  const original = content;
  
  // 1. Add useTheme import if not present
  if (!content.includes("from '@/hooks/useTheme'")) {
    // Add after the last import line
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].match(/^import\s/) || importLines[i].match(/^\s*\}?\s*from\s/)) {
        lastImportIndex = i;
      }
      // Stop if we hit a non-import, non-empty line after imports started
      if (lastImportIndex > 0 && i > lastImportIndex + 1 && importLines[i].trim() && !importLines[i].match(/^import\s/) && !importLines[i].match(/^\s*\}?\s*from\s/)) {
        break;
      }
    }
    
    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, "import { useTheme } from '@/hooks/useTheme';");
      content = importLines.join('\n');
    }
  }
  
  // 2. Add useTheme() hook call after the component function declaration
  // Find patterns like: export default function XxxScreen() {
  // or: export function Xxx() {
  // or: function Xxx() {
  // or: const Xxx = () => {
  const funcPatterns = [
    // export default function ComponentName(...) {
    /^(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/m,
    // export function ComponentName(...) {
    /^(export\s+function\s+\w+\s*\([^)]*\)\s*\{)/m,
    // function ComponentName(...) {  (at start of line)
    /^(function\s+\w+\s*\([^)]*\)\s*\{)/m,
  ];
  
  if (!content.includes("const { colors: Theme, isDark, shadows } = useTheme()")) {
    let inserted = false;
    for (const pattern of funcPatterns) {
      const match = content.match(pattern);
      if (match) {
        const idx = content.indexOf(match[0]);
        const afterBrace = idx + match[0].length;
        content = content.slice(0, afterBrace) + '\n  const { colors: Theme, isDark, shadows } = useTheme();' + content.slice(afterBrace);
        inserted = true;
        break;
      }
    }

    // Try multiline function declarations like:
    // export default function ComponentName() {\n  const ...
    if (!inserted) {
      const multiLineFunc = /^(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\))\s*\{/m;
      const match = content.match(multiLineFunc);
      if (match) {
        const idx = content.indexOf(match[0]);
        const afterBrace = idx + match[0].length;
        content = content.slice(0, afterBrace) + '\n  const { colors: Theme, isDark, shadows } = useTheme();' + content.slice(afterBrace);
        inserted = true;
      }
    }
    
    if (!inserted) {
      console.log(`  WARNING: Could not find function declaration in ${relFile}`);
    }
  }
  
  // 3. Replace Colors.light.X with Theme.X in the JSX portion (before StyleSheet.create)
  // We split at StyleSheet.create to only replace in the JSX portion
  const stylesheetIndex = content.indexOf('StyleSheet.create');
  
  if (stylesheetIndex > 0) {
    const jsxPart = content.slice(0, stylesheetIndex);
    const stylePart = content.slice(stylesheetIndex);
    
    // Replace in JSX part
    const updatedJsx = jsxPart.replace(/Colors\.light\./g, 'Theme.');
    
    // In the style part, also replace Colors.light but more carefully
    // These static refs need to be dynamic now
    const updatedStyle = stylePart.replace(/Colors\.light\./g, 'Theme.');
    
    content = updatedJsx + updatedStyle;
  } else {
    // No StyleSheet.create - replace everywhere
    content = content.replace(/Colors\.light\./g, 'Theme.');
  }
  
  // 4. Replace StatusBar style="dark" with dynamic
  content = content.replace(/<StatusBar style="dark"\s*\/>/g, '<StatusBar style={isDark ? \'light\' : \'dark\'} />');
  
  // 5. Clean up: if Colors is no longer used directly, update import
  // Check if Colors is still referenced (other than through Theme)
  const hasDirectColorsRef = content.match(/\bColors\.(light|dark)\b/) || content.match(/\bColors\b[^.]/);
  
  // Don't remove Colors import since it might be needed for Spacing, Radius, Shadows
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`✅ Updated: ${relFile}`);
  } else {
    skippedCount++;
    console.log(`⏭️  Skipped (no changes): ${relFile}`);
  }
}

console.log(`\nDone! Updated ${updatedCount} files, skipped ${skippedCount} files.`);
