import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const runtime = 'nodejs';
export const maxDuration = 30;

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

interface ImageInput {
  data: string;
  mimeType: string;
}

interface RequestBody {
  images: ImageInput[];
  currency?: string;
}

async function verifyIdToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }
  if (!PROJECT_ID) {
    return NextResponse.json({ error: 'Project ID not configured' }, { status: 500 });
  }

  const uid = await verifyIdToken(req.headers.get('authorization'));
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const images = body.images || [];
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: 'Max 10 images per request' }, { status: 400 });
  }

  const currency = body.currency || 'INR';
  const today = new Date().toISOString().slice(0, 10);

  const promptText = `You are a receipt and transaction screenshot analyzer. Extract every distinct transaction visible across the provided images.

For each transaction:
- description: short, human-friendly (e.g., "Zomato dinner", "Uber to airport", "Hotel Taj")
- amount: total cost as a number (no currency symbol, no commas)
- date: YYYY-MM-DD if visible on the receipt/transaction, otherwise omit
- category: one of food, transport, accommodation, activities, shopping, other (best guess)
- merchant: store/vendor/payee name if clearly visible
- sourceImageIndex: 0-based index of which uploaded image (in order) this transaction is from

If a single image contains multiple transactions (e.g., a bank statement screenshot listing several charges), output one entry per transaction. If an image contains no clear transaction, skip it. Do not invent transactions.

The trip's primary currency is ${currency}. Assume amounts are in this currency unless a different currency is clearly shown.
Today's date is ${today}.`;

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: promptText },
  ];
  for (const img of images) {
    if (!img?.data || !img?.mimeType) {
      return NextResponse.json({ error: 'Each image needs data + mimeType' }, { status: 400 });
    }
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['food', 'transport', 'accommodation', 'activities', 'shopping', 'other'],
                  },
                  merchant: { type: Type.STRING },
                  sourceImageIndex: { type: Type.INTEGER },
                },
                required: ['description', 'amount', 'category', 'sourceImageIndex'],
              },
            },
          },
          required: ['expenses'],
        },
      },
    });

    const text = response.text || '';
    if (!text) {
      return NextResponse.json({ expenses: [] });
    }
    const parsed = JSON.parse(text) as { expenses: unknown[] };
    return NextResponse.json({ expenses: parsed.expenses || [] });
  } catch (e) {
    console.error('Gemini error', e);
    const message = e instanceof Error ? e.message : 'Failed to analyze images';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
