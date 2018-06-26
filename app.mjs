import express from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import store from './routes/store.mjs';

dotenv.config();

const app = express();

const requireValidJWT = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

app.use(cors());
app.use(requireValidJWT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/store', store);

export default app;
