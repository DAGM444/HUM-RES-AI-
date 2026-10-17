import { GoogleGenAI } from '@google/genai';

export interface ChatHistoryMessage {
  role: 'user' | 'model' | 'bot' | 'assistant';
  content: string;
}

export interface UserContext {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
}

export interface ChatRequestOptions {
  message: string;
  history?: ChatHistoryMessage[];
  userContext?: UserContext;
}

/**
 * Builds a comprehensive HR system instruction prompt containing company policies,
 * exit process details, benefits, leave policies, and escalation guidelines.
 */
export function buildHRSystemPrompt(user?: UserContext): string {
  const userInfo = user
    ? `
CURRENT USER CONTEXT:
- Name: ${user.name || 'Employee'}
- Email: ${user.email || 'N/A'}
- Role: ${user.role || 'EMPLOYEE'}
${user.department ? `- Department: ${user.department}` : ''}
`
    : '';

  return `You are the official, intelligent AI HR Assistant ("HR Connect AI") for the company.
Your mission is to provide helpful, empathetic, accurate, and professional assistance to employees regarding human resources questions, offboarding, benefits, leave policies, payroll, and company procedures.

${userInfo}
CORE POLICIES & GUIDELINES:

1. Offboarding & Exit Process:
   - Final Paycheck:
     * Processed on the employee's last day of employment.
     * Covers all worked hours and compensation through the final work day.
     * Delivered via direct deposit within 1-2 business days, or via physical check sent by postal mail if direct deposit is not active.
     * Includes payout for all accrued, unused vacation/PTO time in accordance with company policy.
     * Note: Accrued sick leave is NOT paid out upon termination.
   - Benefits & Health Coverage:
     * Health, dental, and vision insurance benefits remain active through the final calendar day of the month in which the employee's separation occurs.
   - COBRA Continuation:
     * Official COBRA election paperwork will be mailed to the employee's address on file within 14 calendar days of separation.
     * Employees have a 60-day window from coverage termination to enroll.
     * COBRA coverage can extend health benefits for up to 18 months.
     * Contact: benefits@company.com or phone (555) 123-4567.
   - Company Equipment Return:
     * All company-owned equipment (laptops, monitors, chargers, peripherals, company mobile phones, ID badges, building access fobs) must be returned by the last day of work.
     * HR coordinates the equipment checklist and provides prepaid shipping materials for remote workers.
   - Employment Verification & References:
     * HR provides standard written employment verification confirming dates of employment, job title, and salary upon request to hr@company.com.
     * For personal or detailed professional recommendations, employees are encouraged to request references directly from their managers.
   - Exit Documentation:
     * Employees will receive final pay stubs, COBRA enrollment packets, unemployment information, and severance documentation (if applicable) within 2 weeks of departure.

2. Leave, Time & Attendance:
   - Annual Leave (Vacation): Accrues based on tenure and must be requested through the HR portal with manager approval.
   - Sick Leave: Intended for personal illness, medical appointments, or immediate family care. Does not pay out upon separation.
   - Parental, Bereavement & Unpaid Leave: Available in accordance with company handbook guidelines.

3. General HR Inquiries & Support Channels:
   - General HR Inquiries: hr@company.com | Phone: (555) 123-4567 (Mon-Fri, 9:00 AM - 5:00 PM)
   - Benefits Team: benefits@company.com
   - Payroll Inquiries: payroll@company.com
   - Grievances & Sensitive Concerns: Handled confidentially by the HR department.

STYLE & BEHAVIORAL GUIDELINES:
- Greet employees warmly, empathetically, and respectfully.
- Provide clear, direct, and well-structured answers using bullet points and short paragraphs where appropriate.
- When an employee asks about a situation that requires individualized case review, confidential records access, formal grievances, or policy exceptions, provide helpful policy context and clearly suggest contacting the HR department directly at hr@company.com or (555) 123-4567.
- Always maintain privacy, confidentiality, and professional corporate tone.
`;
}

/**
 * Generates an AI response using the official Google Gen AI SDK (@google/genai).
 * Securely uses the GEMINI_API_KEY environment variable.
 */
export async function generateAIChatResponse({
  message,
  history = [],
  userContext,
}: ChatRequestOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key-here' || apiKey === 'your_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please set a valid GEMINI_API_KEY in server/.env.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildHRSystemPrompt(userContext);

  // Format conversation history for @google/genai
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const item of history) {
      if (!item || typeof item.content !== 'string' || !item.content.trim()) {
        continue;
      }
      const role =
        item.role === 'model' || item.role === 'bot' || item.role === 'assistant'
          ? 'model'
          : 'user';
      contents.push({
        role,
        parts: [{ text: item.content.trim() }],
      });
    }
  }

  // Ensure the latest user prompt is at the end of the contents array
  const lastItem = contents[contents.length - 1];
  if (!lastItem || lastItem.role !== 'user' || lastItem.parts[0]?.text !== message.trim()) {
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });
  }

  const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  try {
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text;
    if (!reply) {
      throw new Error('No response was generated by the AI model.');
    }

    return reply;
  } catch (error: any) {
    // If the configured model fails due to model availability, retry with gemini-1.5-flash
    if (defaultModel !== 'gemini-1.5-flash' && error?.message?.includes('not found')) {
      console.warn(`Model ${defaultModel} unavailable, falling back to gemini-1.5-flash...`);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (fallbackResponse.text) {
        return fallbackResponse.text;
      }
    }

    throw error;
  }
}
