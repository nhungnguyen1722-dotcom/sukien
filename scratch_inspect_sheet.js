const fs = require('fs');

function inspectContent() {
  const file = 'C:/Users/User/.gemini/antigravity/brain/7d6de6b0-13b2-49b6-b5d6-55d5d4b557d3/.system_generated/steps/373/content.md';
  if (!fs.existsSync(file)) {
    console.log('File does not exist');
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  console.log('Total content length:', content.length);

  // Search for sheet/tab definitions in Google Sheets initial data
  // Look for occurrences of "gid=" or sheet names
  const regex = /gid=(\d+)/g;
  let match;
  const gids = new Set();
  while ((match = regex.exec(content)) !== null) {
    gids.add(match[1]);
  }
  console.log('Found GIDs:', Array.from(gids));

  // Also search for any Vietnamese words near "thành viên" or "Sheet"
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('thành viên') || line.includes('Thành viên') || line.includes('sheet') || line.includes('Sheet')) {
      console.log(`Line ${idx}: ${line.substring(0, 200)}`);
    }
  });
}

inspectContent();
