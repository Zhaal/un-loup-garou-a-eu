// netlify/functions/getRepoInfo.js
exports.handler = async () => {
  try {
    let owner = process.env.GITHUB_OWNER || 'Zhaal';
    let repo = process.env.GITHUB_REPO || 'un-loup-garou-a-eu';

    // In Netlify, process.env.REPOSITORY_URL is available
    // It looks like: https://github.com/owner/repo-name
    if (process.env.REPOSITORY_URL) {
      const match = process.env.REPOSITORY_URL.match(/github\.com\/(.+)\/(.+)/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ owner, repo }),
    };
  } catch (error) {
    console.error('Failed to get repository information:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get repository information' }),
    };
  }
};