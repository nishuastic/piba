import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { supabase } from './supabase';
import { VENUES, PAYMENT_METHODS } from './constants';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MODELS = [
  'openai/gpt-oss-120b:free',
  'z-ai/glm-4.5-air:free',
  'minimax/minimax-m2.5:free',
];

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY || 'missing-key',
  appName: 'PIBA',
  appUrl: typeof window !== 'undefined' ? window.location.origin : '',
});

const SYSTEM_PROMPT = `You are the PIBA Assistant, a helpful assistant for PIBA (Paris International Badminton Association) club manager app.
You can help users manage events and members by calling the tools provided.

IMPORTANT RULES:
- All currency is in Euros (€).
- Available venues: ${VENUES.join(', ')}.
- Available payment methods (who received the money): ${PAYMENT_METHODS.join(', ')}.
- When adding attendees, ask if they are a member or non-member if unclear.
- When creating events, always confirm the date, venue, and costs.
- Be concise and friendly.
- If the user asks something unrelated to club management, politely redirect.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- AFTER calling a tool, you MUST summarize the result in natural language. Never leave the response empty.
- Always respond in English.

FILE PARSING:
- When the user uploads a file or image, the text content will be provided between [File: ...] markers or passed as an image to the model.
- Parse carefully: lines like "Krishna Sarath - 40 Euros" means name="Krishna Sarath", membership_fee_paid=40.
- Lines like "Julien - 80 Euros" means name="Julien", membership_fee_paid=80.
- Ignore checkbox symbols, bullet points, or UI artifacts.
- Use bulk_add_members to add all parsed members at once.

EXPENSES:
- One-off costs (e.g. shuttlecocks, equipment) can be tracked as expenses and split among members.
- Use create_expense to add a new expense. You can split it among all members or specific ones.
- Use list_expenses to see existing expenses and their per-member splits.
- Each member's share shows as unsettled until marked as settled.`;

// Side-channel to capture tool results directly from execute()
let _capturedResults = [];

function capture(toolName, result) {
  _capturedResults.push({ toolName, result });
  return result;
}

