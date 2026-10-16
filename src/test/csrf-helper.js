import assert from 'node:assert/strict';

export async function getCsrfSession(app, email) {
  const jwt = app.jwt.sign(
    { sub: email },
    { expiresIn: '8h' }
  );

  const response = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: {
      cookie: `mailpilot_session=${jwt}`
    }
  });

  assert.equal(response.statusCode, 200);

  const csrfToken = response.json().csrfToken;
  assert.ok(csrfToken, 'CSRF token must be returned');

  const setCookies = response.headers['set-cookie'];
  const cookies = [
    `mailpilot_session=${jwt}`,
    ...[setCookies].flat().filter(Boolean)
      .map(c => c.split(';')[0])
  ];

  return {
    headers: {
      cookie: cookies.join('; '),
      'csrf-token': csrfToken
    }
  };
}
