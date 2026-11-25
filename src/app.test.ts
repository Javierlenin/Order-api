import request from 'supertest';
import app from './app';

describe('GET /health', () => {
  it('responds with 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('responds with 404 in JSON', async () => {
    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Ruta no encontrada');
  });
});

describe('authentication', () => {
  it('rejects a protected route when the request has no token', async () => {
    const response = await request(app).get('/users');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autorizado');
  });

  it('rejects the stock report when the request has no token', async () => {
    const response = await request(app).get('/reports/stock/1');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autorizado');
  });

  it('rejects an inventory adjustment when the request has no token', async () => {
    const response = await request(app).post('/inventory-adjustments').send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autorizado');
  });
});

describe('CORS', () => {
  const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  it('allows the frontend origin to read the responses', async () => {
    const response = await request(app).get('/health').set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('does not authorize any other origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://otro-sitio.com');

    expect(response.headers['access-control-allow-origin']).not.toBe('http://otro-sitio.com');
  });

  it('answers the preflight request (OPTIONS) before a POST', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });
});
