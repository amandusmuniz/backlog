export default async function handler(req, res) {
  // Permite apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'amandusmuniz';
  const REPO_NAME = 'backlog';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Token do GitHub não configurado no servidor.' });
  }

  try {
    const { fileName, fileBase64, customPath } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'Nome do arquivo e conteúdo base64 são obrigatórios.' });
    }

    // Define o caminho no repositório
    let targetPath = fileName;
    if (customPath) {
      const cleanPath = customPath.endsWith('/') ? customPath : `${customPath}/`;
      targetPath = `${cleanPath}${fileName}`;
    }

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${targetPath}`;

    // 1. Verifica se o arquivo já existe no GitHub para capturar o SHA (caso de atualização)
    let currentSha = null;
    const checkResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless-App'
      }
    });

    if (checkResponse.ok) {
      const fileData = await checkResponse.json();
      currentSha = fileData.sha;
    }

    // 2. Prepara o payload para criar ou atualizar
    const payload = {
      message: `upload: ${fileName} via Vercel Function`,
      content: fileBase64,
      ...(currentSha && { sha: currentSha })
    };

    // 3. Envia o arquivo para o GitHub
    const uploadResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Serverless-App'
      },
      body: JSON.stringify(payload)
    });

    const result = await uploadResponse.json();

    if (uploadResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'Arquivo enviado com sucesso para o GitHub!',
        githubUrl: result.content.html_url
      });
    } else {
      return res.status(uploadResponse.status).json({
        error: result.message || 'Erro ao enviar para o GitHub.'
      });
    }

  } catch (error) {
    return res.status(500).json({ error: `Erro interno: ${error.message}` });
  }
}