const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('git status -s', { cwd: __dirname }).toString();
  fs.writeFileSync('git_status_output.txt', output);
  console.log('Status written to git_status_output.txt');
} catch (e) {
  fs.writeFileSync('git_status_output.txt', 'ERROR: ' + e.message);
}
