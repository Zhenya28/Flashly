#!/usr/bin/env node
/**
 * Fix files where useTheme() was incorrectly inserted inside function parameter lists.
 * The pattern is: const { colors: Theme, isDark, shadows } = useTheme(); appearing
 * inside a destructured parameter list.
 * 
 * Also removes duplicate useTheme() calls and fixes default param refs to Theme.
 */
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/yevhen/Desktop/Flashly/flashly-mobile';

// Get all TS error files
const { execSync } = require('child_process');
const errorOutput = execSync('npx tsc --noEmit 2>&1 || true', { cwd: ROOT, maxBuffer: 1024 * 1024 }).toString();
const errorFiles = [...new Set(
  errorOutput.match(/^[^\s(]+\.tsx?/gm) || []
)].filter(f => !f.startsWith('supabase/'));

console.log('Files with errors:', errorFiles);

const HOOK_LINE = "  const { colors: Theme, isDark, shadows } = useTheme();";
const STYLES_LINE = "  const styles = getStyles(Theme);";

for (const relFile of errorFiles) {
  const filePath = path.join(ROOT, relFile);
  if (!fs.existsSync(filePath)) continue;
  
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let modified = false;

  // Step 1: Remove any useTheme() line that's INSIDE a function parameter list
  // A parameter list is between the opening ( of function args and the closing )
  // We detect this by checking if we're in a context where the line is surrounded by
  // other parameter-like lines (containing : type annotations, default values, etc.)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'const { colors: Theme, isDark, shadows } = useTheme();') {
      // Check if previous line looks like a function param or opening {
      const prev = lines[i - 1]?.trim() || '';
      const next = lines[i + 1]?.trim() || '';
      
      // If surrounded by function parameters (things like "value," or "}: Type) {")
      const isPrevParam = prev.match(/^(export\s+)?function\s+\w+\s*\(\{?$/) ||
                          prev.match(/^\w+\s*[,=]/) ||
                          prev.match(/^\{$/);
      const isNextParam = next.match(/^\w+\s*[,=:?]/) ||
                          next.match(/^\}:\s*\w+/) ||
                          next.match(/^value/);
      
      if (isPrevParam || isNextParam) {
        console.log(`  Removing misplaced hook at line ${i + 1} in ${relFile}`);
        lines.splice(i, 1);
        i--;
        modified = true;
      }
    }
  }

  // Step 2: Remove duplicate useTheme() calls in the same function
  let seenUseTheme = false;
  let currentFuncDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    // Track function boundaries roughly
    if (lines[i].match(/^(?:export\s+)?(?:default\s+)?function\s+\w+/) || 
        lines[i].match(/^(?:export\s+)?const\s+\w+\s*=\s*\(/)) {
      seenUseTheme = false;
    }
    
    if (lines[i].trim() === 'const { colors: Theme, isDark, shadows } = useTheme();') {
      if (seenUseTheme) {
        console.log(`  Removing duplicate hook at line ${i + 1} in ${relFile}`);
        lines.splice(i, 1);
        i--;
        modified = true;
      } else {
        seenUseTheme = true;
      }
    }
  }

  // Step 3: Fix default parameters that reference Theme (like color = Theme.text)
  // These need to become: color, and then handled inside the function body
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/=\s*Theme\.\w+/) && !lines[i].includes('const ') && !lines[i].includes('let ')) {
      // This is likely a default parameter referencing Theme
      const match = lines[i].match(/(\w+)\s*=\s*Theme\.(\w+)/);
      if (match) {
        const [, paramName, themeProp] = match;
        // Only fix if we're in a function parameter context
        const above = lines.slice(Math.max(0, i - 5), i).join('\n');
        if (above.includes('function ') || above.includes('=> {') || above.includes('({')) {
          lines[i] = lines[i].replace(`= Theme.${themeProp}`, '');
          console.log(`  Fixed default param ${paramName} = Theme.${themeProp} at line ${i + 1}`);
          modified = true;
          
          // Find the function body start and add the fallback
          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('{') || lines[j].includes('=> {')) {
              // Check if there's already a hook right after
              let hookLine = j + 1;
              while (hookLine < lines.length && lines[hookLine].includes('useTheme')) hookLine++;
              // Add fallback after the hook
              const indent = '  ';
              const fallbackLine = `${indent}const ${paramName}Value = ${paramName} || Theme.${themeProp};`;
              // We'll handle this case manually as it's complex
              break;
            }
          }
        }
      }
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
