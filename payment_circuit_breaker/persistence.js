const fs = require('fs').promises;
let filePath = './persisted_state.json';

function setFilePath(path) {
  filePath = path;
}

async function saveState(state) {
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

async function loadState() {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

module.exports = { saveState, loadState, setFilePath }; 