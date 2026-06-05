const { Octokit } = require('@octokit/rest');
const base64 = require('js-base64').Base64;

const DEFAULT_OWNER = process.env.GITHUB_OWNER || 'lorsgordors';
const DEFAULT_REPO = process.env.GITHUB_REPO || 'devlizard-data';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.warn('⚠️ GITHUB_TOKEN not set — githubClient will fail on write operations');
}

const octokit = new Octokit({ auth: token });

async function getFileContent(path, options = {}) {
  const owner = options.owner || DEFAULT_OWNER;
  const repo = options.repo || DEFAULT_REPO;

  try {
    const res = await octokit.repos.getContent({ owner, repo, path });
    const content = Array.isArray(res.data)
      ? null
      : base64.decode(res.data.content);
    return { content, sha: res.data.sha };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function getJson(path, options = {}) {
  const file = await getFileContent(path, options);
  if (!file || !file.content) return null;
  try {
    return { json: JSON.parse(file.content), sha: file.sha };
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}: ${err.message}`);
  }
}

async function createOrUpdateJson(path, data, message, options = {}) {
  if (!token) throw new Error('GITHUB_TOKEN is required for write operations');

  const owner = options.owner || DEFAULT_OWNER;
  const repo = options.repo || DEFAULT_REPO;

  const content = base64.encode(JSON.stringify(data, null, 2));

  // Try get current file to obtain sha
  const existing = await getFileContent(path, { owner, repo });

  const params = {
    owner,
    repo,
    path,
    message: message || `Update ${path}`,
    content,
  };

  if (existing && existing.sha) params.sha = existing.sha;

  const res = await octokit.repos.createOrUpdateFileContents(params);
  return res.data;
}

module.exports = { getFileContent, getJson, createOrUpdateJson };
