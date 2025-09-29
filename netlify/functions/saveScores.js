const { Octokit } = require("@octokit/rest");
const {
  createOrUpdateTextFile,
} = require("@octokit/plugin-create-or-update-text-file");

const MyOctokit = Octokit.plugin(createOrUpdateTextFile);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "GitHub token is not configured." }),
    };
  }

  const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
  const owner = "Zhaal";
  const repo = "un-loup-garou-a-eu";
  const path = "scores-loup-garou.json";

  try {
    const {
      data: { updated },
    } = await octokit.createOrUpdateTextFile({
      owner,
      repo,
      path,
      content: event.body,
      message: `Mise à jour des scores ${new Date().toISOString()}`,
    });

    if (updated) {
      console.log(`Fichier ${path} mis à jour avec succès.`);
    } else {
      console.log(`Fichier ${path} créé avec succès.`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, updated }),
    };
  } catch (err) {
    console.error("Erreur lors de la mise à jour du fichier sur GitHub:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Erreur interne du serveur.",
        details: err.message,
      }),
    };
  }
};