// netlify/functions/saveStock.js
const { Octokit } = require('@octokit/rest');

// On lit la clé depuis les variables d'env (à configurer sur Netlify)
const octo = new Octokit({ auth: process.env.GITHUB_TOKEN });

exports.handler = async (event) => {
  try {
    const owner = 'Zhaal';              // ton user GitHub
    const repo  = 'un-loup-garou-a-eu'; // ton dépôt
    const path  = 'stock-gardiens.json'; // NOM DU FICHIER POUR LE STOCK

    // Encodage du JSON envoyé depuis la page
    const content = Buffer.from(event.body).toString('base64');
    let sha;

    // Si le fichier existe déjà, on récupère son SHA
    try {
      const { data } = await octo.repos.getContent({ owner, repo, path });
      sha = data.sha;
    } catch (e) {
      // fichier absent => sha reste undefined
    }

    // Création ou mise à jour du fichier
    await octo.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: 'Sauvegarde automatique du stock via Netlify Function',
      content, sha,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
