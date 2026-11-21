import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatoria. Este API solo persiste en PostgreSQL con Prisma.');
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
