import { exec } from 'child_process';
import fs from 'fs';
import 'jest';
import path from 'path';

const TSC_ESM_PATH = path.resolve(__dirname, '../dist/FlowSheet.js');
const TSC_ESM_SOURCEMAP_PATH = path.resolve(__dirname, '../dist/FlowSheet.js.map');

describe('tsc bundle result', () => {
  test('should generate FlowSheet.js and FlowSheet.js.map for ES2015 modules', (done) => {
    // Run tsc in child process
    const forked = exec('npm run dev', (err, stdout, stderr) => {
      if (err) {
        throw err;
        done();
      }

      expect(fs.existsSync(TSC_ESM_PATH)).toBeTruthy();
      expect(fs.existsSync(TSC_ESM_SOURCEMAP_PATH)).toBeTruthy();
      done();
    });
  }, 10000); // Need extra time to run tsc command
});
