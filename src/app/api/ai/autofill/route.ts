import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

// POST - AI auto-fill form fields
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(Role.CHURCH_CLERK);
    const body = await request.json();
    const { type, partialData } = body;

    if (!type || !['person', 'baptism'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "person" or "baptism"' },
        { status: 400 }
      );
    }

    if (!partialData || typeof partialData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'partialData is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'person') {
      systemPrompt = `You are a church records assistant for a Seventh-day Adventist Church baptism certificate platform. Given partial data about a person, predict and fill in missing fields. Return ONLY valid JSON with predicted fields. Each field should include a "confidence" score from 0.0 to 1.0. Only predict fields that are not already provided in the input data.`;

      const knownFields: string[] = Object.keys(partialData).filter(
        (k) => partialData[k] !== null && partialData[k] !== undefined && partialData[k] !== ''
      );

      userPrompt = `Given this partial person data: ${JSON.stringify(partialData)}, predict the following missing fields if possible:
- gender (Male or Female)
- dateOfBirth (approximate year as string like "1990")
- city (likely city based on context)
- country (likely country)
- address (general area if deducible)

Already known fields (DO NOT include these): ${knownFields.join(', ') || 'none'}

Return a JSON object with only the predicted fields. Each predicted field should be an object with "value" and "confidence" keys. Example format:
{
  "gender": { "value": "Male", "confidence": 0.8 },
  "city": { "value": "London", "confidence": 0.6 }
}

Return ONLY the JSON, no explanation or markdown.`;
    } else {
      systemPrompt = `You are a church records assistant for a Seventh-day Adventist Church baptism certificate platform. Given partial baptism record data, predict and fill in missing fields. Return ONLY valid JSON with predicted fields. Each field should include a "confidence" score from 0.0 to 1.0.`;

      const knownFields: string[] = Object.keys(partialData).filter(
        (k) => partialData[k] !== null && partialData[k] !== undefined && partialData[k] !== ''
      );

      userPrompt = `Given this partial baptism record data: ${JSON.stringify(partialData)}, predict the following missing fields if possible:
- pastorTitle (Elder, Pastor, Reverend, etc.)
- baptismLocation (church name or location)
- witnessName (likely witness based on church context)

Already known fields (DO NOT include these): ${knownFields.join(', ') || 'none'}

Return a JSON object with only the predicted fields. Each predicted field should be an object with "value" and "confidence" keys. Example format:
{
  "pastorTitle": { "value": "Pastor", "confidence": 0.7 }
}

Return ONLY the JSON, no explanation or markdown.`;
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const messageContent = completion.choices[0]?.message?.content;
    if (!messageContent) {
      return NextResponse.json({
        success: true,
        data: {},
        message: 'No suggestions generated',
      });
    }

    // Parse the AI response - try to extract JSON
    let predictions: Record<string, { value: string; confidence: number }> = {};
    try {
      // Try direct parse first
      predictions = JSON.parse(messageContent);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          predictions = JSON.parse(jsonMatch[1].trim());
        } catch {
          // Last resort: try finding JSON-like object in the text
          const objectMatch = messageContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              predictions = JSON.parse(objectMatch[0]);
            } catch {
              predictions = {};
            }
          }
        }
      }
    }

    // Normalize predictions to have value and confidence
    const normalizedPredictions: Record<string, { value: string; confidence: number }> = {};
    for (const [key, val] of Object.entries(predictions)) {
      if (typeof val === 'object' && val !== null && 'value' in val) {
        normalizedPredictions[key] = {
          value: String(val.value),
          confidence: typeof val.confidence === 'number' ? val.confidence : 0.5,
        };
      } else {
        normalizedPredictions[key] = {
          value: String(val),
          confidence: 0.5,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: normalizedPredictions,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('AI autofill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI suggestions' },
      { status: 500 }
    );
  }
}
