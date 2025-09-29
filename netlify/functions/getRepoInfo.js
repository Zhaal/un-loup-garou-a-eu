// netlify/functions/getRepoInfo.js
exports.handler = async () => {
  try {
    const owner = process.env.GITHUB_OWNER || 'Zhaal';
    const repo = process.env.GITHUB_REPO || 'un-loup-garou-a-eu';

    return {
      statusCode: 200,
      body: JSON.stringify({ owner, repo }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get repository information' }),
    };
  }
};