const agentTools = {
  create_event: tool({
    description: 'Create a new badminton session/event',
    parameters: z.object({
      date: z.string().describe('Event date in YYYY-MM-DD format'),
      time: z.string().optional().describe('Event time in HH:MM format (24h)'),
      venue: z.enum(VENUES).describe('Venue name'),
      court_cost: z.number().optional().describe('Total court cost in euros'),
      shuttle_cost: z.number().optional().describe('Total shuttle cost in euros'),
      member_price: z.number().optional().describe('Price per member in euros'),
      non_member_price: z.number().optional().describe('Price per non-member in euros'),
      notes: z.string().optional().describe('Optional notes about the event'),
    }),
    execute: async (args) => {
      const { error } = await supabase.from('events').insert([{
        date: args.date, time: args.time || null, venue: args.venue,
        court_cost: args.court_cost || 0, shuttle_cost: args.shuttle_cost || 0,
        member_price: args.member_price || 0, non_member_price: args.non_member_price || 0,
        notes: args.notes || '',
      }]).select().single();
      if (error) return capture('create_event', { error: error.message });
      return capture('create_event', { success: true, message: `Event created for ${args.date} at ${args.venue}` });
    },
  }),

  duplicate_previous_event: tool({
    description: 'Create a new event by copying the venue, time, and pricing details of the most recent event. Use this when the user says "replicate the last event for tomorrow".',
    parameters: z.object({
      new_date: z.string().describe('The date for the new event in YYYY-MM-DD format'),
      new_time: z.string().optional().describe('Optional new time in HH:MM format. If omitted, copies the time from the previous event.'),
    }),
    execute: async (args) => {
      // 1. Fetch the most recent event
      const { data: previousEvents, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
        .limit(1);

      if (fetchError) return capture('duplicate_previous_event', { error: fetchError.message });
      if (!previousEvents || previousEvents.length === 0) {
        return capture('duplicate_previous_event', { error: 'No previous events found to duplicate.' });
      }

      const prev = previousEvents[0];

      // 2. Insert the new event using previous details
      const { data: newEvent, error: insertError } = await supabase.from('events').insert([{
        date: args.new_date,
        time: args.new_time || prev.time || null,
        venue: prev.venue,
        court_cost: prev.court_cost,
        shuttle_cost: prev.shuttle_cost,
        member_price: prev.member_price,
        non_member_price: prev.non_member_price,
        notes: prev.notes || '',
      }]).select().single();

      if (insertError) return capture('duplicate_previous_event', { error: insertError.message });
      return capture('duplicate_previous_event', {
        success: true,
        message: `Event duplicated for ${args.new_date} at ${prev.venue} (Member: ${prev.member_price}€, Non-Member: ${prev.non_member_price}€)`
      });
    },
  }),

  add_member: tool({
    description: 'Add a new member to the club member list',
    parameters: z.object({
      name: z.string().describe('Full name of the member'),
      membership_fee_paid: z.number().optional().describe('Membership fee paid in euros'),
    }),
    execute: async (args) => {
      const { error } = await supabase.from('members')
        .upsert([{ name: args.name, membership_fee_paid: args.membership_fee_paid || 0 }], { onConflict: 'name' })
        .select().single();
      if (error) return capture('add_member', { error: error.message });
      return capture('add_member', { success: true, message: `${args.name} added/updated as a member` });
    },
  }),

  bulk_add_members: tool({
    description: 'Add multiple members at once (e.g. from a CSV file, an image, or a list) or update their fee. Parse each line to extract the name and the amount paid. Use this when the user provides several names.',
    parameters: z.object({
      members: z.array(z.object({
        name: z.string().describe('Full name of the member'),
        membership_fee_paid: z.number().optional().describe('Fee paid in euros (parse from text like "40 Euros" → 40)'),
      })).describe('Array of members to add/update'),
    }),
    execute: async (args) => {
      // Filter out invalid entries
      const valid = args.members.filter((m) => m.name && m.name.trim().length > 0);
      if (valid.length === 0) {
        return capture('bulk_add_members', { error: 'No valid member names found. Check the data and try again.' });
      }

      const rows = valid.map((m) => ({
        name: m.name.trim(),
        membership_fee_paid: m.membership_fee_paid || 0,
      }));
      // Using UPSERT on (name) because we added a unique constraint to members.name
      const { data, error } = await supabase.from('members').upsert(rows, { onConflict: 'name' }).select();
      if (error) return capture('bulk_add_members', { error: error.message });

      const skipped = args.members.length - valid.length;
      return capture('bulk_add_members', {
        success: true,
        message: `${data.length} member(s) added/updated: ${data.map((m) => `${m.name} (${m.membership_fee_paid}€)`).join(', ')}${skipped > 0 ? ` (${skipped} invalid entries skipped)` : ''}`,
        added: data.length,
        skipped,
      });
    },
  }),

  add_attendee_to_event: tool({
    description: 'Add an attendee/player to an existing event',
    parameters: z.object({
      event_date: z.string().describe('Date of the event YYYY-MM-DD'),
      name: z.string().describe('Name of the player'),
      is_member: z.boolean().optional().describe('Is the player a club member'),
      payment_method: z.enum(PAYMENT_METHODS).optional().describe('Who received payment'),
      amount_paid: z.number().optional().describe('Amount paid in euros'),
    }),
    execute: async (args) => {
      const { data: events, error: evError } = await supabase
        .from('events').select('*').eq('date', args.event_date);
      if (evError) return capture('add_attendee', { error: evError.message });
      if (!events?.length) return capture('add_attendee', { error: `No event found on ${args.event_date}` });
      const event = events[0];
      const price = args.amount_paid ?? (args.is_member ? event.member_price : event.non_member_price) ?? 0;
      const { error } = await supabase.from('attendees').insert([{
        event_id: event.id, name: args.name, is_member: args.is_member ?? false,
        payment_method: args.payment_method || 'Jon', amount_paid: price,
      }]).select().single();
      if (error) return capture('add_attendee', { error: error.message });
      return capture('add_attendee', { success: true, message: `${args.name} added to ${args.event_date} event` });
    },
  }),

  list_events: tool({
    description: 'List upcoming or recent events',
    parameters: z.object({
      limit: z.number().optional().describe('Max events to return (default 5)'),
    }),
    execute: async (args) => {
      const { data, error } = await supabase.from('events')
        .select('*, attendees(count)').order('date', { ascending: false }).limit(args.limit || 5);
      if (error) return capture('list_events', { error: error.message });
      return capture('list_events', {
        events: data.map((e) => ({
          date: e.date, time: e.time, venue: e.venue,
          players: e.attendees?.[0]?.count ?? 0,
          court_cost: e.court_cost, shuttle_cost: e.shuttle_cost,
        })),
      });
    },
  }),

  list_members: tool({
    description: 'List all club members',
    parameters: z.object({}),
    execute: async () => {
      const { data, error } = await supabase.from('members')
        .select('name, membership_fee_paid').order('name');
      if (error) return capture('list_members', { error: error.message });
      return capture('list_members', { members: data, total: data.length });
    },
  }),

  query_table: tool({
    description: 'Query any table (members, events, attendees) with filters for flexible lookups',
    parameters: z.object({
      table: z.enum(['members', 'events', 'attendees', 'expenses', 'expense_splits']).describe('Table to query'),
      select: z.string().optional().describe('Columns to select. Default "*"'),
      filters: z.array(z.object({
        column: z.string(),
        operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike']),
        value: z.string(),
      })).optional(),
      order_by: z.string().optional(),
      ascending: z.boolean().optional(),
      limit: z.number().optional(),
    }),
    execute: async (args) => {
      let query = supabase.from(args.table).select(args.select || '*');
      if (args.filters) for (const f of args.filters) query = query[f.operator](f.column, f.value);
      if (args.order_by) query = query.order(args.order_by, { ascending: args.ascending ?? true });
      if (args.limit) query = query.limit(args.limit);
      const { data, error } = await query;
      if (error) return capture('query_table', { error: error.message });
      return capture('query_table', { data, row_count: data.length });
    },
  }),

  get_event_summary: tool({
    description: 'Get full financial summary for a specific event: attendees, costs, income, balance',
    parameters: z.object({
      event_date: z.string().describe('Date YYYY-MM-DD'),
    }),
    execute: async (args) => {
      const { data: events, error: evErr } = await supabase
        .from('events').select('*').eq('date', args.event_date);
      if (evErr) return capture('get_event_summary', { error: evErr.message });
      if (!events?.length) return capture('get_event_summary', { error: `No event on ${args.event_date}` });
      const event = events[0];
      const { data: attendees, error: attErr } = await supabase
        .from('attendees').select('*').eq('event_id', event.id);
      if (attErr) return capture('get_event_summary', { error: attErr.message });
      const totalCost = (event.court_cost || 0) + (event.shuttle_cost || 0);
      const totalIncome = attendees.reduce((s, a) => s + (a.amount_paid || 0), 0);
      const byMethod = {};
      for (const a of attendees) byMethod[a.payment_method] = (byMethod[a.payment_method] || 0) + (a.amount_paid || 0);
      return capture('get_event_summary', {
        event: { date: event.date, venue: event.venue, time: event.time },
        costs: { courts: event.court_cost, shuttles: event.shuttle_cost, total: totalCost },
        attendees: attendees.map((a) => ({ name: a.name, is_member: a.is_member, paid: a.amount_paid, method: a.payment_method })),
        income: { total: totalIncome, by_method: byMethod },
        balance: totalIncome - totalCost, player_count: attendees.length,
      });
    },
  }),

  create_expense: tool({
    description: 'Create a one-off expense (e.g. buying shuttlecocks) to be split among club members',
    parameters: z.object({
      description: z.string().describe('What was purchased'),
      total_amount: z.number().describe('Total cost in euros'),
      date: z.string().optional().describe('Date YYYY-MM-DD, defaults to today'),
      paid_by: z.string().optional().describe('Who paid for it'),
      notes: z.string().optional(),
      split_among_all: z.boolean().optional().describe('If true, split among ALL members'),
      member_names: z.array(z.string()).optional().describe('Specific member names to split among'),
    }),
    execute: async (args) => {
      // Insert expense
      const { data: expense, error: expErr } = await supabase.from('expenses').insert([{
        description: args.description,
        total_amount: args.total_amount,
        date: args.date || new Date().toISOString().split('T')[0],
        paid_by: args.paid_by || '',
        notes: args.notes || '',
      }]).select().single();
      if (expErr) return capture('create_expense', { error: expErr.message });

      // Resolve members to split among
      let memberIds = [];
      if (args.split_among_all) {
        const { data: allMembers } = await supabase.from('members').select('id');
        memberIds = (allMembers || []).map((m) => m.id);
      } else if (args.member_names?.length) {
        for (const name of args.member_names) {
          const { data: found } = await supabase.from('members').select('id').ilike('name', name);
          if (found?.length) memberIds.push(found[0].id);
        }
      }

      if (memberIds.length > 0) {
        const share = Math.round((args.total_amount / memberIds.length) * 100) / 100;
        const splits = memberIds.map((mid) => ({ expense_id: expense.id, member_id: mid, share_amount: share, settled: false }));
        await supabase.from('expense_splits').insert(splits);
      }

      const share = memberIds.length > 0 ? (args.total_amount / memberIds.length).toFixed(2) : 'N/A';
      return capture('create_expense', {
        success: true,
        message: `Expense "${args.description}" (${args.total_amount}€) created, split among ${memberIds.length} member(s) at ${share}€ each`,
      });
    },
  }),

  list_expenses: tool({
    description: 'List all one-off expenses with their splits',
    parameters: z.object({
      limit: z.number().optional().describe('Max expenses to return (default 10)'),
    }),
    execute: async (args) => {
      const { data, error } = await supabase.from('expenses')
        .select('*, expense_splits(share_amount, settled, members:member_id(name))')
        .order('date', { ascending: false })
        .limit(args.limit || 10);
      if (error) return capture('list_expenses', { error: error.message });
      return capture('list_expenses', {
        expenses: data.map((e) => ({
          description: e.description, total: e.total_amount, date: e.date, paid_by: e.paid_by,
          splits: (e.expense_splits || []).map((s) => ({ member: s.members?.name, share: s.share_amount, settled: s.settled })),
        })),
        count: data.length,
      });
    },
  }),
};

// ===== FORMAT TOOL RESULT =====
function formatToolResult(data) {
  if (!data) return '';
  if (data.error) return `⚠️ Error: ${data.error}`;
  if (data.members) {
    if (data.total === 0) return 'No members registered yet.';
    const list = data.members.map((m) => `• **${m.name}** — ${m.membership_fee_paid}€`).join('\n');
    return `**${data.total} member(s) registered:**\n${list}`;
  }
  if (data.events) {
    if (data.events.length === 0) return 'No events found.';
    const list = data.events.map((e) => `• **${e.date}** at ${e.venue} — ${e.players} players`).join('\n');
    return `**${data.events.length} event(s):**\n${list}`;
  }
  if (data.player_count !== undefined && data.income) {
    const e = data.event;
    return `📊 **${e.venue}** — ${e.date}\nPlayers: ${data.player_count}\nCosts: ${data.costs.total}€ | Income: ${data.income.total}€ | Balance: ${data.balance}€`;
  }
  if (data.data !== undefined && data.row_count !== undefined) {
    if (data.row_count === 0) return 'No results found.';
    return `**${data.row_count} result(s):**\n\`\`\`\n${JSON.stringify(data.data, null, 2)}\n\`\`\``;
  }
  if (data.expenses && data.count !== undefined) {
    if (data.count === 0) return 'No expenses found.';
    const list = data.expenses.map((e) => {
      const splits = e.splits.map((s) => `${s.member}: ${s.share}€ (${s.settled ? '✅' : '⏳'})`).join(', ');
      return `• **${e.description}** — ${e.total}€ (${e.date})${e.paid_by ? ` paid by ${e.paid_by}` : ''}${splits ? `\n  Splits: ${splits}` : ''}`;
    }).join('\n');
    return `**${data.count} expense(s):**\n${list}`;
  }
  if (data.message) return `✅ ${data.message}`;
  if (data.success) return '✅ Done!';
  return `\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

// ===== MAIN CHAT =====
export async function chatWithAgent(conversationHistory) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  // Reset captured results for this call
  _capturedResults = [];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  let lastError = null;

  for (const modelId of MODELS) {
    try {
      const result = await generateText({
        model: openrouter(modelId),
        messages,
        tools: agentTools,
        maxSteps: 5,
      });

      const actionsPerformed = _capturedResults.map((r) => r.toolName);

      // Prefer model text if it actually said something useful
      let content = result.text?.trim() || '';

      // If model text is empty, build response from captured tool results
      if (!content && _capturedResults.length > 0) {
        content = _capturedResults
          .map((r) => formatToolResult(r.result))
          .filter(Boolean)
          .join('\n\n');
      }

      if (!content) {
        content = actionsPerformed.length > 0
          ? '✅ Done!'
          : "I'm not sure how to help with that. Try asking about events or members!";
      }

      return { content, actionsPerformed, model: modelId };

    } catch (err) {
      lastError = err;
      console.warn(`[Agent] ${modelId} failed:`, err.message);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
