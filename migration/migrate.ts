import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const URI = `https://us1.prisma.sh/gatsby/api-gatsby-org/dev`;

  const contributorsResult = await fetch(URI, {
    headers: {
      Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2NjE1OTg2OTAsIm5iZiI6MTY2MTUxMjI5MH0.xQPvhCVAvi-WJulm-fiz_8um2WwQGZP1czpqrQeFM5k`,
      'Content-Type': 'application/json',
    },
    method: `POST`,
    body: JSON.stringify({
      query: `
        { contributors {
          id
          email
          githubUsername
          shopifyCustomerID
          updatedAt
          createdAt
        } }
      `,
    }),
  });

  const contributors: any = await contributorsResult.json();

  contributors.data.contributors.forEach(async (cont: any) => {
    // USE PRISMA 2 CLIENT to insert
    console.log('inserting: ', cont.id);
    const { id, ...restOfContributor } = cont;
    try {
      await prisma.contributor.upsert({
        data: restOfContributor,
      });
    } catch (e) {
      console.error('Error: ', e);
    }

    console.log('successfully inserted contributor: ', cont.id);
  });
}

main().catch((e) => console.error(e));
