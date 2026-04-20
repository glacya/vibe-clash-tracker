#!/usr/bin/env node
/**
 * data/ 하위 JSON 파일에서 resource_type 값이 문자열인 경우 배열로 변환합니다.
 * 예) "resource_type": "gold"  →  "resource_type": ["gold"]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

function fixResourceType(obj) {
  if (Array.isArray(obj)) return obj.map(fixResourceType);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'resource_type' && typeof v === 'string') {
        result[k] = [v];
      } else {
        result[k] = fixResourceType(v);
      }
    }
    return result;
  }
  return obj;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.json')) {
      const original = fs.readFileSync(full, 'utf8');
      const parsed = JSON.parse(original);
      const fixed = fixResourceType(parsed);
      const out = JSON.stringify(fixed, null, 4) + '\n';
      if (out !== original) {
        fs.writeFileSync(full, out, 'utf8');
        console.log('Fixed:', path.relative(DATA_DIR, full));
      }
    }
  }
}

walk(DATA_DIR);
console.log('Done.');
