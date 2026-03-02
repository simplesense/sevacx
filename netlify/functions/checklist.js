// Netlify serverless function — checklist cross-device sync
// Reads/writes checklist state to a private GitHub Gist.
// Token lives in Netlify env var GITHUB_TOKEN — never exposed in HTML.

const GIST_ID = '3838c3f7dd837d9bac773c2b7ed5b60c';
const GIST_FILE = 'checklist.json';
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function (event) {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GITHUB_TOKEN not set' }) };
  }

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // GET — return current checklist state
  if (event.httpMethod === 'GET') {
    const res = await fetch(GIST_API, { headers: ghHeaders });
    if (!res.ok) return { statusCode: 502, headers: CORS, body: '{}' };
    const data = await res.json();
    const content = data?.files?.[GIST_FILE]?.content ?? '{}';
    return { statusCode: 200, headers: CORS, body: content };
  }

  // PUT — save new checklist state
  if (event.httpMethod === 'PUT') {
    let body = event.body || '{}';
    // Validate it's parseable JSON before saving
    try { JSON.parse(body); } catch { body = '{}'; }

    const res = await fetch(GIST_API, {
      method: 'PATCH',
      headers: ghHeaders,
      body: JSON.stringify({ files: { [GIST_FILE]: { content: body } } }),
    });
    return {
      statusCode: res.ok ? 200 : 502,
      headers: CORS,
      body: res.ok ? body : '{}',
    };
  }

  return { statusCode: 405, headers: CORS, body: '{}' };
};
